// Burns the Samsta watermark into media only when it leaves the app
// (download / share to WhatsApp, status, other apps). In-app viewing stays clean.

export async function watermarkImage(url: string, username?: string | null): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();

    const handle = `@${(username ?? "samsta").replace(/^@/, "")}`;
    const label = `${handle} · Samsta`;
    const pad = Math.round(Math.min(canvas.width, canvas.height) * 0.025);
    const fontSize = Math.max(16, Math.round(Math.min(canvas.width, canvas.height) * 0.032));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    ctx.textBaseline = "middle";
    const textW = ctx.measureText(label).width;
    const boxH = Math.round(fontSize * 1.9);
    const boxW = Math.round(textW + fontSize * 1.4);
    const x = canvas.width - boxW - pad;
    const y = canvas.height - boxH - pad;
    const r = boxH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
    ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
    ctx.arcTo(x, y + boxH, x, y, r);
    ctx.arcTo(x, y, x + boxW, y, r);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(212,175,55,0.65)";
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fillText(label, x + fontSize * 0.7, y + boxH / 2 + 1);
    ctx.restore();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95),
    );
  } catch {
    return null;
  }
}
