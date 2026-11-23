"use client";

import Link from "next/link";
import { ArrowClockwiseIcon, CheckIcon, HouseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { extraTime, km, minutes, wayHomeText } from "@/lib/routing";
import type { WayHomeState } from "@/hooks/useWayHome";
import { DETOUR_COLOR } from "@/components/maps/RouteLines";
import { untilLabel } from "@/lib/road-closures";

const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** "Your way home" (roadmap 6.4, mockup way-desktop.png): clear, affected with a detour, blocked, or not set up. */
export default function WayHomeCard({ state, onCheck, compact = false }: { state: WayHomeState; onCheck: () => void; compact?: boolean }) {
  const { phase, answer, settings, error } = state;
  if (phase === "loading") return null;
  const from = settings?.start.kind === "place" ? "From your usual starting place" : "From where you are now";
  const shell = "rounded-2xl p-4 shadow-[0_14px_30px_-16px_rgba(14,23,32,.6)] ";
  const actions = <div className="mt-3 flex flex-wrap gap-2">
    <Button variant="secondary" size="sm" onClick={onCheck} disabled={phase === "checking" || phase === "locating"}><ArrowClockwiseIcon size={16} aria-hidden="true" />{phase === "checking" ? "Checking…" : phase === "locating" ? "Finding you…" : answer ? "Check again" : "Check my way home"}</Button>
    <Button asChild variant="secondary" size="sm"><Link href="/resident/home"><HouseIcon size={16} aria-hidden="true" />Change home</Link></Button>
  </div>;

  if (phase === "unset") return <section aria-label="Your way home" className={shell + "border border-slate-200 bg-white"}>
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><HouseIcon size={18} weight="bold" aria-hidden="true" /></span>
      <div><h2 className="font-display text-heading font-semibold">Check your way home</h2>
        {compact ? null : <p className="text-small text-slate-600">Set your home once, then see if a road closure is on your way.</p>}</div>
      <Button asChild size="sm" className="ml-auto"><Link href="/resident/home">Set my home</Link></Button>
    </div>
  </section>;

  if (!answer || phase === "error" || phase === "denied" || phase === "ready" || phase === "locating" || (phase === "checking" && !answer)) {
    return <section aria-label="Your way home" aria-live="polite" className={shell + "border border-slate-200 bg-white"}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100"><HouseIcon size={18} weight="bold" aria-hidden="true" /></span>
        <div><h2 className="font-display text-heading font-semibold">Your way home</h2>
          <p className="text-small text-slate-600">{phase === "checking" ? "Checking the route…" : phase === "locating" ? "Finding where you are…" : error || (settings?.start.kind === "here" ? "Check now to use where you are. Your location is only used for this check." : "")}</p></div>
      </div>
      {actions}
    </section>;
  }

  const text = wayHomeText(answer);
  const ok = answer.status === "clear";
  const note = <p className={"mt-2 text-caption " + (ok ? "text-night-muted" : "text-slate-600")}>{from} · checked {hhmm(answer.checkedAt)} · routes by {answer.provider}</p>;
  if (ok) return <section aria-label="Your way home" aria-live="polite" className={shell + "bg-night text-night-text"}>
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night-mint text-night-on-mint"><CheckIcon size={18} weight="bold" aria-hidden="true" /></span>
      <div><h2 className="font-display text-heading font-semibold">{text.title}</h2><p className="text-small text-night-muted">{text.detail}</p></div>
    </div>
    {compact ? null : <>{note}<div className="mt-3 flex flex-wrap gap-2">
      <Button variant="nightGhost" size="sm" onClick={onCheck} disabled={phase === "checking"}><ArrowClockwiseIcon size={16} aria-hidden="true" />{phase === "checking" ? "Checking…" : "Check again"}</Button>
      <Button asChild variant="nightGhost" size="sm"><Link href="/resident/home"><HouseIcon size={16} aria-hidden="true" />Change home</Link></Button></div></>}
  </section>;

  return <section aria-label="Your way home" aria-live="polite" className={shell + "border border-[#F3C9C2] border-l-[5px] border-l-[#B42318] bg-white"}>
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCEBE8] text-[#B42318]"><WarningCircleIcon size={20} weight="bold" aria-hidden="true" /></span>
      <div className="min-w-0"><h2 className="font-display text-heading font-semibold">{text.title}</h2>
        <p className="text-small text-slate-700">{answer.closures[0] ? `${answer.closures[0].title} is ${answer.closures[0].kindLabel === "One lane only" ? "down to one lane" : "closed"} ${untilLabel(answer.closures[0].endsAt)}${answer.closures.length > 1 ? ` (+${answer.closures.length - 1} more)` : ""}` : ""}</p></div>
    </div>
    {answer.status === "affected" && answer.detour && answer.usual ? <ul className="mt-3 grid gap-1 text-small text-slate-800">
      <li className="flex items-center gap-2"><span aria-hidden="true" className="h-[5px] w-5 rounded-full" style={{ background: DETOUR_COLOR }} />Detour {km(answer.detour.distanceM)}, {minutes(answer.detour.durationS)} min ({extraTime(answer.usual.durationS, answer.detour.durationS)})</li>
      {compact ? null : <li className="flex items-center gap-2"><span aria-hidden="true" className="h-[5px] w-5 rounded-full" style={{ background: "repeating-linear-gradient(90deg,#46525E 0 3px,transparent 3px 7px)" }} />Usual way {km(answer.usual.distanceM)}, {minutes(answer.usual.durationS)} min</li>}
    </ul> : <p className="mt-2 text-small text-slate-700">Try again later, or check the closure in the list.</p>}
    {compact ? null : <>{note}{actions}</>}
  </section>;
}
