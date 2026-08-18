import { useRef, useState } from "react";
import { Film, Play, Layers } from "lucide-react";

type Media = { url?: string | null; type?: string | null };

/**
 * Profile grid tile: shows the COMPLETE media (object-contain), never cropped.
 * A blurred copy of the same media fills the leftover space so tiles stay
 * uniform and premium-looking, Instagram-style, without cutting faces.
 */
export function GridMediaTile({
  media,
  count = 1,
  isReel = false,
  className = "",
  fit = "contain",
}: {
  media?: Media | null;
  count?: number;
  isReel?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [loaded, setLoaded] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);

  const url = media?.url ?? null;
  const isVideo = media?.type === "video" || media?.type?.startsWith("video/");
  const isCover = fit === "cover";
  const fitCls = isCover ? "object-cover object-center" : "object-contain";

  if (!url) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-muted px-2 text-center text-xs text-muted-foreground ${className}`}>
        Media unavailable
      </div>
    );
  }

  return (
    <>
      {/* blurred backdrop fill (same asset) — only needed for contain fit */}
      {!isCover && (
        <div className="absolute inset-0 overflow-hidden">
          {isVideo ? (
            <video src={url} className="h-full w-full scale-125 object-cover blur-2xl saturate-150" muted playsInline preload="metadata" />
          ) : (
            <img src={url} alt="" aria-hidden className="h-full w-full scale-125 object-cover blur-2xl saturate-150" loading="lazy" decoding="async" />
          )}
          <div className="absolute inset-0 bg-background/25" />
        </div>
      )}

      {/* loading skeleton */}
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}

      {/* media */}
      {isVideo ? (
        <video
          ref={vidRef}
          src={url}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            setLoaded(true);
            const d = vidRef.current?.duration;
            if (d && isFinite(d)) setDuration(d);
          }}
           className={`relative h-full w-full ${fitCls} transition-[opacity,transform] duration-500 ease-out ${loaded ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"} ${className}`}
        />
      ) : (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
           className={`relative h-full w-full ${fitCls} transition-[opacity,transform] duration-500 ease-out ${loaded ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"} ${className}`}
        />
      )}


      {(isVideo || isReel) && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/35 backdrop-blur">
            {isReel ? <Film className="h-4 w-4 text-background" /> : <Play className="h-4 w-4 text-background" />}
          </span>
        </span>
      )}

      {duration !== null && (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-full bg-foreground/55 px-1.5 py-0.5 text-[10px] font-medium text-background backdrop-blur">
          {formatDuration(duration)}
        </span>
      )}

      {count > 1 && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-foreground/50 px-1.5 py-0.5 text-[10px] font-medium text-background backdrop-blur">
          <Layers className="h-3 w-3" /> {count}
        </span>
      )}
    </>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
