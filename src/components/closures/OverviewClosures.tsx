"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClosures } from "@/hooks/useClosures";
import { untilLabel } from "@/lib/road-closures";
import { ClosureChip } from "./ClosureLines";

export const DEFAULT_END_REASON = "Road reopened, checked by the township team";

/**
 * "Roads closed now" on the Overview (24 Nov 2026): the closures residents see right now, each with End.
 * Ending asks for a reason (prefilled) like the Road closures tab, and is audited by the same API.
 */
export default function OverviewClosures({ operatorKey, className }: { operatorKey: string; className?: string }) {
  const { closures, reload } = useClosures();
  const [ending, setEnding] = useState<string | null>(null);
  const [reason, setReason] = useState(DEFAULT_END_REASON);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  const reasonOk = reason.trim().length >= 8 && reason.length <= 400;

  async function end(id: string) {
    if (!reasonOk) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v2/closures/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey }, body: JSON.stringify({ action: "end", reason }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The closure was not ended");
      setEnding(null);
      window.dispatchEvent(new Event("township-closures-updated"));
      reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The closure was not ended"); }
    finally { setBusy(false); }
  }

  return <section className={"rounded-xl border border-slate-200 bg-white p-4 " + (className ?? "")} aria-labelledby="roads-closed-now">
    <div className="mb-1 flex items-center gap-2">
      <h2 id="roads-closed-now" className="font-display text-heading font-semibold text-slate-900">Roads closed now</h2>
      <span className="text-small text-slate-600">What residents see on their map</span>
      <Link href="/management/incidents#road-closures" className="ml-auto text-small font-semibold text-teal-800 hover:underline">All closures</Link>
    </div>
    {closures.length === 0 ? <p className="py-2 text-small text-slate-600">No roads are closed. Close one from an approved report in Incidents.</p> : <ul>
      {closures.map(closure => <li key={closure.id} className="border-t border-slate-100 py-3 first:border-0">
        <div className="flex flex-wrap items-center gap-3">
          <ClosureChip label={closure.kindLabel} />
          <span className="min-w-0 flex-1"><strong className="block truncate text-body font-semibold text-slate-900">{closure.title}</strong>
            <span className="text-caption text-slate-600">Closed {untilLabel(closure.endsAt, now)} · {closure.categoryLabel}</span></span>
          {ending === closure.id ? null : <Button variant="secondary" onClick={() => { setEnding(closure.id); setReason(DEFAULT_END_REASON); setError(""); }}>End…</Button>}
        </div>
        {ending === closure.id ? <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 gap-1 text-small font-semibold text-slate-900" htmlFor={"end-" + closure.id}>
            Reason <span className="font-normal text-slate-600">Operators only, at least 8 characters</span>
            <Input id={"end-" + closure.id} value={reason} maxLength={400} onChange={event => setReason(event.target.value)} />
          </label>
          <Button variant="secondary" onClick={() => setEnding(null)} disabled={busy}>Cancel</Button>
          <Button variant="reject" onClick={() => void end(closure.id)} disabled={!reasonOk || busy}>{busy ? "Ending…" : "End closure"}</Button>
          {error && <p role="alert" className="w-full rounded-lg bg-rose-50 px-3 py-2 text-small text-rose-800">{error}</p>}
        </div> : null}
      </li>)}
    </ul>}
  </section>;
}
