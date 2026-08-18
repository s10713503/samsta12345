// @ts-nocheck
import { supabase as raw } from "@/integrations/supabase/client";
const supabase = raw as any;

export type Exam = "jee" | "neet";
export const SUBJECTS: Record<Exam, string[]> = {
  jee: ["Physics", "Chemistry", "Mathematics"],
  neet: ["Physics", "Chemistry", "Biology"],
};

export type Folder = { id: string; exam: Exam; subject: string; name: string; created_at: string };
export type Note = {
  id: string; exam: Exam; subject: string; folder_id: string | null;
  title: string; body: string | null; tags: string[]; pinned: boolean; favorite: boolean;
  image_paths: string[]; pdf_paths: string[]; created_at: string; updated_at: string;
};
export type Link = {
  id: string; exam: Exam; subject: string; folder_id: string | null;
  url: string; title: string | null; description: string | null;
  favicon: string | null; thumbnail: string | null; tags: string[]; favorite: boolean;
  created_at: string; updated_at: string;
};

const SIGN_TTL = 60 * 60;

export async function signPath(path: string): Promise<string | undefined> {
  if (!path) return;
  const { data } = await supabase.storage.from("study-files").createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl;
}

export async function listFolders(userId: string, exam: Exam, subject?: string): Promise<Folder[]> {
  let q = supabase.from("study_folders").select("*").eq("user_id", userId).eq("exam", exam).order("created_at", { ascending: false });
  if (subject) q = q.eq("subject", subject);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createFolder(userId: string, exam: Exam, subject: string, name: string) {
  const { data, error } = await supabase.from("study_folders").insert({ user_id: userId, exam, subject, name }).select("*").single();
  if (error) throw error;
  return data as Folder;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.from("study_folders").delete().eq("id", id);
  if (error) throw error;
}

export async function listNotes(userId: string, exam: Exam, opts: { subject?: string; folderId?: string | null; search?: string } = {}): Promise<Note[]> {
  let q = supabase.from("study_notes").select("*").eq("user_id", userId).eq("exam", exam)
    .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
  if (opts.subject) q = q.eq("subject", opts.subject);
  if (opts.folderId !== undefined) q = opts.folderId === null ? q.is("folder_id", null) : q.eq("folder_id", opts.folderId);
  if (opts.search) q = q.or(`title.ilike.%${opts.search}%,body.ilike.%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function countUserPdfs(userId: string): Promise<number> {
  const { data, error } = await supabase.from("study_notes").select("pdf_paths").eq("user_id", userId);
  if (error) return 0;
  return (data || []).reduce((n: number, r: any) => n + (r.pdf_paths?.length || 0), 0);
}

export async function upsertNote(row: Partial<Note> & { user_id: string; exam: Exam; subject: string; title: string }) {
  if (row.id) {
    const { data, error } = await supabase.from("study_notes").update(row).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data as Note;
  }
  const { data, error } = await supabase.from("study_notes").insert(row).select("*").single();
  if (error) throw error;
  return data as Note;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from("study_notes").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadStudyFile(userId: string, file: File, kind: "image" | "pdf"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "pdf" ? "pdf" : "bin");
  const path = `${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("study-files").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function listLinks(userId: string, exam: Exam, opts: { subject?: string; folderId?: string | null; search?: string } = {}): Promise<Link[]> {
  let q = supabase.from("study_links").select("*").eq("user_id", userId).eq("exam", exam).order("created_at", { ascending: false });
  if (opts.subject) q = q.eq("subject", opts.subject);
  if (opts.folderId !== undefined) q = opts.folderId === null ? q.is("folder_id", null) : q.eq("folder_id", opts.folderId);
  if (opts.search) q = q.or(`title.ilike.%${opts.search}%,url.ilike.%${opts.search}%,description.ilike.%${opts.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertLink(row: Partial<Link> & { user_id: string; exam: Exam; subject: string; url: string }) {
  if (row.id) {
    const { data, error } = await supabase.from("study_links").update(row).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data as Link;
  }
  const { data, error } = await supabase.from("study_links").insert(row).select("*").single();
  if (error) throw error;
  return data as Link;
}

export async function deleteLink(id: string) {
  const { error } = await supabase.from("study_links").delete().eq("id", id);
  if (error) throw error;
}

// Enrich URL client-side using favicon services + YouTube thumbnails.
export function enrichLink(url: string): Pick<Link, "favicon" | "thumbnail" | "title"> {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    let thumbnail: string | null = null;
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const id = host.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id) thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    return { favicon, thumbnail, title: host };
  } catch {
    return { favicon: null, thumbnail: null, title: url };
  }
}
