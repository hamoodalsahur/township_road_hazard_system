"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { InfoIcon, XIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HazardMarker from "@/components/hazards/HazardMarker";
import { ClosureChip, ClosureSwatch } from "./ClosureLines";
import { useServiceArea } from "@/hooks/useServiceArea";
import { loadRoads } from "@/lib/road-loader";
import type { RoadFeature } from "@/lib/bbr-roads";
import { candidateRoads, type RoadCandidate } from "@/lib/v2-road-candidates";
import { categoryLabel } from "@/lib/hazard-presentation";
import {
  CLOSURE_KIND_LABELS, MAX_CLOSURE_ROADS, endChoices, residentLine, roadNames, untilLabel, type ClosureKind,
} from "@/lib/road-closures";

const PickerMap = dynamic(() => import("./ClosurePickerMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

/** Where a closure comes from: an approved report or an open incident group. */
export type ClosureSource = {
  kind: "report" | "incident";
  id: string;
  title: string;
  summary: string;
  category: string;
  impact: string;
  /** Report positions, [longitude, latitude]. */
  points: [number, number][];
};

export const NEARBY_METRES = 250;
const seg = (on: boolean) => "inline-flex min-h-10 items-center rounded-full border px-4 text-small font-medium transition-colors " +
  (on ? "border-night bg-night text-white" : "border-slate-300 bg-white text-slate-900 hover:border-slate-400");
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/**
 * "Close roads" (roadmap 5.1, mockup closures-operator.png): pick roads near the report on the map,
 * how they are closed, until when, and a reason. Nothing is saved until "Close N roads".
 */
export default function CloseRoadsDialog({ open, onOpenChange, source, operatorKey, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ClosureSource;
  operatorKey: string;
  onDone?: () => void;
}) {
  const { data: serviceArea, loaded } = useServiceArea();
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<ClosureKind>("closed");
  const [choice, setChoice] = useState<number | "custom">(1);
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open || !loaded) return;
    let live = true;
    setNow(new Date()); setSelected([]); setKind("closed"); setChoice(1); setCustom(""); setReason(""); setError("");
    void loadRoads(serviceArea.area.id).then(result => { if (live) setRoads(result); });
    return () => { live = false; };
  }, [open, loaded, serviceArea.area.id, source.id]);

  // Roads within 250 m of any report in the source, nearest first.
  const candidates = useMemo(() => {
    if (!roads) return [];
    const best = new Map<string, RoadCandidate>();
    for (const point of source.points) for (const c of candidateRoads(point, roads, NEARBY_METRES, 40)) {
      const prior = best.get(c.id);
      if (!prior || c.distanceMetres < prior.distanceMetres) best.set(c.id, c);
    }
    return [...best.values()].sort((a, b) => a.distanceMetres - b.distanceMetres);
  }, [roads, source.points]);
  const byId = useMemo(() => new Map(candidates.map(c => [c.id, c])), [candidates]);
  const candidateRoadsOnMap = useMemo(() => (roads ?? []).filter(r => byId.has(r.properties.id)), [roads, byId]);

  const choices = useMemo(() => endChoices(now), [now]);
  const endsAt = choice === "custom" ? (custom ? new Date(custom) : null) : choices[choice].at;
  const names = selected.map(id => byId.get(id)?.name ?? "Road");
  const reasonOk = reason.trim().length >= 8 && reason.length <= 400;
  const canSave = selected.length > 0 && !!endsAt && Number.isFinite(endsAt.getTime()) && reasonOk && !busy;
  const preview = selected.length && endsAt && Number.isFinite(endsAt.getTime())
    ? residentLine({ title: roadNames(names), kind, endsAt: endsAt.toISOString(), categoryLabel: categoryLabel(source.category) }, now) : null;

  function toggle(id: string) {
    setError("");
    setSelected(list => list.includes(id) ? list.filter(x => x !== id) : list.length >= MAX_CLOSURE_ROADS ? list : [...list, id]);
  }

  async function save() {
    if (!canSave || !endsAt) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v2/closures", {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey },
        body: JSON.stringify({ [source.kind === "report" ? "reportId" : "incidentId"]: source.id, wayIds: selected, kind, endsAt: endsAt.toISOString(), reason }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The closure was not saved");
      window.dispatchEvent(new Event("township-closures-updated"));
      onDone?.();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The closure was not saved");
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="close-roads-help"
      className="flex h-[min(860px,calc(100dvh-1rem))] w-[calc(100%-1rem)] max-w-[1240px] flex-col gap-0 overflow-hidden p-0 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] [&>button:last-child]:bg-night [&>button:last-child]:text-night-text [&>button:last-child]:hover:bg-night-raised">
      <div className="relative order-1 h-[34vh] shrink-0 lg:h-auto">
        {open && loaded ? <PickerMap area={serviceArea} points={source.points} category={source.category} impact={source.impact}
          candidates={candidateRoadsOnMap} selected={selected} onToggle={toggle} /> : null}
        <p className="pointer-events-none absolute left-3 right-16 top-3 z-10 flex max-w-lg lg:right-3 items-center gap-2 rounded-xl bg-night/95 px-3 py-2 text-small text-night-text">
          <InfoIcon size={16} className="shrink-0 text-night-mint" aria-hidden="true" />
          {roads === null ? "Loading roads…" : candidates.length ? `Click a road to add or remove it. Blue: roads within ${NEARBY_METRES} m of the report.` : `No road lines within ${NEARBY_METRES} m. Run npm run db:import-roads for this area.`}
        </p>
        <div className="absolute bottom-3 left-3 z-10 hidden items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-caption text-slate-700 sm:flex">
          <span className="inline-flex items-center gap-2"><ClosureSwatch />Will close</span>
          <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-4 rounded-full bg-[#1F5A94]/40" />Nearby road</span>
        </div>
      </div>

      <section className="order-2 flex min-h-0 flex-1 flex-col">
        <div className="bg-night px-5 pb-4 pt-5 text-night-text">
          <DialogTitle className="pr-10 font-display text-title font-semibold">Close roads</DialogTitle>
          <DialogDescription id="close-roads-help" className="mt-1 text-small text-night-muted">Only operators decide this. Residents see it on the map until it ends.</DialogDescription>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-night-edge bg-night-raised px-3 py-2 text-small">
            <HazardMarker category={source.category} impact={source.impact} reviewState="corroborated" size={26} decorative />
            <p className="min-w-0"><strong className="font-semibold">{source.title}</strong>, {source.kind === "report" ? "approved" : "incident group"} · <span className="text-night-muted">{source.summary}</span></p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section aria-labelledby="close-roads-list">
            <h3 id="close-roads-list" className="mb-2 text-small font-semibold text-slate-900">Roads to close ({selected.length})</h3>
            {selected.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-small text-slate-600">Click the blue roads on the map, or add them from the list below.</p> : <ul className="grid gap-1.5">
              {selected.map(id => { const c = byId.get(id); return <li key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <ClosureSwatch /><span className="min-w-0 flex-1"><span className="block truncate text-body font-semibold">{c?.name ?? id}</span>
                  <span className="block text-caption text-slate-600">{c?.highway ?? "road"} · {c?.distanceMetres ?? "?"} m from the report</span></span>
                <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${c?.name ?? id}`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"><XIcon size={16} weight="bold" aria-hidden="true" /></button>
              </li>; })}
            </ul>}
            {/* The same choice without the map, for keyboard and screen reader users. */}
            {candidates.some(c => !selected.includes(c.id)) ? <div className="mt-3">
              <p className="mb-1.5 text-caption font-semibold text-slate-600">Nearest roads</p>
              <div className="flex flex-wrap gap-2">
                {candidates.filter(c => !selected.includes(c.id)).slice(0, 5).map(c => <button key={c.id} type="button" onClick={() => toggle(c.id)} className={seg(false)}>+ {c.name} · {c.distanceMetres} m</button>)}
              </div>
            </div> : null}
          </section>

          <fieldset>
            <legend className="mb-2 text-small font-semibold text-slate-900">How closed</legend>
            <div className="flex flex-wrap gap-2">{(Object.keys(CLOSURE_KIND_LABELS) as ClosureKind[]).map(k =>
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={seg(kind === k)}>{CLOSURE_KIND_LABELS[k]}</button>)}</div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-small font-semibold text-slate-900">Until</legend>
            <div className="flex flex-wrap gap-2">
              {choices.map((c, i) => <button key={c.label} type="button" aria-pressed={choice === i} onClick={() => setChoice(i)} className={seg(choice === i)}>{c.label}</button>)}
              <button type="button" aria-pressed={choice === "custom"} onClick={() => { setChoice("custom"); if (!custom) setCustom(localInput(new Date(now.getTime() + 3 * 3_600_000))); }} className={seg(choice === "custom")}>Pick a time</button>
            </div>
            {choice === "custom" ? <label className="mt-2 block text-small text-slate-700">End time
              <Input type="datetime-local" value={custom} min={localInput(now)} onChange={e => setCustom(e.target.value)} className="mt-1" /></label> : null}
            <p className="mt-2 text-caption text-slate-600">{endsAt && Number.isFinite(endsAt.getTime()) ? `Ends ${untilLabel(endsAt, now).replace("until ", "")}. ` : ""}It stops showing by itself then; you can end or extend it earlier.</p>
          </fieldset>

          <label className="block">
            <span className="mb-2 flex flex-wrap items-baseline gap-x-2 text-small font-semibold text-slate-900">Reason<span className="font-normal text-slate-600">Operators only. At least 8 characters, kept in the audit log.</span></span>
            <Input value={reason} maxLength={400} onChange={e => setReason(e.target.value)} placeholder="For example: contractor barrier confirmed on the photo, both lanes" />
          </label>

          {preview ? <section aria-label="What residents will see">
            <h3 className="mb-2 text-small font-semibold text-slate-900">Residents will see</h3>
            <div className="rounded-xl bg-slate-100 px-3 py-3"><ClosureChip label={CLOSURE_KIND_LABELS[kind]} /><p className="mt-2 text-small text-slate-900">{preview}</p></div>
          </section> : null}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          {error ? <p role="alert" className="mb-2 text-small font-medium text-[#A8321F]">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" className="h-12 w-28" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button className="h-12 flex-1 bg-[#B42318] text-white hover:bg-[#8F1C13]" onClick={() => void save()} disabled={!canSave}>
              {busy ? "Saving…" : selected.length === 0 ? "Choose roads to close" : `Close ${selected.length} ${selected.length === 1 ? "road" : "roads"}`}
            </Button>
          </div>
        </div>
      </section>
    </DialogContent>
  </Dialog>;
}
