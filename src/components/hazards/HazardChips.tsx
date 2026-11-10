"use client";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { LIFECYCLE_STEPS, lifecycleOf, reviewStateOf, severityOf } from "@/lib/hazard-presentation";

const chip = "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold leading-none";

/** Severity chip: hazard colour on its tint. Only ever used for hazards. */
export function SeverityChip({ impact }: { impact: string }) {
  const s = severityOf(impact);
  return <span className={chip} style={{ background: s.tint, color: s.text }}>
    <span aria-hidden="true" className="h-2 w-2 rounded-[3px]" style={{ background: s.solid }} />{s.label}
  </span>;
}

/** Review chip in ink, never green: "Needs review" is outlined, decided states are filled grey. */
export function ReviewStateChip({ reviewState }: { reviewState: string }) {
  const state = reviewStateOf(reviewState);
  if (state.needsReview) {
    return <span className={chip + " border-[1.5px] border-slate-900 bg-white text-slate-900"}>
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-[2.5px] border-slate-900" />{state.label}
    </span>;
  }
  const Icon = reviewState === "rejected" ? XIcon : CheckIcon;
  return <span className={chip + " bg-slate-100 text-slate-900"}><Icon size={13} weight="bold" aria-hidden="true" />{state.label}</span>;
}

/** Plain status chip for incident groups. */
export function StatusChip({ children }: { children: string }) {
  return <span className={chip + " bg-slate-100 text-slate-900"}>{children}</span>;
}

/** Lifecycle track: Received → Being checked → Confirmed / Could not confirm → Resolved. */
export function LifecycleTrack({ reviewState, incidentStatus }: { reviewState: string; incidentStatus?: string | null }) {
  const { current, labels } = lifecycleOf(reviewState, incidentStatus);
  return <ol aria-label="Report progress" className="grid grid-cols-4">
    {LIFECYCLE_STEPS.map((_, index) => {
      const done = index < current, now = index === current;
      return <li key={index} aria-current={now ? "step" : undefined} className="relative">
        {index < LIFECYCLE_STEPS.length - 1
          ? <span aria-hidden="true" className={"absolute left-2.5 right-0 top-[9px] h-[2px] " + (index < current ? "bg-slate-900" : "bg-slate-200")} />
          : null}
        <span aria-hidden="true" className={"relative flex h-5 w-5 items-center justify-center rounded-full " +
          (done ? "bg-slate-900" : now ? "border-2 border-slate-900 bg-white" : "border-2 border-slate-200 bg-white")}>
          {done ? <CheckIcon size={11} weight="bold" color="#FFFFFF" /> : now ? <span className="h-2 w-2 rounded-full bg-slate-900" /> : null}
        </span>
        <span className={"mt-1.5 block pr-2 text-[13px] leading-[18px] " + (now ? "font-semibold text-slate-900" : done ? "text-slate-900" : "text-slate-500")}>
          {labels[index]}{done ? <span className="sr-only"> (done)</span> : now ? <span className="sr-only"> (current step)</span> : null}
        </span>
      </li>;
    })}
  </ol>;
}
