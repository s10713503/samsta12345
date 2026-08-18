import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Wallet, TrendingUp, TrendingDown, PieChart as PieIcon, Target, Bell,
  Repeat, Users, ScanLine, RefreshCw, Download, Plus, Trash2, Sparkles, Bot, Send,
  Calendar, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import {
  type Account, type Transaction, type Budget, type Goal, type Bill, type Split,
  CATEGORIES, categoryMeta,
  listAccounts, saveAccount, deleteAccount,
  listTransactions, addTransaction, deleteTransaction,
  listBudgets, upsertBudget,
  listGoals, saveGoal, updateGoal, deleteGoal,
  listBills, saveBill, updateBill, deleteBill,
  listSplits, saveSplit, updateSplit, deleteSplit,
  currentMonth, fmtMoney, summarize, healthScore, convert, BASE_RATES, toCSV,
} from "@/lib/api/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance")({
  component: FinanceHub,
  head: () => ({
    meta: [
      { title: "Simple Finance · Samsta" },
      { name: "description", content: "Track income, expenses, budgets, bills and savings goals — with premium Samsta design." },
    ],
  }),
});

type Tab = "overview" | "transactions" | "budgets" | "goals" | "bills" | "splits" | "tools" | "assistant";

function FinanceHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (!loading && user && !isPremium) navigate({ to: "/premium" }); }, [loading, user, isPremium, navigate]);

  if (loading || !user) return <div className="min-h-screen animate-pulse bg-background" />;

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "overview", label: "Overview", icon: <Wallet className="h-3.5 w-3.5" /> },
    { k: "transactions", label: "Activity", icon: <Repeat className="h-3.5 w-3.5" /> },
    { k: "budgets", label: "Budgets", icon: <PieIcon className="h-3.5 w-3.5" /> },
    { k: "goals", label: "Goals", icon: <Target className="h-3.5 w-3.5" /> },
    { k: "bills", label: "Bills", icon: <Bell className="h-3.5 w-3.5" /> },
    { k: "splits", label: "Splits", icon: <Users className="h-3.5 w-3.5" /> },
    { k: "tools", label: "Tools", icon: <ScanLine className="h-3.5 w-3.5" /> },
    { k: "assistant", label: "Coach", icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen pb-28">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] opacity-70"
        style={{ background: "radial-gradient(60% 60% at 20% 10%, oklch(0.86 0.09 150 / 0.5), transparent 60%), radial-gradient(50% 50% at 90% 10%, oklch(0.82 0.13 20 / 0.35), transparent 60%)" }} />

      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic">Simple Finance</div>
          <div className="text-[11px] text-muted-foreground">Everyday money, calmly organized</div>
        </div>
        <div className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px]">
          <Sparkles className="h-3.5 w-3.5" /> Premium
        </div>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
        {tabs.map((t) => {
          const on = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition",
                on ? "bg-foreground text-background" : "glass")}>
              {t.icon}{t.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-2">
        {tab === "overview" && <OverviewTab userId={user.id} />}
        {tab === "transactions" && <TransactionsTab userId={user.id} />}
        {tab === "budgets" && <BudgetsTab userId={user.id} />}
        {tab === "goals" && <GoalsTab userId={user.id} />}
        {tab === "bills" && <BillsTab userId={user.id} />}
        {tab === "splits" && <SplitsTab userId={user.id} />}
        {tab === "tools" && <ToolsTab userId={user.id} />}
        {tab === "assistant" && <CoachTab userId={user.id} />}
      </div>
    </div>
  );
}

