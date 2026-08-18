import { flushSync } from "react-dom";

export type ImageFrame = { dataUrl: string; isFinal: boolean };

export async function streamImage(
  prompt: string,
  onFrame: (frame: ImageFrame) => void,
  size = "1024x1024",
): Promise<void> {
  const res = await fetch("/api/sam/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size }),
  });
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Image failed (${res.status})`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let sawCompleted = false;
  let streamError: string | undefined;

  const handleEvent = (name: string, dataRaw: string) => {
    if (dataRaw === "[DONE]") return;
    let payload: {
      type?: string;
      b64_json?: string;
      error?: { message?: string };
    } | undefined;
    try { payload = JSON.parse(dataRaw); } catch { return; }
    if (!payload) return;
    if (name === "error" || payload.type === "error") {
      streamError = payload.error?.message ?? "Image generation failed";
      return;
    }
    const t = payload.type ?? name;
    if (t !== "image_generation.partial_image" && t !== "image_generation.completed") return;
    if (!payload.b64_json) return;
    const isFinal = t === "image_generation.completed";
    flushSync(() => onFrame({ dataUrl: `data:image/png;base64,${payload!.b64_json}`, isFinal }));
    if (isFinal) sawCompleted = true;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    // parse SSE by blank-line separated events
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      }
      if (dataLines.length) handleEvent(eventName, dataLines.join("\n"));
    }
  }
  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error("Image stream ended without a completed event");
}
