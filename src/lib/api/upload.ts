// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { compressImage, VIDEO_LIMITS, formatBytes } from "@/lib/media-compress";
import type { MediaItem } from "@/lib/api/feed";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function bucketForKind(kind: "post" | "reel" | "story"): string {
  if (kind === "reel") return "reels";
  if (kind === "story") return "stories";
  return "posts";
}

/**
 * Upload straight to storage over XHR so we can report real byte-level
 * progress (the JS client does not expose upload progress events).
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: Blob,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in to upload");
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Upload service is not configured");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          msg = JSON.parse(xhr.responseText)?.message ?? msg;
        } catch {
          /* keep default */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(file);
  });
  onProgress?.(100);
}

/** uploadMedia with progress reporting for images, videos and podcast audio. */
export async function uploadMediaTracked(
  userId: string,
  file: File,
  kind: "post" | "reel" | "story" = "post",
  onProgress?: (pct: number) => void,
): Promise<MediaItem> {
  const isVideo = file.type.startsWith("video");
  const isAudio = file.type.startsWith("audio");
  let toUpload: Blob = file;

  if (isVideo) {
    const cap = VIDEO_LIMITS.ultra;
    if (file.size > cap) {
      throw new Error(`Video is ${formatBytes(file.size)}. Maximum upload size is ${formatBytes(cap)}.`);
    }
  } else if (file.type.startsWith("image")) {
    toUpload = await compressImage(file, "ultra");
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = bucketForKind(kind);
  await uploadWithProgress(bucket, path, toUpload, toUpload.type || file.type, onProgress);

  return {
    path,
    bucket,
    type: isVideo ? "video" : isAudio ? "audio" : "image",
    size: (toUpload as File).size ?? file.size,
    mime: file.type,
  };
}

/** Grab a poster frame + duration from a local video file, in the browser. */
export async function extractVideoPoster(
  file: File,
): Promise<{ blob: Blob; durationSec: number; width: number; height: number } | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("decode failed"));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 2000);
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    const out = blob
      ? { blob, durationSec: video.duration || 0, width: canvas.width, height: canvas.height }
      : null;
    URL.revokeObjectURL(url);
    return out;
  } catch {
    return null;
  }
}

/**
 * Background processing for videos / podcasts: builds the poster thumbnail
 * (used for OG link previews too) and flips the post to "ready".
 */
export async function processPostMedia(
  postId: string,
  userId: string,
  files: File[],
  media: MediaItem[],
  onStep?: (pct: number, label: string) => void,
) {
  try {
    onStep?.(20, "Processing media…");
    const next = media.slice();
    for (let i = 0; i < next.length; i++) {
      const item = next[i];
      const file = files[i];
      if (!file || (item.type !== "video" && item.type !== "audio")) continue;
      if (item.type === "video") {
        const poster = await extractVideoPoster(file);
        if (poster) {
          const posterPath = `${userId}/poster-${Date.now()}-${i}.jpg`;
          await uploadWithProgress(item.bucket ?? "posts", posterPath, poster.blob, "image/jpeg");
          next[i] = {
            ...item,
            poster: posterPath,
            posterBucket: item.bucket ?? "posts",
            duration: Math.round(poster.durationSec),
            width: poster.width,
            height: poster.height,
          };
        }
      }
      onStep?.(20 + Math.round(((i + 1) / next.length) * 70), "Processing media…");
    }
    await supabase
      .from("posts")
      .update({ media: next, processing_status: "ready", processing_progress: 100, processing_error: null })
      .eq("id", postId);
    onStep?.(100, "Ready");
    return next;
  } catch (e) {
    await supabase
      .from("posts")
      .update({
        processing_status: "failed",
        processing_error: e instanceof Error ? e.message : "Processing failed",
      })
      .eq("id", postId);
    throw e;
  }
}
