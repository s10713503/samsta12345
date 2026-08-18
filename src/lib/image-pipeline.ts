// Shared image enhancement pipeline. Runs on either a DOM canvas (main thread)
// or an OffscreenCanvas (inside the worker) — no DOM APIs are referenced here.

export type PipelineOpts = {
  maxDim: number;
  minShortEdge: number;
  targetBytes: number;
};

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: AnyCanvas, readFreq = false): CanvasRenderingContext2D {
  const cx = (c as any).getContext("2d", readFreq ? { willReadFrequently: true } : undefined);
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  return cx as CanvasRenderingContext2D;
}

export async function toBlob(c: AnyCanvas, type: string, quality: number): Promise<Blob | null> {
  if ("convertToBlob" in c) return (c as OffscreenCanvas).convertToBlob({ type, quality });
  return new Promise((r) => (c as HTMLCanvasElement).toBlob(r, type, quality));
}

/** Detect blackish letterbox / pillarbox bars from a tiny sample. */
function detectContentBox(bmp: ImageBitmap) {
  try {
    const SAMPLE = 160;
    const scale = Math.min(1, SAMPLE / Math.max(bmp.width, bmp.height));
    const sw = Math.max(1, Math.round(bmp.width * scale));
    const sh = Math.max(1, Math.round(bmp.height * scale));
    const c = makeCanvas(sw, sh);
    const cx = ctx2d(c, true);
    cx.drawImage(bmp as any, 0, 0, sw, sh);
    const { data } = cx.getImageData(0, 0, sw, sh);
    const DARK = 22;
    const darkRow = (y: number) => {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] > DARK) return false;
      }
      return true;
    };
    const darkCol = (x: number) => {
      for (let y = 0; y < sh; y++) {
        const i = (y * sw + x) * 4;
        if (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] > DARK) return false;
      }
      return true;
    };
    let top = 0, bottom = sh - 1, left = 0, right = sw - 1;
    while (top < bottom && darkRow(top)) top++;
    while (bottom > top && darkRow(bottom)) bottom--;
    while (left < right && darkCol(left)) left++;
    while (right > left && darkCol(right)) right--;
    const w = right - left + 1;
    const h = bottom - top + 1;
    if (w < sw * 0.25 || h < sh * 0.25) return null;
    if (w >= sw - 1 && h >= sh - 1) return null;
    const inv = 1 / scale;
    return {
      x: Math.round(left * inv),
      y: Math.round(top * inv),
      w: Math.round(w * inv),
      h: Math.round(h * inv),
    };
  } catch {
    return null;
  }
}

/** Light unsharp mask. Skipped on very large canvases to keep uploads instant. */
function sharpen(c: AnyCanvas, amount = 0.45) {
  try {
    const w = c.width;
    const h = c.height;
    if (w * h > 4_000_000) return; // too big — cost outweighs the gain
    const cx = ctx2d(c, true);
    const srcData = cx.getImageData(0, 0, w, h);
    const s = srcData.data;
    const out = cx.createImageData(w, h);
    const d = out.data;
    const k = 1 + 4 * amount;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const v =
            k * s[i + ch] -
            amount * (s[i - 4 + ch] + s[i + 4 + ch] + s[i - w * 4 + ch] + s[i + w * 4 + ch]);
          d[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        d[i + 3] = s[i + 3];
      }
    }
    // copy the untouched 1px border
    for (let x = 0; x < w; x++) {
      for (const y of [0, h - 1]) {
        const i = (y * w + x) * 4;
        d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
      }
    }
    for (let y = 0; y < h; y++) {
      for (const x of [0, w - 1]) {
        const i = (y * w + x) * 4;
        d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
      }
    }
    cx.putImageData(out, 0, 0);
  } catch {
    /* ignore */
  }
}

/** Stepped 2x upscale keeps far more detail than one giant drawImage. */
function upscaleStepped(bmp: ImageBitmap, src: { x: number; y: number; w: number; h: number }, outW: number, outH: number): AnyCanvas {
  let cur = makeCanvas(src.w, src.h);
  ctx2d(cur).drawImage(bmp as any, src.x, src.y, src.w, src.h, 0, 0, src.w, src.h);
  let curW = src.w;
  let curH = src.h;
  while (curW * 2 <= outW && curH * 2 <= outH) {
    const next = makeCanvas(curW * 2, curH * 2);
    ctx2d(next).drawImage(cur as any, 0, 0, next.width, next.height);
    cur = next;
    curW = next.width;
    curH = next.height;
  }
  if (curW === outW && curH === outH) return cur;
  const out = makeCanvas(outW, outH);
  ctx2d(out).drawImage(cur as any, 0, 0, outW, outH);
  return out;
}

export async function enhanceBitmap(bmp: ImageBitmap, opts: PipelineOpts): Promise<Blob | null> {
  const box = detectContentBox(bmp);
  const src = box ?? { x: 0, y: 0, w: bmp.width, h: bmp.height };

  let width = src.w;
  let height = src.h;
  const longest = Math.max(width, height);
  if (longest > opts.maxDim) {
    const s = opts.maxDim / longest;
    width = Math.round(width * s);
    height = Math.round(height * s);
  } else {
    const shortest = Math.min(width, height);
    if (shortest < opts.minShortEdge) {
      const up = Math.min(opts.minShortEdge / shortest, opts.maxDim / longest);
      width = Math.round(width * up);
      height = Math.round(height * up);
    }
  }

  const isUpscale = width > src.w;
  let canvas: AnyCanvas;
  if (isUpscale) {
    canvas = upscaleStepped(bmp, src, width, height);
    sharpen(canvas, 0.4);
  } else {
    canvas = makeCanvas(width, height);
    ctx2d(canvas).drawImage(bmp as any, src.x, src.y, src.w, src.h, 0, 0, width, height);
  }

  const type = "image/jpeg";
  let quality = 0.98;
  let blob = await toBlob(canvas, type, quality);
  // One corrective pass only — extra passes are what made uploads feel slow.
  if (blob && blob.size > opts.targetBytes) {
    quality = 0.93;
    blob = await toBlob(canvas, type, quality);
  }
  return blob;
}
