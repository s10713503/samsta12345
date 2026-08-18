// Client-side media preparation.
// Large images are prepared in a Web Worker so the UI never blocks. Images
// that are already upload-friendly take a zero-processing fast path.

import { enhanceBitmap, type PipelineOpts } from "./image-pipeline";

export type CompressTier = "free" | "premium" | "ultra";

// Keep full source detail: up to 8K long edge and generous size budgets.
const TIER_LIMITS = {
  free: { targetBytes: 12 * 1024 * 1024, maxDim: 7680 },
  premium: { targetBytes: 20 * 1024 * 1024, maxDim: 7680 },
  ultra: { targetBytes: 32 * 1024 * 1024, maxDim: 7680 },
};

// Never upscale uploads: it adds bytes and CPU without adding source detail.
const MIN_SHORT_EDGE = 0;
// Anything under this is already fine — upload the untouched original.
const FAST_PATH_BYTES = 12 * 1024 * 1024;

export const VIDEO_LIMITS = {
  free: 2 * 1024 * 1024 * 1024,
  premium: 2 * 1024 * 1024 * 1024,
  ultra: 2 * 1024 * 1024 * 1024,
};

export const FILE_LIMITS = {
  free: 10 * 1024 * 1024,
  premium: 100 * 1024 * 1024,
  ultra: 1024 * 1024 * 1024,
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: { blob?: Blob; error?: string }) => void>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (typeof OffscreenCanvas === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./image-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; blob?: Blob; error?: string }>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data);
      }
    };
    worker.onerror = () => {
      for (const [, cb] of pending) cb({ error: "worker" });
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function runInWorker(file: File, opts: PipelineOpts): Promise<Blob | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve(null);
    }, 20000);
    pending.set(id, (r) => {
      clearTimeout(timer);
      resolve(r.blob ?? null);
    });
    w.postMessage({ id, file, opts });
  });
}

export async function compressImage(file: File, tier: CompressTier): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= FAST_PATH_BYTES) return file;

  const { targetBytes, maxDim } = TIER_LIMITS[tier];
  const opts: PipelineOpts = { maxDim, minShortEdge: MIN_SHORT_EDGE, targetBytes };
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";

  try {
    // Fast path: off the main thread, so scrolling/animation stay smooth.
    const wblob = await runInWorker(file, opts);
    if (wblob) return new File([wblob], name, { type: "image/jpeg", lastModified: Date.now() });

    // Fallback: same pipeline on the main thread.
    const bmp = await createImageBitmap(file);
    const blob = await enhanceBitmap(bmp, opts);
    bmp.close?.();
    if (!blob) return file;
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
