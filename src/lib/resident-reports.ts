/**
 * Resident website (roadmap step 4.3): the words residents see, the three report steps, and
 * "My reports" kept in this browser. Pure helpers with no React, Node or storage access, so the
 * same rules are tested directly (tests/resident-website.test.ts).
 */
import { HAZARD_CATEGORIES, type HazardCategory } from "./demo-hazards";
import { IMPACT_OPTIONS, type HazardImpact } from "./v2-hazard-validation";
import { lifecycleOf } from "./hazard-presentation";

// ---------------------------------------------------------------------------------------------
// Step 1: what did you see?

export const RESIDENT_CATEGORIES: { value: HazardCategory; label: string }[] = [
  { value: "flooding", label: "Flooding" },
  { value: "fallen_tree", label: "Fallen tree" },
  { value: "road_obstruction", label: "Blocked road" },
  { value: "pothole", label: "Pothole" },
  { value: "roadworks", label: "Roadworks" },
  { value: "storm_damage", label: "Storm damage" },
  { value: "other", label: "Something else" },
];

/** "Can cars get through?" Most severe first; "Not sure" last. Labels match the severity chips. */
export const RESIDENT_IMPACTS: { value: HazardImpact; label: string; hint: string }[] = [
  { value: "partial_obstruction", label: "Partly blocked", hint: "Cars can still pass, slowly" },
  { value: "suspected_closure", label: "Possibly closed", hint: "I don't think cars can pass" },
  { value: "caution", label: "Take care", hint: "Passable, but watch out" },
  { value: "unknown", label: "Not sure", hint: "" },
];

export type ReportDraft = {
  category: HazardCategory | null;
  impact: HazardImpact | null;
  /** [longitude, latitude] of the pin, or null before step 2. */
  location: [number, number] | null;
  locationInside: boolean;
  description: string;
};
export const EMPTY_DRAFT: ReportDraft = { category: null, impact: null, location: null, locationInside: false, description: "" };

export const DESCRIPTION_MIN = 8;
export const DESCRIPTION_MAX = 400;

/** What still blocks a step, in the resident's words, or null when the step is complete. */
export function stepProblem(step: 1 | 2 | 3, draft: ReportDraft): string | null {
  if (step === 1) {
    if (!draft.category || !HAZARD_CATEGORIES.includes(draft.category)) return "Choose the type of problem.";
    if (!draft.impact || !IMPACT_OPTIONS.includes(draft.impact)) return "Choose whether cars can get through.";
    return null;
  }
  if (step === 2) {
    if (!draft.location) return "Move the map so the pin sits on the problem.";
    if (!draft.locationInside) return "The pin is outside the area we cover. Move it inside the dashed line.";
    return null;
  }
  const size = draft.description.trim().length;
  if (size < DESCRIPTION_MIN) return `Add a few words (at least ${DESCRIPTION_MIN} characters).`;
  if (draft.description.length > DESCRIPTION_MAX) return `Keep it under ${DESCRIPTION_MAX} characters.`;
  return null;
}

/** The body for POST /api/v2/hazards, or null while any step is incomplete. */
export function submissionBody(draft: ReportDraft) {
  if (stepProblem(1, draft) || stepProblem(2, draft) || stepProblem(3, draft)) return null;
  return { category: draft.category, impact: draft.impact, description: draft.description.trim(), coordinates: draft.location };
}

// ---------------------------------------------------------------------------------------------
// "My reports": ids of reports sent from this browser. Never sent anywhere except as a status lookup.

export const MY_REPORTS_KEY = "laluan.myReports.v1";
export const MY_REPORTS_LIMIT = 50;
export type StoredReport = { id: string; category: string; impact: string; sentAt: string };

/** Report ids are Prisma cuids: lowercase letters and digits. Anything else is ignored. */
export const REPORT_ID_PATTERN = /^[a-z0-9]{20,40}$/;

/** Reads the stored list defensively: bad JSON or bad entries are dropped, never thrown. */
export function parseStoredReports(raw: string | null): StoredReport[] {
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: StoredReport[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { id, category, impact, sentAt } = item as Record<string, unknown>;
    if (typeof id !== "string" || !REPORT_ID_PATTERN.test(id) || seen.has(id)) continue;
    if (typeof sentAt !== "string" || !Number.isFinite(Date.parse(sentAt))) continue;
    seen.add(id);
    out.push({ id, category: typeof category === "string" ? category : "other", impact: typeof impact === "string" ? impact : "unknown", sentAt });
  }
  return out.slice(0, MY_REPORTS_LIMIT);
}

/** Newest first, no duplicates, at most MY_REPORTS_LIMIT entries. */
export function addStoredReport(list: readonly StoredReport[], entry: StoredReport): StoredReport[] {
  return [entry, ...list.filter(item => item.id !== entry.id)].slice(0, MY_REPORTS_LIMIT);
}

/** Validates the ids of GET /api/v2/hazards/status?ids=a,b,c. Returns null when the list is unusable. */
export function parseStatusIds(param: string | null): string[] | null {
  if (!param) return null;
  const ids = [...new Set(param.split(",").map(id => id.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > MY_REPORTS_LIMIT || !ids.every(id => REPORT_ID_PATTERN.test(id))) return null;
  return ids;
}

/** Public status of one report: never the operator's note, description or photo. */
export type PublicReportStatus = { id: string; reviewState: string; incidentStatus: string | null; updatedAt: string };

/** One line under the lifecycle track, in the resident's words (DESIGN.md "report lifecycle track"). */
export function residentStatusLine(status: PublicReportStatus | null | undefined): string {
  if (!status) return "Not found. It may have been removed from this demo.";
  if (status.reviewState === "rejected") return "Could not confirm. It is not shown on the map.";
  if (status.incidentStatus === "resolved") return "Resolved. The township team has closed it.";
  if (status.reviewState === "corroborated") return "Confirmed. Shown on the map for everyone.";
  return "Being checked by the township team.";
}

/** Lifecycle for the resident: same steps as operators see, "Could not confirm" for rejected. */
export function residentLifecycle(status: PublicReportStatus | null | undefined) {
  if (!status) return { current: 0, labels: ["Received", "Being checked", "Confirmed", "Resolved"], rejected: false };
  return { ...lifecycleOf(status.reviewState, status.incidentStatus), rejected: status.reviewState === "rejected" };
}

/** Review state as residents read it on the map list. */
export function residentStateLabel(reviewState: string): string {
  return reviewState === "corroborated" ? "Confirmed" : "Being checked";
}

const DAY = 86_400_000;
/** "Sent today 16:13", "Sent yesterday", "Sent Thursday" (within a week), else "Sent 12 Nov". Local time. */
export function sentLabel(sentAt: string, now: Date = new Date()): string {
  const at = new Date(sentAt);
  if (!Number.isFinite(at.getTime())) return "Sent";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(at)) / DAY);
  if (days <= 0) return `Sent today ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
  if (days === 1) return "Sent yesterday";
  if (days < 7) return `Sent ${at.toLocaleDateString("en-GB", { weekday: "long" })}`;
  return `Sent ${at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/** "7 min ago", "1 h ago", "Yesterday", "3 days ago": for the public map list. */
export function agoLabel(createdAt: string, now: number = Date.now()): string {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return "";
  const minutes = Math.max(0, Math.floor((now - t) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