// ---------- Overview ----------
function OverviewTab({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tx, setTx] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [showAddAcct, setShowAddAcct] = useState(false);
  const month = currentMonth();

  const load = async () => {
    const [a, t, b, g, bi] = await Promise.all([
      listAccounts(userId), listTransactions(userId), listBudgets(userId, month),
      listGoals(userId), listBills(userId),
    ]);
    setAccounts(a); setTx(t); setBudgets(b); setGoals(g); setBills(bi);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const s = summarize(tx, month);
  const budgetTotal = budgets.reduce((a, b) => a + Number(b.amount), 0);
  const budgetUsage = budgetTotal > 0 ? Math.min(1, s.expense / budgetTotal) : 0;
  const savedTotal = goals.reduce((a, g) => a + Number(g.saved_amount), 0);
  const score = healthScore(s.income, s.expense, savedTotal, budgetUsage);
  const upcoming = bills.filter((b) => b.next_due && new Date(b.next_due).getTime() < Date.now() + 14 * 86400000)
    .sort((a, b) => (a.next_due! < b.next_due! ? -1 : 1)).slice(0, 3);

  const currency = accounts[0]?.currency ?? "INR";

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5 animate-fade-up">
        <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-70 blur-3xl animate-aurora"
          style={{ background: "oklch(0.88 0.14 150)" }} />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Total balance</div>
          <div className="mt-1 font-display text-4xl italic">{fmtMoney(totalBalance, currency)}</div>
          <div className="mt-3 flex gap-4 text-xs">
            <div className="inline-flex items-center gap-1 text-emerald-500"><TrendingUp className="h-3.5 w-3.5" /> {fmtMoney(s.income, currency)}</div>
            <div className="inline-flex items-center gap-1 text-rose-500"><TrendingDown className="h-3.5 w-3.5" /> {fmtMoney(s.expense, currency)}</div>
            <div className="text-muted-foreground">Net {fmtMoney(s.net, currency)}</div>
          </div>
        </div>
      </div>

      {/* Health score ring */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard score={score} />
        <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">This month</div>
          <div className="mt-1 font-display text-2xl italic">{s.count} txns</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, budgetUsage * 100)}%`,
                background: budgetUsage > 0.9 ? "linear-gradient(90deg, oklch(0.72 0.2 25), oklch(0.65 0.22 15))"
                  : "linear-gradient(90deg, oklch(0.82 0.13 150), oklch(0.78 0.14 170))" }} />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {budgetTotal > 0 ? `${Math.round(budgetUsage * 100)}% of ${fmtMoney(budgetTotal, currency)}` : "No budget set"}
          </div>
        </div>
      </div>

      {/* Category donut */}
      <CategoryChart byCat={s.byCat} total={s.expense} currency={currency} />

      {/* Accounts */}
      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="font-display text-base italic">Wallets & cash</div>
          <button onClick={() => setShowAddAcct(true)}
            className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {accounts.length === 0 && (
            <div className="glass w-full rounded-3xl p-4 text-center text-xs text-muted-foreground">
              No wallet yet — add cash, bank or UPI wallet.
            </div>
          )}
          {accounts.map((a, i) => (
            <div key={a.id} className="glass min-w-[180px] relative overflow-hidden rounded-3xl p-4 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}>
              <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl"
                style={{ background: a.color ?? "oklch(0.86 0.09 150)" }} />
              <div className="relative">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.kind}</div>
                <div className="mt-0.5 truncate font-display text-lg italic">{a.name}</div>
                <div className="mt-1 text-sm font-medium">{fmtMoney(Number(a.balance), a.currency)}</div>
                <button onClick={async () => { await deleteAccount(a.id); void load(); }}
                  className="absolute -right-1 -top-1 rounded-full p-1 text-muted-foreground hover:text-rose-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming bills */}
      <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="font-display text-base italic">Upcoming bills</div>
          <span className="text-[10px] text-muted-foreground">Next 14 days</span>
        </div>
        <div className="space-y-2">
          {upcoming.length === 0 && (
            <div className="glass rounded-3xl p-4 text-center text-xs text-muted-foreground">Nothing due soon 🎉</div>
          )}
          {upcoming.map((b) => (
            <div key={b.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.78 0.11 40))" }}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{b.title}</div>
                <div className="text-[10px] text-muted-foreground">{b.next_due} · {b.cadence}</div>
              </div>
              <div className="text-sm font-medium">{fmtMoney(Number(b.amount), b.currency)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="font-display text-base italic">Recent activity</div>
        </div>
        <div className="space-y-2">
          {tx.slice(0, 5).map((t) => <TxRow key={t.id} t={t} onDel={async () => { await deleteTransaction(t.id); void load(); }} />)}
          {tx.length === 0 && <div className="glass rounded-3xl p-4 text-center text-xs text-muted-foreground">Add your first income or expense in Activity.</div>}
        </div>
      </div>

      {showAddAcct && <AddAccountSheet userId={userId} onClose={() => { setShowAddAcct(false); void load(); }} />}
    </div>
  );
}

function ScoreCard({ score }: { score: number }) {
  const hue = score >= 70 ? 150 : score >= 40 ? 65 : 20;
  const circ = 2 * Math.PI * 30;
  const off = circ - (score / 100) * circ;
  return (
    <div className="glass-strong relative flex items-center gap-3 rounded-3xl p-4 animate-fade-up">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" stroke="currentColor" strokeOpacity="0.1" strokeWidth="8" fill="none" />
        <circle cx="40" cy="40" r="30" stroke={`oklch(0.72 0.18 ${hue})`} strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="40" y="46" textAnchor="middle" className="font-display" fontSize="22" fill="currentColor" fontStyle="italic">{score}</text>
      </svg>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Health</div>
        <div className="font-display text-base italic">
          {score >= 70 ? "Thriving" : score >= 40 ? "Steady" : "Watch out"}
        </div>
        <div className="text-[10px] text-muted-foreground">Savings + budget + goals</div>
      </div>
    </div>
  );
}

function CategoryChart({ byCat, total, currency }: { byCat: Record<string, number>; total: number; currency: string }) {
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="glass rounded-3xl p-4 text-center text-xs text-muted-foreground animate-fade-up">
        <PieIcon className="mx-auto mb-1 h-4 w-4" /> Add expenses to see spending breakdown
      </div>
    );
  }
  let cum = 0;
  const palette = ["oklch(0.78 0.14 25)", "oklch(0.82 0.12 55)", "oklch(0.78 0.13 150)", "oklch(0.75 0.14 250)", "oklch(0.78 0.14 310)", "oklch(0.72 0.13 200)", "oklch(0.8 0.11 85)"];
  const R = 50;
  const C = 2 * Math.PI * R;
  return (
    <div className="glass-strong rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "40ms" }}>
      <div className="flex items-center gap-4">
        <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
          <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="18" />
          {entries.map(([k, v], i) => {
            const frac = v / total;
            const len = frac * C;
            const dashOffset = -cum;
            cum += len;
            return (
              <circle key={k} cx="70" cy="70" r={R} fill="none"
                stroke={palette[i % palette.length]} strokeWidth="18"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)" style={{ transition: "all 0.6s ease" }} />
            );
          })}
          <text x="70" y="66" textAnchor="middle" className="font-display" fontSize="10" fill="currentColor" opacity="0.6">Spent</text>
          <text x="70" y="82" textAnchor="middle" className="font-display" fontSize="14" fill="currentColor" fontStyle="italic">{fmtMoney(total, currency)}</text>
        </svg>
        <div className="min-w-0 flex-1 space-y-1.5">
          {entries.slice(0, 5).map(([k, v], i) => {
            const m = categoryMeta(k);
            return (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: palette[i % palette.length] }} />
                <span>{m.emoji}</span>
                <span className="flex-1 truncate">{m.label}</span>
                <span className="text-muted-foreground">{Math.round((v / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TxRow({ t, onDel }: { t: Transaction; onDel: () => void }) {
  const m = categoryMeta(t.category);
  const isIncome = t.kind === "income";
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
        style={{ background: isIncome ? "oklch(0.94 0.06 150)" : "oklch(0.95 0.05 25)" }}>
        {m.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{t.note || m.label}</div>
        <div className="text-[10px] text-muted-foreground">{new Date(t.occurred_at).toLocaleDateString()} · {m.label}</div>
      </div>
      <div className={cn("text-sm font-semibold", isIncome ? "text-emerald-500" : "text-rose-500")}>
        {isIncome ? "+" : "−"}{fmtMoney(Number(t.amount), t.currency)}
      </div>
      <button onClick={onDel} className="text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// ---------- Transactions ----------
function TransactionsTab({ userId }: { userId: string }) {
  const [tx, setTx] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const load = async () => {
    const [t, a] = await Promise.all([listTransactions(userId), listAccounts(userId)]);
    setTx(t); setAccounts(a);
    if (!account && a[0]) setAccount(a[0].id);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const currency = accounts.find((a) => a.id === account)?.currency ?? "INR";

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("Enter an amount");
    await addTransaction({
      user_id: userId, kind, amount: n, currency,
      category: kind === "income" ? "other" : category,
      note: note || null, account_id: account || null,
    });
    setAmount(""); setNote("");
    toast.success("Added");
    void load();
  };

  const filtered = filter === "all" ? tx : tx.filter((t) => t.kind === filter);

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <div className="mb-3 flex gap-2">
          {(["expense", "income"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={cn("flex-1 rounded-full px-3 py-2 text-xs font-medium transition",
                kind === k ? "text-white shadow-md" : "glass")}
              style={kind === k ? {
                background: k === "income"
                  ? "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.72 0.15 170))"
                  : "linear-gradient(135deg, oklch(0.78 0.14 25), oklch(0.72 0.15 15))",
              } : undefined}>
              {k === "income" ? "+ Income" : "− Expense"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-display italic text-muted-foreground">{currency === "INR" ? "₹" : "$"}</div>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0" className="flex-1 bg-transparent font-display text-3xl italic outline-none" />
        </div>
        {kind === "expense" && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition",
                  category === c.key ? "bg-foreground text-background" : "glass")}>
                <span>{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
            className="glass rounded-2xl bg-transparent px-3 py-2 text-xs outline-none" />
          <select value={account} onChange={(e) => setAccount(e.target.value)}
            className="glass rounded-2xl bg-transparent px-3 py-2 text-xs outline-none">
            <option value="">No wallet</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button onClick={submit}
          className="mt-3 w-full rounded-full py-2.5 text-sm font-medium text-white shadow-md active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
          Save
        </button>
      </div>

      {/* Filter + list */}
      <div className="flex gap-2">
        {(["all", "income", "expense"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-full px-3.5 py-1.5 text-xs transition", filter === f ? "bg-foreground text-background" : "glass")}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((t) => (
          <TxRow key={t.id} t={t} onDel={async () => { await deleteTransaction(t.id); void load(); }} />
        ))}
        {filtered.length === 0 && <div className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">Nothing yet</div>}
      </div>
    </div>
  );
}

// ---------- Budgets ----------
function BudgetsTab({ userId }: { userId: string }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [tx, setTx] = useState<Transaction[]>([]);
  const month = currentMonth();
  const load = async () => {
    const [b, t] = await Promise.all([listBudgets(userId, month), listTransactions(userId)]);
    setBudgets(b); setTx(t);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const s = summarize(tx, month);
  const currency = budgets[0]?.currency ?? "INR";

  const setBudget = async (category: string, amount: number) => {
    await upsertBudget({ user_id: userId, category, amount, currency, month });
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Monthly budget · {month}</div>
        <div className="mt-1 font-display text-2xl italic">Set caps per category</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Sam warns when you cross 80% so nothing sneaks up on you.
        </p>
      </div>
      {CATEGORIES.filter((c) => c.key !== "other").map((c, i) => {
        const b = budgets.find((x) => x.category === c.key);
        const cap = b ? Number(b.amount) : 0;
        const spent = s.byCat[c.key] ?? 0;
        const pct = cap > 0 ? Math.min(1, spent / cap) : 0;
        const over = cap > 0 && spent > cap;
        return (
          <div key={c.key} className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center gap-2">
              <div className="text-lg">{c.emoji}</div>
              <div className="flex-1 font-display italic">{c.label}</div>
              <input type="number" defaultValue={cap || ""} placeholder="Cap"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v > 0) void setBudget(c.key, v);
                }}
                className="glass w-24 rounded-full bg-transparent px-3 py-1 text-right text-xs outline-none" />
            </div>
            {cap > 0 && (
              <>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full transition-all" style={{
                    width: `${pct * 100}%`,
                    background: over ? "linear-gradient(90deg, oklch(0.72 0.2 25), oklch(0.65 0.22 15))"
                      : pct > 0.8 ? "linear-gradient(90deg, oklch(0.85 0.14 70), oklch(0.8 0.16 50))"
                      : "linear-gradient(90deg, oklch(0.82 0.13 150), oklch(0.78 0.14 170))",
                  }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{fmtMoney(spent, currency)} spent</span>
                  <span>{fmtMoney(Math.max(0, cap - spent), currency)} left</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Goals ----------
function GoalsTab({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const load = async () => setGoals(await listGoals(userId));
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const create = async () => {
    if (!title || !Number(target)) return toast.error("Title & target amount");
    await saveGoal({ user_id: userId, title, target_amount: Number(target), target_date: date || null, currency: "INR" });
    setTitle(""); setTarget(""); setDate("");
    void load();
  };

  const addSaving = async (g: Goal, amt: number) => {
    await updateGoal(g.id, { saved_amount: Number(g.saved_amount) + amt });
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <div className="font-display text-lg italic">New savings goal</div>
        <div className="mt-2 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Iceland trip"
            className="glass w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="Target"
              className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
              className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <button onClick={create}
            className="w-full rounded-full py-2.5 text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.75 0.13 200))" }}>
            Create goal
          </button>
        </div>
      </div>

      {goals.map((g, i) => {
        const pct = Math.min(1, Number(g.saved_amount) / Number(g.target_amount));
        return (
          <div key={g.id} className="glass relative overflow-hidden rounded-3xl p-4 animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
              style={{ background: g.color ?? "oklch(0.9 0.11 200)" }} />
            <div className="relative flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.75 0.13 200))" }}>
                <Target className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-display italic">{g.title}</div>
                  <button onClick={async () => { await deleteGoal(g.id); void load(); }} className="text-muted-foreground hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full transition-all"
                    style={{ width: `${pct * 100}%`, background: "linear-gradient(90deg, oklch(0.82 0.13 150), oklch(0.78 0.14 200))" }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{fmtMoney(Number(g.saved_amount), g.currency)} of {fmtMoney(Number(g.target_amount), g.currency)}</span>
                  <span>{Math.round(pct * 100)}%</span>
                </div>
                {g.target_date && <div className="mt-1 text-[10px] text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{g.target_date}</div>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[100, 500, 1000, 5000].map((v) => (
                    <button key={v} onClick={() => addSaving(g, v)}
                      className="glass rounded-full px-2.5 py-1 text-[11px]">+{v}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {goals.length === 0 && <div className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">No goals yet — dream a little.</div>}
    </div>
  );
}

// ---------- Bills / subscriptions ----------
function BillsTab({ userId }: { userId: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [tab, setTab] = useState<Bill["kind"] | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const load = async () => setBills(await listBills(userId));
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const filtered = tab === "all" ? bills : bills.filter((b) => b.kind === tab);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(["all", "bill", "emi", "subscription"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("rounded-full px-3 py-1.5 text-xs capitalize transition",
              tab === k ? "bg-foreground text-background" : "glass")}>
            {k === "all" ? "All" : k}
          </button>
        ))}
        <button onClick={() => setShowAdd(true)}
          className="ml-auto glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {filtered.map((b, i) => {
        const days = b.next_due ? Math.ceil((new Date(b.next_due).getTime() - Date.now()) / 86400000) : null;
        return (
          <div key={b.id} className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                style={{ background: b.kind === "subscription"
                  ? "linear-gradient(135deg, oklch(0.78 0.11 290), oklch(0.75 0.13 320))"
                  : b.kind === "emi"
                    ? "linear-gradient(135deg, oklch(0.78 0.14 25), oklch(0.72 0.15 15))"
                    : "linear-gradient(135deg, oklch(0.82 0.13 55), oklch(0.78 0.14 40))" }}>
                {b.kind === "subscription" ? <Repeat className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm">{b.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {b.cadence} · {b.next_due ?? "no date"}
                  {days !== null && days >= 0 && ` · in ${days}d`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{fmtMoney(Number(b.amount), b.currency)}</div>
                <button onClick={async () => {
                  await updateBill(b.id, { active: !b.active });
                  void load();
                }} className="text-[10px] text-muted-foreground">
                  {b.active ? "Active" : "Paused"}
                </button>
              </div>
              <button onClick={async () => { await deleteBill(b.id); void load(); }} className="text-muted-foreground hover:text-rose-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">Nothing scheduled</div>}

      {showAdd && <AddBillSheet userId={userId} onClose={() => { setShowAdd(false); void load(); }} />}
    </div>
  );
}

function AddBillSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<Bill["kind"]>("bill");
  const [nextDue, setNextDue] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const submit = async () => {
    if (!title || !Number(amount)) return toast.error("Title & amount");
    await saveBill({
      user_id: userId, title, amount: Number(amount), kind,
      next_due: nextDue || null, cadence, currency: "INR",
    });
    toast.success("Saved");
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Add bill / EMI / subscription">
      <div className="space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Netflix, Home loan)"
          className="glass w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount"
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <input value={nextDue} onChange={(e) => setNextDue(e.target.value)} type="date"
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as Bill["kind"])}
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none">
            <option value="bill">Bill</option>
            <option value="emi">EMI</option>
            <option value="subscription">Subscription</option>
          </select>
          <select value={cadence} onChange={(e) => setCadence(e.target.value)}
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none">
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
            <option value="once">Once</option>
          </select>
        </div>
        <button onClick={submit}
          className="w-full rounded-full py-2.5 text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

function AddAccountSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("wallet");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("INR");
  const submit = async () => {
    if (!name) return toast.error("Name required");
    await saveAccount({ user_id: userId, name, kind, balance: Number(balance) || 0, currency });
    toast.success("Wallet added");
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Add wallet or cash">
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Cash, HDFC, UPI)"
          className="glass w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-3 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)}
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none">
            <option value="wallet">Wallet</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
          </select>
          <input value={balance} onChange={(e) => setBalance(e.target.value)} type="number" placeholder="Balance"
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none">
            {Object.keys(BASE_RATES).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={submit}
          className="w-full rounded-full py-2.5 text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
          Save
        </button>
      </div>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="mb-3 font-display text-lg italic">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ---------- Splits ----------
function SplitsTab({ userId }: { userId: string }) {
  const [splits, setSplits] = useState<Split[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [people, setPeople] = useState("You, Alex, Sam");

  const load = async () => setSplits(await listSplits(userId));
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const create = async () => {
    const names = people.split(",").map((n) => n.trim()).filter(Boolean);
    const total = Number(amount);
    if (!title || !total || names.length < 2) return toast.error("Title, amount & 2+ people");
    const share = Math.round((total / names.length) * 100) / 100;
    await saveSplit({
      user_id: userId, title, total_amount: total, currency: "INR",
      participants: names.map((n) => ({ name: n, share, paid: false })),
      payer: names[0],
    });
    setTitle(""); setAmount("");
    void load();
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <div className="font-display text-lg italic">Split an expense</div>
        <div className="mt-2 space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Goa dinner"
            className="glass w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Total"
              className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
            <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Comma-separated names"
              className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <button onClick={create}
            className="w-full rounded-full py-2.5 text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            Split evenly
          </button>
        </div>
      </div>

      {splits.map((s, i) => (
        <div key={s.id} className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-display italic">{s.title}</div>
            <div className="text-sm font-medium">{fmtMoney(Number(s.total_amount), s.currency)}</div>
            <button onClick={async () => { await deleteSplit(s.id); void load(); }} className="text-muted-foreground hover:text-rose-500">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-1.5">
            {s.participants.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-medium">
                  {p.name[0]?.toUpperCase()}
                </span>
                <span className="flex-1">{p.name}</span>
                <span className="text-muted-foreground">{fmtMoney(p.share, s.currency)}</span>
                <button
                  onClick={async () => {
                    const next = s.participants.map((x, i2) => i2 === idx ? { ...x, paid: !x.paid } : x);
                    await updateSplit(s.id, { participants: next, settled: next.every((n) => n.paid) });
                    void load();
                  }}
                  className={cn("rounded-full px-2 py-0.5 text-[10px]",
                    p.paid ? "bg-emerald-500/20 text-emerald-600" : "glass")}>
                  {p.paid ? "Paid" : "Owes"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {splits.length === 0 && <div className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">No splits yet</div>}
    </div>
  );
}

// ---------- Tools: receipt scan, currency, export ----------
function ToolsTab({ userId }: { userId: string }) {
  return (
    <div className="space-y-3">
      <ReceiptScanner userId={userId} />
      <CurrencyConverter />
      <ExportCard userId={userId} />
    </div>
  );
}

function ReceiptScanner({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ amount: number; category: string; note: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scan = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(r.error);
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      // Direct multimodal call so we can send the image payload
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "finance_receipt",
          messages: [
            { role: "user", content: [
              { type: "text", text: "Read this receipt and return JSON only." },
              { type: "image_url", image_url: { url: b64 } },
            ] },
          ],
        }),
      });
      if (!res.ok || !res.body) throw new Error("scan failed");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let text = "", buf = "";
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
            if (delta) text += delta;
          } catch { /* ignore */ }
        }
      }
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no JSON");
      const parsed = JSON.parse(m[0]);
      setResult({ amount: Number(parsed.amount) || 0, category: parsed.category || "other", note: parsed.note || "" });
    } catch (e) {
      toast.error("Couldn't read receipt");
    } finally { setBusy(false); }
  };

  const saveIt = async () => {
    if (!result) return;
    await addTransaction({
      user_id: userId, kind: "expense", amount: result.amount, currency: "INR",
      category: result.category, note: result.note,
    });
    toast.success("Saved to activity");
    setResult(null);
  };

  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl p-4 animate-fade-up">
      <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
        style={{ background: "oklch(0.9 0.11 250)" }} />
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))" }}>
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-base italic">Smart receipt scanner</div>
          <div className="text-[11px] text-muted-foreground">Snap a bill · Sam reads the total</div>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
          {busy ? "Reading…" : "Scan"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void scan(f); e.target.value = ""; }} />
      </div>
      {result && (
        <div className="relative mt-3 rounded-2xl bg-background/50 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryMeta(result.category).emoji}</span>
            <div className="flex-1">
              <div className="font-medium">{result.note || "Receipt"}</div>
              <div className="text-muted-foreground">{categoryMeta(result.category).label}</div>
            </div>
            <div className="font-display text-lg italic">{fmtMoney(result.amount, "INR")}</div>
          </div>
          <button onClick={saveIt}
            className="mt-2 w-full rounded-full py-2 text-xs font-medium text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.75 0.13 200))" }}>
            Save as expense
          </button>
        </div>
      )}
    </div>
  );
}

function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const result = convert(Number(amount) || 0, from, to);
  return (
    <div className="glass-strong rounded-3xl p-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 55), oklch(0.78 0.14 40))" }}>
          <RefreshCw className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base italic">Currency converter</div>
          <div className="text-[11px] text-muted-foreground">Quick offline rates</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number"
            className="w-full bg-transparent text-lg font-display italic outline-none" />
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent text-xs outline-none">
            {Object.keys(BASE_RATES).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
          <div className="flex-1 truncate text-lg font-display italic">{result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent text-xs outline-none">
            {Object.keys(BASE_RATES).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const download = async (kind: "csv" | "json") => {
    setBusy(true);
    try {
      const tx = await listTransactions(userId, 5000);
      const month = currentMonth();
      const monthly = tx.filter((t) => t.occurred_at.slice(0, 7) === month);
      const content = kind === "csv" ? toCSV(monthly) : JSON.stringify(monthly, null, 2);
      const blob = new Blob([content], { type: kind === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `finance-${month}.${kind}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  };
  return (
    <div className="glass-strong rounded-3xl p-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.72 0.15 170))" }}>
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-base italic">Export monthly report</div>
          <div className="text-[11px] text-muted-foreground">CSV opens in Excel · JSON for backups</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => download("csv")} disabled={busy}
          className="rounded-full py-2 text-xs font-medium text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.14 150), oklch(0.75 0.13 200))" }}>CSV</button>
        <button onClick={() => download("json")} disabled={busy} className="glass rounded-full py-2 text-xs">JSON</button>
      </div>
    </div>
  );
}

