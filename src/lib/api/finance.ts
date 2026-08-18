// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export type Account = {
  id: string; user_id: string; name: string; kind: string;
  balance: number; currency: string; color: string | null; icon: string | null;
  created_at: string; updated_at: string;
};
export type Transaction = {
  id: string; user_id: string; account_id: string | null;
  kind: "income" | "expense"; amount: number; currency: string;
  category: string; note: string | null; receipt_url: string | null;
  occurred_at: string; meta: Record<string, unknown>;
  created_at: string; updated_at: string;
};
export type Budget = {
  id: string; user_id: string; category: string; amount: number;
  currency: string; month: string; created_at: string; updated_at: string;
};
export type Goal = {
  id: string; user_id: string; title: string; target_amount: number;
  saved_amount: number; currency: string; target_date: string | null;
  color: string | null; icon: string | null; created_at: string; updated_at: string;
};
export type Bill = {
  id: string; user_id: string; title: string; kind: "bill" | "emi" | "subscription";
  amount: number; currency: string; next_due: string | null; cadence: string;
  category: string; autopay: boolean; provider: string | null; url: string | null;
  reminder_days: number; active: boolean; created_at: string; updated_at: string;
};
export type Split = {
  id: string; user_id: string; title: string; total_amount: number; currency: string;
  participants: Array<{ name: string; share: number; paid?: boolean }>;
  payer: string | null; settled: boolean; note: string | null;
  occurred_at: string; created_at: string; updated_at: string;
};

export const CATEGORIES = [
  { key: "food", label: "Food", emoji: "🍔" },
  { key: "shopping", label: "Shopping", emoji: "🛍️" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "entertainment", label: "Fun", emoji: "🎬" },
  { key: "health", label: "Health", emoji: "🩺" },
  { key: "education", label: "Learn", emoji: "📚" },
  { key: "bills", label: "Bills", emoji: "🧾" },
  { key: "transport", label: "Transport", emoji: "🚗" },
  { key: "groceries", label: "Groceries", emoji: "🛒" },
  { key: "rent", label: "Rent", emoji: "🏠" },
  { key: "gifts", label: "Gifts", emoji: "🎁" },
  { key: "other", label: "Other", emoji: "✨" },
] as const;

export const categoryMeta = (k: string) =>
  CATEGORIES.find((c) => c.key === k) ?? { key: k, label: k, emoji: "✨" };

// ---- Accounts
export async function listAccounts(userId: string) {
  const { data } = await sb.from("finance_accounts").select("*").eq("user_id", userId).order("created_at");
  return (data as Account[]) ?? [];
}
export async function saveAccount(a: Partial<Account> & { user_id: string; name: string }) {
  const { data, error } = await sb.from("finance_accounts").insert(a).select().single();
  if (error) throw error;
  return data as Account;
}
export async function updateAccount(id: string, patch: Partial<Account>) {
  await sb.from("finance_accounts").update(patch).eq("id", id);
}
export async function deleteAccount(id: string) {
  await sb.from("finance_accounts").delete().eq("id", id);
}

// ---- Transactions
export async function listTransactions(userId: string, limit = 200) {
  const { data } = await sb.from("finance_transactions").select("*")
    .eq("user_id", userId).order("occurred_at", { ascending: false }).limit(limit);
  return (data as Transaction[]) ?? [];
}
export async function addTransaction(t: Partial<Transaction> & { user_id: string; kind: "income" | "expense"; amount: number }) {
  const { data, error } = await sb.from("finance_transactions").insert(t).select().single();
  if (error) throw error;
  return data as Transaction;
}
export async function deleteTransaction(id: string) {
  await sb.from("finance_transactions").delete().eq("id", id);
}

// ---- Budgets
export async function listBudgets(userId: string, month: string) {
  const { data } = await sb.from("finance_budgets").select("*")
    .eq("user_id", userId).eq("month", month);
  return (data as Budget[]) ?? [];
}
export async function upsertBudget(b: { user_id: string; category: string; amount: number; currency: string; month: string }) {
  const { data, error } = await sb.from("finance_budgets").upsert(b, { onConflict: "user_id,category,month" }).select().single();
  if (error) throw error;
  return data as Budget;
}
export async function deleteBudget(id: string) {
  await sb.from("finance_budgets").delete().eq("id", id);
}

