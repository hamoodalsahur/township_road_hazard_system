"use client";

import { legendFor, type PinPoint } from "@/lib/map-platform";

/** Legend for the reports currently on screen only (roadmap 3.2). Residents and operators use different words. */
export default function MapLegend({ visible, audience, className = "" }: { visible: readonly PinPoint[]; audience: "resident" | "operator"; className?: string }) {
  const legend = legendFor(visible);
  if (legend.severities.length === 0) return <p className={"text-small text-slate-600 " + className}>No reports in this part of the map</p>;
  return <ul aria-label="What the pins on screen mean" className={"flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-slate-700 " + className}>
    {legend.severities.map(severity => <li key={severity.key} className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: severity.solid }} />{severity.label}</li>)}
    {legend.waiting ? <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-[3px] border-slate-900 bg-white" />
      {audience === "resident" ? "Ring: being checked" : "Ring: needs review"}</li> : null}
    {legend.confirmed ? <li className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-slate-900" />
      {audience === "resident" ? "Solid: confirmed" : "Solid: approved"}</li> : null}
  </ul>;
}