// ---------- Coach (AI chat) ----------
function CoachTab({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Hi! I'm Sam — your money coach. Ask me anything about your spending, budgets, or saving ideas." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const [tx, budgets, goals] = await Promise.all([
        listTransactions(userId), listBudgets(userId, currentMonth()), listGoals(userId),
      ]);
      const s = summarize(tx, currentMonth());
      const ctx = `Month: ${currentMonth()}. Income ${s.income}, Expense ${s.expense}. Top categories: ${
        Object.entries(s.byCat).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v]) => `${k}:${v}`).join(", ")
      }. Budgets: ${budgets.map(b => `${b.category}=${b.amount}`).join(", ") || "none"}. Goals: ${goals.map(g => `${g.title} ${g.saved_amount}/${g.target_amount}`).join(", ") || "none"}.`;
      const ctxMsgs: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
        { role: "system", content: `Personal finance context — ${ctx}` },
        ...messages.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];
      await streamSam("finance_coach", ctxMsgs, (full) => {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: full };
          return next;
        });
      });
    } catch { toast.error("Coach unavailable"); }
    finally { setBusy(false); }
  };

  const starters = ["Where can I cut spending?", "Am I on track this month?", "How to save for a trip in 3 months?", "Explain my top category"];

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base italic">Money coach</div>
            <div className="text-[11px] text-muted-foreground">Grounded in your real data</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {starters.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy}
              className="glass rounded-full px-3 py-1 text-[11px]">{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-3xl px-4 py-2.5 text-sm",
            m.role === "user"
              ? "ml-auto text-white"
              : "glass mr-auto")}
            style={m.role === "user" ? { background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" } : undefined}>
            {m.content || <span className="opacity-60">…</span>}
          </div>
        ))}
      </div>

      <div className="glass-strong sticky bottom-4 z-20 flex items-center gap-2 rounded-full p-1.5">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
          placeholder="Ask about your money…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={() => send()} disabled={busy || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
