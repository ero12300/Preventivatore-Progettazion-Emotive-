"use client";

import { useEffect, useMemo, useState } from "react";

type Designer = { id: string; full_name: string; email: string };
type PracticeView = {
  id: string;
  reference_code: string;
  status: string;
  booking_link_url: string | null;
  followup_count: number;
  followup_last_sent_at: string | null;
  next_followup_at: string | null;
  followup_last_message: string | null;
  quote_accepted_at: string | null;
  quote_amount: number;
  deposit_amount: number;
  balance_amount: number;
  clients?: { full_name: string; email: string } | null;
  project_designers?: { full_name: string } | null;
};

const defaultForm = {
  reference_code: "",
  full_name: "",
  email: "",
  quote_amount: 0,
  deposit_amount: 0,
  balance_amount: 0,
  square_meters: "",
  assigned_designer_id: "",
};

export default function Home() {
  const [practices, setPractices] = useState<PracticeView[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [followupPreview, setFollowupPreview] = useState<string | null>(null);

  const canCreate = useMemo(
    () => form.reference_code.trim() && form.full_name.trim() && form.email.trim(),
    [form]
  );

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch("/api/practices", { cache: "no-store" }),
        fetch("/api/designers", { cache: "no-store" }),
      ]);
      const pJson = await pRes.json();
      const dJson = await dRes.json();
      if (!pJson.ok) throw new Error(pJson.message || "Errore pratiche.");
      if (!dJson.ok) throw new Error(dJson.message || "Errore progettisti.");
      setPractices(pJson.practices || []);
      setDesigners(dJson.designers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore caricamento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function createPractice() {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_code: form.reference_code,
          client: {
            full_name: form.full_name,
            email: form.email,
          },
          quote_amount: Number(form.quote_amount || 0),
          deposit_amount: Number(form.deposit_amount || 0),
          balance_amount: Number(form.balance_amount || 0),
          square_meters: form.square_meters ? Number(form.square_meters) : undefined,
          assigned_designer_id: form.assigned_designer_id || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Errore creazione pratica.");
      setForm(defaultForm);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore creazione.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    practiceId: string,
    action:
      | "payment-received"
      | "documentation-complete"
      | "send-followup"
      | "quote-accepted"
  ) {
    setError(null);
    const res = await fetch(`/api/practices/${practiceId}/actions/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.message || `Errore azione ${action}.`);
      return;
    }
    if (action === "send-followup" && json.message) {
      setFollowupPreview(
        `${json.message.subject}\n\n${json.message.body}\n\n${json.message.cta}\n\nProssimo follow-up: ${new Date(json.nextFollowupAt).toLocaleString("it-IT")}`
      );
    }
    await loadAll();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">CRM EMOTIVE · Workflow MVP</h1>
        <p className="mt-2 text-sm text-zinc-400">
          CRUD pratica + transizioni: pagamento_ricevuto e documentazione_completa.
        </p>
        {error && <p className="mt-4 rounded bg-red-950/60 px-3 py-2 text-sm text-red-200">{error}</p>}
        {followupPreview && (
          <pre className="mt-4 whitespace-pre-wrap rounded bg-emerald-950/50 px-3 py-3 text-xs text-emerald-200">
            {followupPreview}
          </pre>
        )}

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Nuova pratica
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Riferimento pratica"
              value={form.reference_code}
              onChange={(e) => setForm((s) => ({ ...s, reference_code: e.target.value }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Nome cliente"
              value={form.full_name}
              onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Email cliente"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Importo preventivo"
              type="number"
              value={form.quote_amount}
              onChange={(e) => setForm((s) => ({ ...s, quote_amount: Number(e.target.value || 0) }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Acconto"
              type="number"
              value={form.deposit_amount}
              onChange={(e) => setForm((s) => ({ ...s, deposit_amount: Number(e.target.value || 0) }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Saldo"
              type="number"
              value={form.balance_amount}
              onChange={(e) => setForm((s) => ({ ...s, balance_amount: Number(e.target.value || 0) }))}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Metratura"
              type="number"
              value={form.square_meters}
              onChange={(e) => setForm((s) => ({ ...s, square_meters: e.target.value }))}
            />
            <select
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={form.assigned_designer_id}
              onChange={(e) =>
                setForm((s) => ({ ...s, assigned_designer_id: e.target.value }))
              }
            >
              <option value="">Nessun progettista</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
            <button
              className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={() => void createPractice()}
              disabled={!canCreate || saving}
              type="button"
            >
              {saving ? "Salvataggio..." : "Crea pratica"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Pratiche
          </h2>
          {loading ? (
            <p className="text-sm text-zinc-400">Caricamento...</p>
          ) : practices.length === 0 ? (
            <p className="text-sm text-zinc-400">Nessuna pratica presente.</p>
          ) : (
            <div className="space-y-3">
              {practices.map((practice) => (
                <article key={practice.id} className="rounded border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {practice.reference_code} · {practice.clients?.full_name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Stato: <span className="text-amber-400">{practice.status}</span>
                        {" · "}
                        Progettista: {practice.project_designers?.full_name ?? "non assegnato"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Follow-up inviati: {practice.followup_count ?? 0}
                        {practice.next_followup_at
                          ? ` · Prossimo: ${new Date(practice.next_followup_at).toLocaleDateString("it-IT")}`
                          : ""}
                      </p>
                      {practice.booking_link_url && (
                        <a
                          href={practice.booking_link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          Link rilievo (stub)
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40"
                        disabled={practice.status !== "preventivo_inviato"}
                        onClick={() => void runAction(practice.id, "payment-received")}
                      >
                        pagamento_ricevuto
                      </button>
                      <button
                        type="button"
                        className="rounded border border-emerald-700 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-40"
                        disabled={
                          practice.status !== "preventivo_inviato" ||
                          Boolean(practice.quote_accepted_at)
                        }
                        onClick={() => void runAction(practice.id, "send-followup")}
                      >
                        invia follow-up
                      </button>
                      <button
                        type="button"
                        className="rounded border border-sky-700 px-3 py-1 text-xs text-sky-300 hover:bg-sky-900/30 disabled:opacity-40"
                        disabled={
                          practice.status !== "preventivo_inviato" ||
                          Boolean(practice.quote_accepted_at)
                        }
                        onClick={() => void runAction(practice.id, "quote-accepted")}
                      >
                        preventivo accettato
                      </button>
                      <button
                        type="button"
                        className="rounded border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40"
                        disabled={practice.status !== "in_attesa_documenti"}
                        onClick={() => void runAction(practice.id, "documentation-complete")}
                      >
                        documentazione_completa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
