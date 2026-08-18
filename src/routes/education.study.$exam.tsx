// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Plus, Search, Pin, Star, Trash2, Folder as FolderIcon,
  FileText, Link2, Image as ImageIcon, Upload, X, ExternalLink, Lock,
  StickyNote, BookOpen, Crown, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import {
  SUBJECTS, type Exam, type Folder, type Note, type Link as LinkRow,
  listFolders, createFolder, deleteFolder,
  listNotes, upsertNote, deleteNote, uploadStudyFile, countUserPdfs, signPath,
  listLinks, upsertLink, deleteLink, enrichLink,
} from "@/lib/api/study";

const FREE_PDF_CAP = 2;

export const Route = createFileRoute("/education/study/$exam")({
  component: StudyPage,
  head: ({ params }) => {
    const label = params.exam === "neet" ? "NEET" : "IIT JEE";
    return {
      meta: [
        { title: `${label} Notes & Links · Samsta Academy` },
        { name: "description", content: `Premium ${label} study hub— notes, saved links, folders, PDFs, and ready organization.` },
        { property: "og:title", content: `${label} Notes & Links · Samsta Academy` },
        { property: "og:description", content: `Organize ${label} preparation with notes, links, folders and PDFs.` },
      ],
    };
  },
});

function StudyPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const { exam: rawExam } = Route.useParams();
  const exam = (rawExam === "neet" ? "neet" : "jee") as Exam;
  const subjects = SUBJECTS[exam];

  const [subject, setSubject] = useState<string>(subjects[0]);
  const [tab, setTab] = useState<"notes" | "links">("notes");
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined); // undefined = all
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null | "new">(null);
  const [editingLink, setEditingLink] = useState<LinkRow | null | "new">(null);
  const [showFolderInput, setShowFolderInput] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
  }, [user, loading, navigate]);

  useEffect(() => { setSubject(subjects[0]); setFolderId(undefined); }, [exam]);

  const refresh = async () => {
    if (!user) return;
    const [fs, ns, ls] = await Promise.all([
      listFolders(user.id, exam, subject),
      listNotes(user.id, exam, { subject, folderId, search: search || undefined }),
      listLinks(user.id, exam, { subject, folderId, search: search || undefined }),
    ]);
    setFolders(fs); setNotes(ns); setLinks(ls);
  };

  useEffect(() => { void refresh(); }, [user?.id, exam, subject, folderId, search]);

  if (loading || !user) return null;

  const otherExam = exam === "jee" ? "neet" : "jee";
  const examLabel = exam === "jee" ? "IIT JEE" : "NEET";

  return (
    <div className="min-h-screen pb-32" style={{
      background: "radial-gradient(1000px 600px at 15% -10%, oklch(0.94 0.06 260 / 0.5), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.94 0.06 160 / 0.45), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur-xl border-b border-foreground/5"
        style={{ background: "linear-gradient(to bottom, var(--background) 60%, transparent)" }}>
        <div className="flex items-center gap-3">
          <Link to="/education" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60 border border-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="font-display italic text-lg leading-tight truncate">{examLabel}</div>
            <div className="text-[11px] text-muted-foreground">Notes & Saved Links</div>
          </div>
          <div className="flex rounded-full bg-background/60 border border-foreground/10 p-1 text-[11px]">
            <button
              className={`px-3 py-1.5 rounded-full ${exam === "jee" ? "bg-foreground text-background" : ""}`}
              onClick={() => navigate({ to: "/education/study/$exam", params: { exam: "jee" } })}
            >JEE</button>
            <button
              className={`px-3 py-1.5 rounded-full ${exam === "neet" ? "bg-foreground text-background" : ""}`}
              onClick={() => navigate({ to: "/education/study/$exam", params: { exam: "neet" } })}
            >NEET</button>
          </div>
        </div>

        {/* Subject chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => { setSubject(s); setFolderId(undefined); }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs border ${
                subject === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background/60 border-foreground/10 text-foreground/70"
              }`}
            >{s}</button>
          ))}
        </div>

        {/* Notes / Links tabs */}
        <div className="mt-3 grid grid-cols-2 rounded-2xl bg-background/60 border border-foreground/10 p-1 text-sm">
          <button
            onClick={() => setTab("notes")}
            className={`rounded-xl py-2 flex items-center justify-center gap-1.5 ${tab === "notes" ? "bg-foreground text-background" : "text-foreground/70"}`}
          ><StickyNote className="h-4 w-4" /> Notes</button>
          <button
            onClick={() => setTab("links")}
            className={`rounded-xl py-2 flex items-center justify-center gap-1.5 ${tab === "links" ? "bg-foreground text-background" : "text-foreground/70"}`}
          ><Link2 className="h-4 w-4" /> Saved Links</button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab === "notes" ? "notes" : "links"} in ${subject}…`}
            className="w-full rounded-full bg-background/60 border border-foreground/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
        </div>
      </header>

      {/* Folders row */}
      <section className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-foreground/60">Folders</div>
          <button onClick={() => setShowFolderInput(true)} className="text-xs inline-flex items-center gap-1 text-foreground/70">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <FolderChip active={folderId === undefined} label="All" onClick={() => setFolderId(undefined)} />
          <FolderChip active={folderId === null} label="Unfiled" onClick={() => setFolderId(null)} />
          {folders.map((f) => (
            <FolderChip
              key={f.id}
              active={folderId === f.id}
              label={f.name}
              onClick={() => setFolderId(f.id)}
              onDelete={async () => {
                if (!confirm(`Delete folder "${f.name}"? Notes remain, just unfiled.`)) return;
                await deleteFolder(f.id);
                if (folderId === f.id) setFolderId(undefined);
                void refresh();
              }}
            />
          ))}
        </div>
        {showFolderInput && (
          <FolderCreateInput
            onCancel={() => setShowFolderInput(false)}
            onSave={async (name) => {
              if (!name.trim()) { setShowFolderInput(false); return; }
              await createFolder(user.id, exam, subject, name.trim());
              setShowFolderInput(false);
              void refresh();
            }}
          />
        )}
      </section>

      {/* Content */}
      <main className="px-4 pt-4">
        {tab === "notes" ? (
          notes.length === 0 ? (
            <EmptyState
              icon={StickyNote}
              title="No notes yet"
              subtitle={`Start capturing ${subject} concepts, formulas and PDFs.`}
              cta="Create your first note"
              onCta={() => setEditingNote("new")}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.map((n) => (
                <NoteCard key={n.id} note={n} onOpen={() => setEditingNote(n)} onDelete={async () => {
                  if (!confirm("Delete this note?")) return;
                  await deleteNote(n.id); void refresh();
                }} />
              ))}
            </div>
          )
        ) : (
          links.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No saved links"
              subtitle="Bookmark YouTube videos, PDFs, docs, and websites."
              cta="Save your first link"
              onCta={() => setEditingLink("new")}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((l) => (
                <LinkCard key={l.id} link={l} onEdit={() => setEditingLink(l)} onDelete={async () => {
                  if (!confirm("Delete this link?")) return;
                  await deleteLink(l.id); void refresh();
                }} />
              ))}
            </div>
          )
        )}
      </main>

      {/* Floating + */}
      <button
        onClick={() => tab === "notes" ? setEditingNote("new") : setEditingLink("new")}
        aria-label="Create"
        className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full grid place-items-center text-background shadow-2xl active:scale-95 transition"
        style={{ background: "linear-gradient(135deg, oklch(0.35 0.02 260), oklch(0.15 0 0))", boxShadow: "0 10px 30px oklch(0 0 0 / 0.35)" }}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {editingNote !== null && (
        <NoteEditor
          userId={user.id}
          exam={exam}
          subject={subject}
          folders={folders}
          note={editingNote === "new" ? null : editingNote}
          defaultFolderId={folderId === undefined ? null : folderId}
          onClose={() => setEditingNote(null)}
          onSaved={() => { setEditingNote(null); void refresh(); }}
        />
      )}
      {editingLink !== null && (
        <LinkEditor
          userId={user.id}
          exam={exam}
          subject={subject}
          folders={folders}
          link={editingLink === "new" ? null : editingLink}
          defaultFolderId={folderId === undefined ? null : folderId}
          onClose={() => setEditingLink(null)}
          onSaved={() => { setEditingLink(null); void refresh(); }}
        />
      )}
    </div>
  );
}

/* ────────── Sub-components ────────── */

function FolderChip({ active, label, onClick, onDelete }: any) {
  return (
    <div className={`shrink-0 group flex items-center rounded-full border text-xs ${active ? "bg-foreground text-background border-foreground" : "bg-background/60 border-foreground/10 text-foreground/80"}`}>
      <button onClick={onClick} className="pl-3 pr-2 py-1.5 flex items-center gap-1.5">
        <FolderIcon className="h-3.5 w-3.5" /> {label}
      </button>
      {onDelete && (
        <button onClick={onDelete} className="pr-2 opacity-0 group-hover:opacity-70 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function FolderCreateInput({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input
        autoFocus value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Folder name (e.g. Class 12, Revision, Mock Tests)"
        className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:border-foreground/30"
        onKeyDown={(e) => e.key === "Enter" && onSave(name)}
      />
      <button onClick={() => onSave(name)} className="rounded-full bg-foreground text-background px-4 text-sm">Add</button>
      <button onClick={onCancel} className="rounded-full border border-foreground/10 px-3 text-sm">Cancel</button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, cta, onCta }: any) {
  return (
    <div className="text-center py-14 animate-fade-up">
      <div className="mx-auto h-20 w-20 rounded-full grid place-items-center bg-background/60 border border-foreground/10">
        <Icon className="h-8 w-8 opacity-70" />
      </div>
      <div className="mt-4 font-display italic text-xl">{title}</div>
      <div className="mt-1 text-sm text-foreground/60 max-w-xs mx-auto">{subtitle}</div>
      <button onClick={onCta} className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm">
        <Plus className="h-4 w-4" /> {cta}
      </button>
    </div>
  );
}

function NoteCard({ note, onOpen, onDelete }: any) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl p-4 relative">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {note.pinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
            {note.favorite && <Star className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />}
            <div className="font-medium truncate">{note.title}</div>
          </div>
          {note.body && <div className="mt-1 text-xs text-foreground/60 line-clamp-3 whitespace-pre-wrap">{note.body}</div>}
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags?.slice(0, 4).map((t: string) => (
              <span key={t} className="text-[10px] rounded-full bg-foreground/10 px-2 py-0.5">#{t}</span>
            ))}
            {(note.image_paths?.length || 0) > 0 && (
              <span className="text-[10px] rounded-full bg-foreground/10 px-2 py-0.5 inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {note.image_paths.length}
              </span>
            )}
            {(note.pdf_paths?.length || 0) > 0 && (
              <span className="text-[10px] rounded-full bg-rose-500/15 text-rose-600 px-2 py-0.5 inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> {note.pdf_paths.length}
              </span>
            )}
          </div>
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-foreground/10">
          <Trash2 className="h-3.5 w-3.5 text-foreground/50" />
        </button>
      </div>
    </div>
  );
}

function LinkCard({ link, onEdit, onDelete }: any) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl overflow-hidden">
      {link.thumbnail && (
        <a href={link.url} target="_blank" rel="noreferrer">
          <img src={link.thumbnail} alt="" className="w-full h-32 object-cover" />
        </a>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {link.favicon && <img src={link.favicon} alt="" className="h-5 w-5 mt-0.5 rounded" />}
          <div className="flex-1 min-w-0">
            <a href={link.url} target="_blank" rel="noreferrer" className="font-medium text-sm truncate block hover:underline">
              {link.title || link.url}
            </a>
            <div className="text-[11px] text-foreground/50 truncate">{link.url}</div>
            {link.description && <div className="text-xs text-foreground/60 mt-1 line-clamp-2">{link.description}</div>}
            <div className="mt-2 flex flex-wrap gap-1">
              {link.tags?.slice(0, 4).map((t: string) => (
                <span key={t} className="text-[10px] rounded-full bg-foreground/10 px-2 py-0.5">#{t}</span>
              ))}
              {link.favorite && <Star className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <a href={link.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-full hover:bg-foreground/10">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={onEdit} className="p-1.5 rounded-full hover:bg-foreground/10 text-[10px]">Edit</button>
            <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-foreground/10">
              <Trash2 className="h-3.5 w-3.5 text-foreground/50" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────── Editors ────────── */

function Sheet({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl border border-foreground/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-in-right"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/5">
          <div className="font-display italic text-lg">{title}</div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

function NoteEditor({ userId, exam, subject, folders, note, defaultFolderId, onClose, onSaved }: any) {
  const { isPremium } = usePremium();
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [tags, setTags] = useState<string>(note?.tags?.join(", ") || "");
  const [pinned, setPinned] = useState<boolean>(!!note?.pinned);
  const [favorite, setFavorite] = useState<boolean>(!!note?.favorite);
  const [folderIdSel, setFolderIdSel] = useState<string | null>(note?.folder_id ?? defaultFolderId ?? null);
  const [images, setImages] = useState<string[]>(note?.image_paths || []);
  const [pdfs, setPdfs] = useState<string[]>(note?.pdf_paths || []);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [existingPdfCount, setExistingPdfCount] = useState(0);
  const imgRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(images.map(async (p) => [p, await signPath(p)] as const));
      const map: Record<string, string> = {};
      entries.forEach(([p, u]) => { if (u) map[p] = u; });
      setImgUrls(map);
    })();
  }, [images.join(",")]);

  useEffect(() => { void countUserPdfs(userId).then(setExistingPdfCount); }, [userId]);

  const remainingFreePdfSlots = Math.max(0, FREE_PDF_CAP - (existingPdfCount - (note?.pdf_paths?.length || 0)));
  const canAddPdf = isPremium || (pdfs.length - (note?.pdf_paths?.length || 0)) < remainingFreePdfSlots;

  const pickImages = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const p = await uploadStudyFile(userId, f, "image");
      setImages((prev) => [...prev, p]);
    }
  };

  const pickPdfs = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!canAddPdf) {
        toast.error("Free tier is limited to 2 PDFs. Upgrade to Premium for more.");
        return;
      }
      const p = await uploadStudyFile(userId, f, "pdf");
      setPdfs((prev) => [...prev, p]);
    }
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    setSaving(true);
    try {
      await upsertNote({
        id: note?.id,
        user_id: userId, exam, subject,
        folder_id: folderIdSel,
        title: title.trim(),
        body: body.trim() || null,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        pinned, favorite,
        image_paths: images,
        pdf_paths: pdfs,
      });
      toast.success(note ? "Note updated" : "Note created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <Sheet title={note ? "Edit note" : "New note"} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 text-base font-medium outline-none focus:border-foreground/30"
        />
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your note… formulas, checklists, anything."
          rows={8}
          className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-foreground/30 resize-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={folderIdSel || ""}
            onChange={(e) => setFolderIdSel(e.target.value || null)}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Unfiled</option>
            {folders.map((f: Folder) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input
            value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma, sep"
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm outline-none"
          />
        </div>

        <div className="flex gap-2 text-xs">
          <button onClick={() => setPinned((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${pinned ? "bg-amber-500/15 border-amber-500/40 text-amber-700" : "border-foreground/10"}`}>
            <Pin className="h-3.5 w-3.5" /> {pinned ? "Pinned" : "Pin"}
          </button>
          <button onClick={() => setFavorite((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${favorite ? "bg-rose-500/15 border-rose-500/40 text-rose-700" : "border-foreground/10"}`}>
            <Star className="h-3.5 w-3.5" /> Favorite
          </button>
        </div>

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] uppercase tracking-wider text-foreground/60">Images</div>
            <button onClick={() => imgRef.current?.click()} className="text-xs inline-flex items-center gap-1 text-foreground/70">
              <Upload className="h-3.5 w-3.5" /> Add
            </button>
            <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((p) => (
                <div key={p} className="relative rounded-xl overflow-hidden border border-foreground/10 aspect-square bg-foreground/5">
                  {imgUrls[p] && <img src={imgUrls[p]} alt="" className="w-full h-full object-cover" />}
                  <button onClick={() => setImages((prev) => prev.filter((x) => x !== p))} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PDFs */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] uppercase tracking-wider text-foreground/60 inline-flex items-center gap-1.5">
              PDFs {!isPremium && <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] normal-case tracking-normal">Free: {Math.max(0, FREE_PDF_CAP - existingPdfCount)} of {FREE_PDF_CAP} left</span>}
            </div>
            <button onClick={() => pdfRef.current?.click()} className="text-xs inline-flex items-center gap-1 text-foreground/70">
              <Upload className="h-3.5 w-3.5" /> Add PDF
            </button>
            <input ref={pdfRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => pickPdfs(e.target.files)} />
          </div>
          {pdfs.length === 0 && !isPremium && (
            <Link to="/premium" className="block rounded-2xl border border-foreground/10 bg-gradient-to-br from-amber-500/10 to-transparent p-3 text-xs text-foreground/80">
              <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-600" /><span className="font-medium">Free tier: 2 PDFs total.</span></div>
              <div className="text-[11px] text-foreground/60 mt-0.5">Upgrade to Premium for unlimited PDF uploads.</div>
            </Link>
          )}
          {pdfs.length > 0 && (
            <ul className="space-y-1.5">
              {pdfs.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-background/60 px-3 py-2 text-xs">
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span className="flex-1 truncate">{p.split("/").pop()}</span>
                  <button onClick={async () => {
                    const url = await signPath(p);
                    if (url) window.open(url, "_blank");
                  }} className="text-foreground/70 hover:underline">Open</button>
                  <button onClick={() => setPdfs((prev) => prev.filter((x) => x !== p))}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={save} disabled={saving}
          className="w-full mt-2 rounded-full bg-foreground text-background py-3 text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {note ? "Save changes" : "Create note"}
        </button>
      </div>
    </Sheet>
  );
}

function LinkEditor({ userId, exam, subject, folders, link, defaultFolderId, onClose, onSaved }: any) {
  const [url, setUrl] = useState(link?.url || "");
  const [title, setTitle] = useState(link?.title || "");
  const [description, setDescription] = useState(link?.description || "");
  const [tags, setTags] = useState<string>(link?.tags?.join(", ") || "");
  const [favorite, setFavorite] = useState<boolean>(!!link?.favorite);
  const [folderIdSel, setFolderIdSel] = useState<string | null>(link?.folder_id ?? defaultFolderId ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!link && url) {
      const meta = enrichLink(url);
      if (meta.title && !title) setTitle(meta.title);
    }
  }, [url]);

  const save = async () => {
    if (!url.trim()) { toast.error("Add a URL"); return; }
    setSaving(true);
    try {
      const meta = enrichLink(url.trim());
      await upsertLink({
        id: link?.id,
        user_id: userId, exam, subject,
        folder_id: folderIdSel,
        url: url.trim(),
        title: title.trim() || meta.title || null,
        description: description.trim() || null,
        favicon: link?.favicon || meta.favicon || null,
        thumbnail: link?.thumbnail || meta.thumbnail || null,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        favorite,
      });
      toast.success(link ? "Link updated" : "Link saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <Sheet title={link ? "Edit link" : "Save a link"} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url"
          className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional — auto-filled)"
          className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-foreground/30"
        />
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
          rows={3}
          className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3 text-sm outline-none focus:border-foreground/30 resize-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={folderIdSel || ""}
            onChange={(e) => setFolderIdSel(e.target.value || null)}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm outline-none"
          >
            <option value="">Unfiled</option>
            {folders.map((f: Folder) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input
            value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="tags, comma, sep"
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <button onClick={() => setFavorite((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs ${favorite ? "bg-rose-500/15 border-rose-500/40 text-rose-700" : "border-foreground/10"}`}>
          <Star className="h-3.5 w-3.5" /> Favorite
        </button>
        <button
          onClick={save} disabled={saving}
          className="w-full mt-2 rounded-full bg-foreground text-background py-3 text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {link ? "Save changes" : "Save link"}
        </button>
      </div>
    </Sheet>
  );
}
