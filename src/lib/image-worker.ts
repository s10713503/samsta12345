/// <reference lib="webworker" />
import { enhanceBitmap, type PipelineOpts } from "./image-pipeline";

self.onmessage = async (e: MessageEvent<{ id: number; file: File; opts: PipelineOpts }>) => {
  const { id, file, opts } = e.data;
  try {
    const bmp = await createImageBitmap(file);
    const blob = await enhanceBitmap(bmp, opts);
    bmp.close();
    (self as any).postMessage({ id, blob });
  } catch (err) {
    (self as any).postMessage({ id, error: String(err) });
  }
};
