"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon, CaretLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClosureChip } from "./ClosureLines";
import { categoryLabel } from "@/lib/hazard-presentation";
import {
  CLOSURE_KIND_LABELS, closureState, endChoices, publicClosure, residentLine, timeLeftLabel, untilLabel, type ClosureKind, type ClosureState,
} from "@/lib/road-closures";

const ClosureMap = dynamic(() => import("./ClosureDetailMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

export type OperatorClosure = {
  id: string; kind: string; reason: string; startsAt: string; endsAt: string; endedAt: string | null; endReason: string | null;
  category: string; createdAt: string; title: string;
  roads: { wayId: string; name: string; coordinates: unknown }[];
  source: { kind: "report" | "incident"; id: string; label: string };
  history: { action: string; detail: string; createdAt: string }[];
};

const STATE_TONE: Record<ClosureState, string> = { active: "text-slate-900", upcoming: "text-[#1F5A94]", past_end: "text-[#A8321F]", ended: "text-slate-600" };
const ACTION_WORDS: Record<string, string> = { v2_road_closure_created: "Closed", v2_road_closure_ended: "Ended", v2_road_closure_extended: "End time changed" };
/** "today 17:56", "tomorrow 09:00", "Fri 18:30". */
const clock = (iso: string, now: Date = new Date()) => untilLabel(iso, now).replace("until ", "").replace(/^(\d)/, "today $1");
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/**
 * Incidents → Road closures (roadmap 5.1, mockup closures-operator.png): active, upcoming and recently ended
 * closures, with end and extend. Closures whose end time passed are flagged; residents no longer see them.
 */
export default function RoadClosuresPanel({ operatorKey, onCountsChange }: { operatorKey: string; onCountsChange?: (active: number | null) => void }) {
  const [closures, setClosures] = useState<OperatorClosure[] | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneDetail, setPhoneDetail] = useState(false);
  const [reason, setReason] = useState("");
  const [extending, setExtending] = useState(false);
  const [newEnd, setNewEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const reload = useCallback(async () => {
    setError(""); setNow(new Date());
    try {
      const response = await fetch("/api/v2/closures", { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" });
      const data = await response.json() as { closures?: OperatorClosure[]; error?: string };
      if (!response.ok || !data.closures) throw new Error(data.error ?? "Road closures could not be loaded");
      setClosures(data.closures);
      setSelectedId(old => data.closures!.some(c => c.id === old) ? old : data.closures![0]?.id ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Road closures could not be loaded"); setClosures(c => c ?? []); }
  }, [operatorKey]);
  useEffect(() => {
    void reload();
    const listener = () => void reload();
    window.addEventListener("township-closures-updated", listener);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { window.removeEventListener("township-closures-updated", listener); window.clearInterval(timer); };
  }, [reload]);

  const withState = useMemo(() => (closures ?? []).map(c => ({ ...c, state: closureState(c, now) })), [closures, now]);
  const open = withState.filter(c => c.state !== "ended");
  const ended = withState.filter(c => c.state === "ended");
  const active = withState.filter(c => c.state === "active").length;
  useEffect(() => { onCountsChange?.(closures === null ? null : active); }, [active, closures, onCountsChange]);
  const selected = withState.find(c => c.id === selectedId) ?? null;
  useEffect(() => { setReason(""); setExtending(false); setActionError(""); setNewEnd(""); }, [selectedId]);

  async function change(action: "end" | "extend") {
    if (!selected) return;
    setBusy(true); setActionError("");
    try {
      const body = action === "end" ? { action, reason } : { action, reason, endsAt: new Date(newEnd).toISOString() };
      const response = await fetch(`/api/v2/closures/${encodeURIComponent(selected.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Not saved");
      window.dispatchEvent(new Event("township-closures-updated"));
      setReason(""); setExtending(false);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Not saved"); }
    finally { setBusy(false); }
  }

  const card = (c: (typeof withState)[number]) => {
    const on = c.id === selectedId;
    return <li key={c.id}><button type="button" aria-pressed={on} onClick={() => { setSelectedId(c.id); setPhoneDetail(true); }}
      className={"block w-full rounded-xl border bg-white px-4 py-3 text-left transition-colors " + (on ? "border-night shadow-[inset_3px_0_0_#0E1720]" : "border-slate-200 hover:border-slate-300") + (c.state === "ended" ? " opacity-80" : "")}>
      <span className="flex items-center gap-2">
        {c.state === "ended" ? <span className="inline-flex h-[26px] items-center rounded-full bg-slate-100 px-2.5 text-small font-medium text-slate-700">Ended</span> : <ClosureChip label={CLOSURE_KIND_LABELS[c.kind as ClosureKind] ?? "Closed"} />}
        <span className={"ml-auto text-small font-semibold " + STATE_TONE[c.state]}>{timeLeftLabel(c, now)}</span>
      </span>
      <span className="mt-2 block text-body font-semibold text-slate-900">{c.title}</span>
      <span className="mt-0.5 block truncate text-small text-slate-600">From {c.source.kind === "report" ? categoryLabel(c.category).toLowerCase() + " report" : "group: " + c.source.label} · {clock(c.createdAt, now)}</span>
    </button></li>;
  };

  const reasonOk = reason.trim().length >= 8 && reason.length <= 400;
  const pub = selected ? publicClosure({ ...selected, roads: selected.roads }) : null;

  return <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
    <section aria-label="Road closures" className={phoneDetail && selected ? "hidden xl:block" : ""}>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-small text-slate-600">{closures === null ? "Loading…" : `${active} active · ${open.length - active} upcoming or past end time · ${ended.length} ended this week`}</p>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void reload()}><ArrowClockwiseIcon size={16} aria-hidden="true" />Refresh</Button>
      </div>
      {error ? <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-small text-rose-800">{error}</p> : null}
      {closures && closures.length === 0 && !error ? <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-body font-semibold">No road closures</p>
        <p className="mt-1 text-small text-slate-600">To close a road, open an approved report or an incident group and choose “Close roads”.</p>
      </div> : null}
      {open.length ? <><h2 className="mb-2 text-small font-semibold text-slate-600">Active and upcoming</h2><ul className="grid gap-2">{open.map(card)}</ul></> : null}
      {ended.length ? <><h2 className="mb-2 mt-5 text-small font-semibold text-slate-600">Ended (last 7 days)</h2><ul className="grid gap-2">{ended.map(card)}</ul></> : null}
    </section>

    {selected && pub ? <section aria-label="Selected closure" className={"flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white " + (phoneDetail ? "" : "hidden xl:flex")}>
      <div className="px-5 pt-5 sm:px-6">
        <button type="button" onClick={() => setPhoneDetail(false)} className="mb-3 inline-flex items-center gap-1 text-small font-medium text-[#0B7350] xl:hidden"><CaretLeftIcon size={14} aria-hidden="true" />All closures</button>
        <div className="flex flex-wrap items-center gap-2">
          {selected.state === "ended" ? null : <ClosureChip label={pub.kindLabel} />}
          <span className={"inline-flex h-[26px] items-center rounded-full px-2.5 text-small font-medium " + (selected.state === "active" ? "bg-[#F1F8F4] text-[#0B5A3F]" : "bg-slate-100 text-slate-700")}>
            {selected.state === "active" ? "Shown to residents" : selected.state === "upcoming" ? "Not shown yet" : selected.state === "past_end" ? "End time passed: no longer shown" : "Ended"}</span>
        </div>
        <h2 className="mt-3 font-display text-title font-semibold text-slate-900">{selected.title}</h2>
      </div>
      <div className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative h-64 overflow-hidden rounded-xl lg:h-72"><ClosureMap closure={pub} /></div>
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] content-start gap-x-3 gap-y-2 text-small">
          <dt className="text-slate-600">Started</dt><dd className="font-medium">{clock(selected.startsAt, now)}</dd>
          <dt className="text-slate-600">{selected.state === "ended" ? "Ended" : "Ends"}</dt><dd className="font-medium">{selected.state === "ended" ? clock(selected.endedAt!, now) : `${clock(selected.endsAt, now)} (${timeLeftLabel(selected, now).toLowerCase()})`}</dd>
          <dt className="text-slate-600">From</dt><dd className="font-medium">{selected.source.kind === "report" ? `${categoryLabel(selected.category)} report: ${selected.source.label}` : `Incident group: ${selected.source.label}`}</dd>
          <dt className="text-slate-600">Reason</dt><dd className="font-medium">{selected.reason}</dd>
          {selected.endReason ? <><dt className="text-slate-600">Why ended</dt><dd className="font-medium">{selected.endReason}</dd></> : null}
          <dt className="text-slate-600">Residents see</dt><dd className="font-medium">“{residentLine(pub, now)}”</dd>
        </dl>
      </div>
      {selected.history.length ? <ol aria-label="History" className="mx-5 mb-4 grid gap-1.5 text-small text-slate-700 sm:mx-6">
        {selected.history.map((h, i) => <li key={i} className="flex gap-3"><span className="w-28 shrink-0 font-semibold text-slate-900">{clock(h.createdAt, now)}</span>
          <span>{ACTION_WORDS[h.action] ?? h.action} by OP{/reason: (.*)$/.exec(h.detail)?.[1] ? <>: <span className="text-slate-900">{/reason: (.*)$/.exec(h.detail)![1]}</span></> : null}</span></li>)}
      </ol> : null}
      {selected.state !== "ended" ? <div className="mt-auto border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        {extending ? <div className="mb-3">
          <p className="mb-2 text-small font-semibold text-slate-900">New end time</p>
          <div className="flex flex-wrap gap-2">{endChoices(now).map(c => <button key={c.label} type="button" onClick={() => setNewEnd(localInput(c.at))}
            className={"inline-flex min-h-10 items-center rounded-full border px-4 text-small font-medium " + (newEnd === localInput(c.at) ? "border-night bg-night text-white" : "border-slate-300 bg-white")}>{c.label} from now</button>)}</div>
          <Input type="datetime-local" value={newEnd} min={localInput(now)} onChange={e => setNewEnd(e.target.value)} className="mt-2 max-w-xs" aria-label="New end time" />
          {newEnd ? <p className="mt-1 text-caption text-slate-600">New end: {untilLabel(new Date(newEnd), now).replace("until ", "")}</p> : null}
        </div> : null}
        <label htmlFor="closure-reason" className="mb-2 block text-small font-semibold text-slate-900">Reason for ending or extending <span className="font-normal text-slate-600">Required, at least 8 characters</span></label>
        <div className="flex flex-wrap gap-2">
          <Input id="closure-reason" value={reason} maxLength={400} onChange={e => setReason(e.target.value)} placeholder="For example: water has drained, road reopened" className="min-w-[220px] flex-1" />
          {extending
            ? <><Button variant="secondary" onClick={() => setExtending(false)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void change("extend")} disabled={busy || !reasonOk || !newEnd}>{busy ? "Saving…" : "Save new end time"}</Button></>
            : <><Button variant="secondary" onClick={() => setExtending(true)} disabled={busy}>Extend…</Button>
                <Button onClick={() => void change("end")} disabled={busy || !reasonOk}>{busy ? "Saving…" : "End closure now"}</Button></>}
        </div>
        {actionError ? <p role="alert" className="mt-2 text-small text-[#A8321F]">{actionError}</p> : null}
      </div> : null}
    </section> : null}
  </div>;
}