// ---- Goals
export async function listGoals(userId: string) {
  const { data } = await sb.from("finance_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data as Goal[]) ?? [];
}
export async function saveGoal(g: Partial<Goal> & { user_id: string; title: string; target_amount: number }) {
  const { data, error } = await sb.from("finance_goals").insert(g).select().single();
  if (error) throw error;
  return data as Goal;
}
export async function updateGoal(id: string, patch: Partial<Goal>) {
  await sb.from("finance_goals").update(patch).eq("id", id);
}
export async function deleteGoal(id: string) {
  await sb.from("finance_goals").delete().eq("id", id);
}

// ---- Bills / subscriptions
export async function listBills(userId: string, kind?: Bill["kind"]) {
  let q = sb.from("finance_bills").select("*").eq("user_id", userId).order("next_due", { ascending: true });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data as Bill[]) ?? [];
}
export async function saveBill(b: Partial<Bill> & { user_id: string; title: string; amount: number }) {
  const { data, error } = await sb.from("finance_bills").insert(b).select().single();
  if (error) throw error;
  return data as Bill;
}
export async function updateBill(id: string, patch: Partial<Bill>) {
  await sb.from("finance_bills").update(patch).eq("id", id);
}
export async function deleteBill(id: string) {
  await sb.from("finance_bills").delete().eq("id", id);
}

// ---- Splits
export async function listSplits(userId: string) {
  const { data } = await sb.from("finance_splits").select("*").eq("user_id", userId).order("occurred_at", { ascending: false });
  return (data as Split[]) ?? [];
}
export async function saveSplit(s: Partial<Split> & { user_id: string; title: string; total_amount: number }) {
  const { data, error } = await sb.from("finance_splits").insert(s).select().single();
  if (error) throw error;
  return data as Split;
}
export async function updateSplit(id: string, patch: Partial<Split>) {
  await sb.from("finance_splits").update(patch).eq("id", id);
}
export async function deleteSplit(id: string) {
  await sb.from("finance_splits").delete().eq("id", id);
}

// ---- Analytics helpers
export function currentMonth(d = new Date()) {
  return d.toISOString().slice(0, 7);
}
export function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency", currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function summarize(tx: Transaction[], month: string) {
  const inMonth = tx.filter((t) => t.occurred_at.slice(0, 7) === month);
  const income = inMonth.filter((t) => t.kind === "income").reduce((a, b) => a + Number(b.amount), 0);
  const expense = inMonth.filter((t) => t.kind === "expense").reduce((a, b) => a + Number(b.amount), 0);
  const byCat: Record<string, number> = {};
  inMonth.filter((t) => t.kind === "expense").forEach((t) => {
    byCat[t.category] = (byCat[t.category] ?? 0) + Number(t.amount);
  });
  return { income, expense, net: income - expense, byCat, count: inMonth.length };
}

export function healthScore(income: number, expense: number, savings: number, budgetUsage: number) {
  const savingsRate = income > 0 ? (income - expense) / income : 0;
  const budgetOk = 1 - Math.min(1, budgetUsage);
  const savedBonus = Math.min(1, savings / Math.max(1, income));
  return Math.round(Math.max(0, Math.min(1, savingsRate * 0.55 + budgetOk * 0.3 + savedBonus * 0.15)) * 100);
}

// ---- Currency conversion (simple, offline seed rates; user can refresh)
export const BASE_RATES: Record<string, number> = {
  USD: 1, INR: 83.2, EUR: 0.92, GBP: 0.78, AED: 3.67, JPY: 155.2, AUD: 1.5, CAD: 1.36, SGD: 1.34, CNY: 7.24,
};
export function convert(amount: number, from: string, to: string, rates = BASE_RATES) {
  if (from === to) return amount;
  const f = rates[from], t = rates[to];
  if (!f || !t) return amount;
  return (amount / f) * t;
}

// ---- CSV export
export function toCSV(rows: Transaction[]) {
  const head = ["date", "kind", "amount", "currency", "category", "note"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([
      r.occurred_at.slice(0, 10),
      r.kind,
      r.amount,
      r.currency,
      r.category,
      (r.note ?? "").replace(/[\n,"]/g, " "),
    ].join(","));
  }
  return lines.join("\n");
}
