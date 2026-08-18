// Shared SSE streamer for /api/sam
import { deLatex } from "@/lib/plain-math";

// Tools that return raw JSON must not be normalised (deLatex strips braces).
const isJsonish = (t: string) => /^[\s\n]*[[{]/.test(t) || t.includes("```json");
const plain = (t: string) => (isJsonish(t) ? t : deLatex(t));

export async function streamSam(
  tool: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  onDelta: (acc: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/sam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let acc = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) {
          acc += delta;
          onDelta(plain(acc));
        }
      } catch { /* ignore */ }
    }
  }
  return plain(acc);
}
