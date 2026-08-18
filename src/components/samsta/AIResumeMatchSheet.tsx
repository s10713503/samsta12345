import { useRef, useState } from "react";
import { Upload, ShieldCheck, ShieldX, Sparkles, X, MapPin, Briefcase, ScanLine, Camera, FileText } from "lucide-react";

export type ResumeMatchResult = {
  authentic: boolean;
  authenticity_score: number;
  verdict: "accept" | "reject";
  reason: string;
  candidate_name: string;
  headline: string;
  years_experience: number;
  extracted_skills: string[];
  suggested_roles: string[];
  match_summary: string;
};

type Stage = "form" | "scanning" | "done" | "error";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function AIResumeMatchSheet({
  open,
  onClose,
  onAccepted,
}: {
  open: boolean;
  onClose: () => void;
  onAccepted: (r: ResumeMatchResult, prefs: { role: string; location: string }) => void;
}) {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResumeMatchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function runScan() {
    if (!file) { setError("Please upload your resume (PDF or image)."); return; }
    setError(""); setStage("scanning"); setResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/career/resume-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_data: dataUrl,
          filename: file.name,
          mime: file.type || "application/pdf",
          target_role: role,
          target_location: location,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Scan failed");
      const data = (await res.json()) as ResumeMatchResult;
      setResult(data);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("error");
    }
  }

  function reset() { setStage("form"); setResult(null); setError(""); setFile(null); }

  const accent = result?.verdict === "accept" ? "from-emerald-400 to-emerald-600" : "from-rose-500 to-rose-700";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-md animate-fade-in sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0d1a]/95 shadow-[0_-20px_80px_rgba(232,200,116,0.15)] backdrop-blur-2xl animate-scale-in sm:rounded-3xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-10 h-56 w-56 rounded-full bg-[#e8c874]/25 blur-[90px]" />
          <div className="absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-[#4f7cff]/25 blur-[90px]" />
        </div>

        <div className="relative flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#e8c874] to-[#c9a34a] text-[#05070f]"><Sparkles className="h-4 w-4" /></div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#e8c874]">Premium</div>
              <div className="text-sm font-semibold text-white">Resume Match</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:text-white active:scale-90"><X className="h-4 w-4" /></button>
        </div>

        <div className="relative px-5 pb-6 pt-5">
          {stage === "form" && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-white/60">Upload your resume. Our verifies authenticity and matches you to real roles.</p>
              <label className="block">
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/50"><Briefcase className="h-3 w-3" /> Desired role</div>
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Frontend engineer, Product designer…" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
              </label>
              <label className="block">
                <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/50"><MapPin className="h-3 w-3" /> Preferred location</div>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore, Remote, London…" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#e8c874]/50 active:scale-95">
                  <Camera className="h-5 w-5 text-[#e8c874]" />
                  <span className="text-[11px] font-medium">Camera</span>
                </button>
                <button onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#e8c874]/50 active:scale-95">
                  <Upload className="h-5 w-5 text-[#e8c874]" />
                  <span className="text-[11px] font-medium">Photo</span>
                </button>
                <button onClick={() => pdfRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#e8c874]/50 active:scale-95">
                  <FileText className="h-5 w-5 text-[#e8c874]" />
                  <span className="text-[11px] font-medium">PDF</span>
                </button>
              </div>
              {file && <div className="truncate rounded-xl border border-[#e8c874]/30 bg-[#e8c874]/10 px-3 py-2 text-[11px] text-[#e8c874]">{file.name}</div>}
              <div className="text-center text-[10px] uppercase tracking-wider text-white/40">PDF · PNG · JPG · up to 10 MB</div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

              {error && <div className="text-xs text-rose-300">{error}</div>}

              <button
                onClick={runScan}
                disabled={!file}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] via-[#f2d98b] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] shadow-[0_10px_40px_rgba(232,200,116,0.35)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                <ScanLine className="h-4 w-4" /> Run Scan
              </button>
            </div>
          )}

          {stage === "scanning" && (
            <div className="flex flex-col items-center gap-4 py-8 animate-fade-in">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#e8c874]/20" />
                <div className="absolute inset-2 rounded-full border border-[#e8c874]/40" />
                <div className="absolute inset-0 rounded-full border-t-2 border-[#e8c874] [animation:spin_1.4s_linear_infinite]" />
                <ScanLine className="h-8 w-8 text-[#e8c874]" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">Scanning resume…</div>
                <div className="mt-1 text-[11px] text-white/50">Authenticity · Skills · Match score</div>
              </div>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-1/2 animate-[slide-in-right_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#e8c874] to-transparent" />
              </div>
            </div>
          )}

          {stage === "done" && result && (
            <div className="space-y-4 animate-fade-in">
              <div className={`relative overflow-hidden rounded-2xl border p-4 ${result.verdict === "accept" ? "border-emerald-400/30 bg-emerald-500/5" : "border-rose-400/30 bg-rose-500/5"}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white shadow-lg`}>
                    {result.verdict === "accept" ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider text-white/50">Verdict</div>
                    <div className="text-lg font-bold">{result.verdict === "accept" ? "Accepted · Verified Original" : "Rejected · Not Verified"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-white/50">Authenticity</div>
                    <div className={`text-xl font-bold ${result.verdict === "accept" ? "text-emerald-300" : "text-rose-300"}`}>{result.authenticity_score}%</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full bg-gradient-to-r ${accent} transition-all duration-700`} style={{ width: `${result.authenticity_score}%` }} />
                </div>
                {result.reason && <div className="mt-3 text-xs text-white/70">{result.reason}</div>}
              </div>

              {result.verdict === "accept" ? (
                <>
                  {(result.candidate_name || result.headline) && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      {result.candidate_name && <div className="text-sm font-semibold">{result.candidate_name}</div>}
                      {result.headline && <div className="text-xs text-white/60">{result.headline}</div>}
                      {result.years_experience > 0 && <div className="mt-1 text-[11px] text-[#e8c874]">{result.years_experience} yrs experience</div>}
                    </div>
                  )}
                  {result.extracted_skills.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/50">Detected skills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.extracted_skills.map((s) => (
                          <span key={s} className="rounded-full border border-[#e8c874]/30 bg-[#e8c874]/10 px-2 py-0.5 text-[11px] text-[#e8c874]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.match_summary && <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/70">{result.match_summary}</div>}
                  <button
                    onClick={() => onAccepted(result, { role, location })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 py-3 text-sm font-bold text-[#05070f] shadow-[0_10px_40px_rgba(52,211,153,0.35)] transition active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" /> Show matching jobs
                  </button>
                </>
              ) : (
                <button onClick={reset} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/80 transition active:scale-[0.98]">Try again with a different resume</button>
              )}
            </div>
          )}

          {stage === "error" && (
            <div className="space-y-3 animate-fade-in">
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error || "Scan failed"}</div>
              <button onClick={reset} className="w-full rounded-2xl bg-white/10 py-3 text-sm font-medium">Try again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}