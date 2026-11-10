import { CATEGORY_LABELS, type HazardCategory } from "./demo-hazards";

/**
 * How hazards look and read on screen (docs/DESIGN.md sections 4, 5 and 7).
 * Presentation only: nothing here changes a stored report, review or road.
 */

export type SeverityKey = "suspected_closure" | "partial_obstruction" | "caution" | "unknown";
export type Severity = { key: SeverityKey; label: string; solid: string; tint: string; text: string; glyph: string; rank: number };

/** Severity colours are for hazards only, never for buttons or headings. */
export const SEVERITY: Record<SeverityKey, Severity> = {
  suspected_closure: { key: "suspected_closure", label: "Possibly closed", solid: "#B42318", tint: "#FCEBE8", text: "#8F1C13", glyph: "#FFFFFF", rank: 3 },
  partial_obstruction: { key: "partial_obstruction", label: "Partly blocked", solid: "#B9480F", tint: "#FDEEE3", text: "#8A3509", glyph: "#FFFFFF", rank: 2 },
  caution: { key: "caution", label: "Take care", solid: "#F2B42C", tint: "#FDF4DC", text: "#7A5100", glyph: "#0F1513", rank: 1 },
  unknown: { key: "unknown", label: "Not sure", solid: "#68716C", tint: "#ECEDEA", text: "#47504B", glyph: "#FFFFFF", rank: 0 },
};

/** Maps a stored `impact` value to its severity; anything unexpected reads as "Not sure". */
export function severityOf(impact: string | null | undefined): Severity {
  return Object.prototype.hasOwnProperty.call(SEVERITY, impact ?? "") ? SEVERITY[impact as SeverityKey] : SEVERITY.unknown;
}

/** The most severe of several impacts (used for incident groups). */
export function highestSeverity(impacts: readonly (string | null | undefined)[]): Severity {
  return impacts.map(severityOf).reduce((top, next) => (next.rank > top.rank ? next : top), SEVERITY.unknown);
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as HazardCategory] ?? category.replaceAll("_", " ");
}

/** Review state of a single report, worded for operators. */
export type ReviewStateView = { label: string; needsReview: boolean; markerFill: "outlined" | "solid" };
export function reviewStateOf(reviewState: string): ReviewStateView {
  if (reviewState === "unverified") return { label: "Needs review", needsReview: true, markerFill: "outlined" };
  if (reviewState === "corroborated") return { label: "Approved", needsReview: false, markerFill: "solid" };
  if (reviewState === "rejected") return { label: "Rejected", needsReview: false, markerFill: "outlined" };
  return { label: "Unknown", needsReview: false, markerFill: "outlined" };
}

/** Incident group status, worded for operators. */
export function incidentStatusLabel(status: string): string {
  if (status === "under_review") return "Under review";
  if (status === "corroborated") return "Corroborated";
  if (status === "resolved") return "Resolved";
  return status.replaceAll("_", " ");
}

/** Lifecycle track: Received → Being checked → Confirmed / Could not confirm → Resolved. */
export const LIFECYCLE_STEPS = ["Received", "Being checked", "Confirmed", "Resolved"] as const;
export type LifecycleView = { current: number; labels: string[] };
export function lifecycleOf(reviewState: string, incidentStatus?: string | null): LifecycleView {
  const labels: string[] = [...LIFECYCLE_STEPS];
  if (reviewState === "rejected") {
    labels[2] = "Could not confirm";
    return { current: 2, labels };
  }
  if (incidentStatus === "resolved") return { current: 3, labels };
  if (reviewState === "corroborated") return { current: 2, labels };
  return { current: 1, labels };
}

/** Compact age for lists: "now", "7m", "1h 35m", "3d". */
export function formatAge(createdAt: string, now: number = Date.now()): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return "";
  const minutes = Math.max(0, Math.floor((now - created) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Longer age for sentences: "Reported 7 min ago". */
export function formatAgeLong(createdAt: string, now: number = Date.now()): string {
  const short = formatAge(createdAt, now);
  if (!short) return "";
  if (short === "now") return "just now";
  return short.replace(/(\d+)m$/, "$1 min").replace(/^(\d+)h$/, "$1 h").replace(/^(\d+)d$/, (_, d) => (d === "1" ? "1 day" : `${d} days`)) + " ago";
}
