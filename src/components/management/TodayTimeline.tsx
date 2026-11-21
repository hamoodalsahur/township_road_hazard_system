"use client";
import HazardMarker from "@/components/hazards/HazardMarker";
import { categoryLabel, reviewStateOf } from "@/lib/hazard-presentation";
import { clockTime, timelineHours, timelinePosition, timelineTicks } from "@/lib/overview-today";

export type TimelineReport = { id: string; category: string; impact: string; reviewState: string; createdAt: string };

/**
 * Today's reports on one line, in the navy Overview header (Night Desk).
 * Each report is a small pin at the time it came in. Hovering or focusing one shows what it is;
 * choosing it selects it on the Overview (cards and map). Rejected reports are shown but cannot be
 * chosen, because they are no longer on the map. The list is every report received today.
 */
export default function TodayTimeline({ reports, since, now, selectedId, onSelect, compact = false }: {
  reports: readonly TimelineReport[];
  since: number;
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const range = timelineHours([...reports.map(r => r.createdAt), new Date(now).toISOString()], since);
  const ticks = timelineTicks(range, compact ? 4 : 2);
  const nowAt = timelinePosition(now, since, range);
  const tickAt = (hour: number) => ((hour - range.from) / (range.to - range.from)) * 100;
  return <div className="px-3 sm:px-6">
    <div className="relative h-16" role="group" aria-label={`Reports received today: ${reports.length}`}>
      <div aria-hidden="true" className="absolute inset-x-0 top-8 h-[2px] bg-night-edge" />
      {ticks.map(tick => <span key={tick.hour} aria-hidden="true" className={"absolute top-10 -translate-x-1/2 text-caption text-night-subtle tabular-nums " + (tick.hour % 4 === 0 ? "hidden sm:block" : "")} style={{ left: `${tickAt(tick.hour)}%` }}>{tick.label}</span>)}
      {nowAt !== null ? <div aria-hidden="true" className="absolute top-2 h-7 w-[2px] bg-night-mint" style={{ left: `${nowAt}%` }}>
        {compact ? null : <span className="absolute -top-1 left-2 text-caption font-semibold text-night-mint">Now</span>}
      </div> : null}
      {reports.map(report => {
        const left = timelinePosition(report.createdAt, since, range);
        if (left === null) return null;
        const state = reviewStateOf(report.reviewState);
        const label = `${clockTime(report.createdAt)} ${categoryLabel(report.category)}`;
        // Near the ends the label opens inwards, so it never runs off the screen.
        const align = left > 80 ? "right-0" : left < 20 ? "left-0" : "left-1/2 -translate-x-1/2";
        const tip = <span role="tooltip" className={"pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap " + align + " rounded-lg bg-white px-3 py-2 text-left shadow-lg group-hover:block group-focus-visible:block"}>
          <span className="block text-small font-semibold text-slate-900">{label}</span>
          <span className="block text-caption text-slate-600">{state.label}{report.reviewState === "rejected" ? "" : ". Select to show it below"}</span>
        </span>;
        const pin = <HazardMarker category={report.category} impact={report.impact} reviewState={report.reviewState} selected={report.id === selectedId} size={22} decorative />;
        const place = "group absolute top-0 -translate-x-1/2 rounded-md";
        return report.reviewState === "rejected"
          ? <span key={report.id} tabIndex={0} aria-label={`${label}, ${state.label}`} className={place + " opacity-60"} style={{ left: `${left}%` }}>{pin}{tip}</span>
          : <button key={report.id} type="button" onClick={() => onSelect(report.id)} aria-pressed={report.id === selectedId} aria-label={`${label}, ${state.label}`} className={place} style={{ left: `${left}%` }}>{pin}{tip}</button>;
      })}
    </div>
  </div>;
}
