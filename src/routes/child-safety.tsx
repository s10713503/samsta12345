// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert, Ban, Flag, Gavel, Mail, Lock, Send, Loader2 } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { reportContent } from "@/lib/api/safety";

const CHILD_SAFETY_EMAIL = "support@samsta.app";
const CANONICAL = "https://samsta12345.lovable.app/child-safety";
const TITLE = "Child Safety Standards · Samsta";
const DESC =
  "Samsta has zero tolerance for child sexual abuse and exploitation (CSAE/CSAM). Read our prohibited conduct, reporting, blocking and enforcement standards.";

export const Route = createFileRoute("/child-safety")({
  component: ChildSafetyPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

const GRAD = "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))";

function Section({ icon: Icon, title, children }) {
  return (
    <section className="glass mb-3 rounded-3xl p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: GRAD }}>
          <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function ChildSafetyPage() {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const details = text.trim();
    if (details.length < 10) {
      toast.error("Please describe the concern (at least 10 characters).");
      return;
    }
    if (!user) {
      window.location.href = `mailto:${CHILD_SAFETY_EMAIL}?subject=${encodeURIComponent(
        "Child safety report",
      )}&body=${encodeURIComponent(details)}`;
      return;
    }
    setBusy(true);
    try {
      await reportContent({
        reporterId: user.id,
        targetType: "profile",
        targetId: user.id,
        reason: "other",
        details: `CHILD SAFETY (CSAE): ${details}`,
      });
      toast.success("Report sent to the Samsta safety team.");
      setText("");
      setOpen(false);
    } catch {
      toast.error("Could not send the report — please email " + CHILD_SAFETY_EMAIL);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh pb-32">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <Link to="/settings/privacy" aria-label="Back to privacy settings" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">Child Safety Standards</h1>
          <p className="text-[11px] text-muted-foreground">Zero tolerance for CSAE/CSAM</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4">
        <section className="glass mb-3 rounded-3xl p-4">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: GRAD }}>
              <ShieldAlert className="h-4.5 w-4.5" strokeWidth={1.8} />
            </span>
            <h2 className="text-sm font-semibold">Samsta has zero tolerance for child sexual abuse and exploitation (CSAE/CSAM).</h2>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Samsta is committed to maintaining a safe environment for all users, especially children and minors. Any
            content, behavior, account, or activity involving the sexual exploitation or abuse of children is strictly
            prohibited.
          </p>
        </section>

        <Section icon={Ban} title="Prohibited content and behavior">
          <p>Users must not:</p>
          <Bullets
            items={[
              "Upload, share, request, create, promote, or distribute child sexual abuse material (CSAM).",
              "Sexualize, exploit, groom, or solicit minors.",
              "Use Samsta to arrange or facilitate sexual contact with a minor.",
              "Share sexual or exploitative content involving anyone under 18.",
              "Encourage, promote, or assist the exploitation or abuse of children.",
              "Use the platform to groom or manipulate minors for sexual purposes.",
            ]}
          />
        </Section>

        <Section icon={Flag} title="Reporting">
          <p>
            Users can report suspected child sexual abuse, exploitation, grooming, or other inappropriate
            content/accounts through Samsta's in-app Report feature.
          </p>
          <p>
            When a user submits a report, Samsta may review the reported content or account and take appropriate
            action, including removing content, restricting features, suspending, or permanently terminating accounts
            that violate these standards.
          </p>
        </Section>

        <Section icon={Ban} title="Blocking and safety tools">
          <p>
            Users can use Samsta's Block and Report features to protect themselves from unwanted or inappropriate
            interactions.
          </p>
          <p>
            Users should immediately report suspicious or harmful behavior involving minors through the available
            reporting tools.
          </p>
        </Section>

        <Section icon={Gavel} title="Enforcement">
          <p>Samsta may take immediate action against accounts that violate these Child Safety Standards. Enforcement may include:</p>
          <Bullets
            items={[
              "Content removal",
              "Account restrictions",
              "Temporary suspension",
              "Permanent account termination",
              "Reporting to appropriate authorities or organizations where required by applicable law",
            ]}
          />
          <p>Samsta may preserve relevant information when necessary for safety, legal compliance, or investigations.</p>
        </Section>

        <Section icon={Mail} title="Contact">
          <p>
            For child-safety concerns, suspected CSAE/CSAM, or questions about Samsta's child-safety practices, contact
            our monitored child safety address:
          </p>
          <a href={`mailto:${CHILD_SAFETY_EMAIL}`} className="inline-block font-semibold text-primary">
            {CHILD_SAFETY_EMAIL}
          </a>
        </Section>

        <Section icon={Lock} title="Privacy">
          <p>
            Samsta handles user information according to its <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link>.
            Child-safety reports and related information are handled securely and used only for safety, moderation,
            legal compliance, and other legitimate purposes.
          </p>
        </Section>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-[0.98]"
            style={{ background: GRAD }}
          >
            <Flag className="h-4 w-4" /> Report a Safety Concern
          </button>
          {open && (
            <div className="glass animate-fade-in rounded-3xl p-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Describe what you saw, and include the username or link if you have it."
                className="w-full rounded-2xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={submit}
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60"
                style={{ background: GRAD }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? "Sending…" : user ? "Send report to safety team" : "Email the safety team"}
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                You can also report any post, profile or message directly from its menu in the app.
              </p>
            </div>
          )}
          <a
            href={`mailto:${CHILD_SAFETY_EMAIL}?subject=${encodeURIComponent("Child safety concern")}`}
            className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold active:scale-[0.98]"
          >
            <Mail className="h-4 w-4" /> Contact Child Safety
          </a>
        </div>
      </main>
    </div>
  );
}
