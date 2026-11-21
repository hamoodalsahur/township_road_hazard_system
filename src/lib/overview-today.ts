/**
 * Overview, Night Desk (roadmap 4.2b): the header, today's timeline and the shift log.
 * Pure helpers so wording, counting and positions can be tested without a browser.
 * "Today" is the operator's local day, measured from local midnight.
 */
import { categoryLabel } from "./hazard-presentation";

const HOUR = 60 * 60 * 1000;

/**
 * The `?since=` value the Overview sends to /api/v2/incident-oversight (the operator's local midnight).
 * Read-only. It must be a valid time within the last two days, so the API never lists the whole history.
 */
export function parseSince(value: string | null, now: number = Date.now()): Date | null {
  if (!value) return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at) || at > now || now - at > 48 * HOUR) return null;
  return new Date(at);
}

/** Local midnight at the start of the day that contains `now`. */
export function startOfLocalDay(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** Main header line: "3 reports need review", or the all-clear. */
export function reviewHeadline(waiting: number): string {
  if (waiting <= 0) return "Nothing waiting for review";
  return `${waiting} ${waiting === 1 ? "report needs" : "reports need"} review`;
}

/** "Saturday 21 November, 16:20" in the operator's own clock. */
export function dateLine(now: number): string {
  const date = new Date(now);
  const day = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

/** When the oldest waiting report came in, in words: "since 14:45", "since yesterday", "since Thursday". */
export function waitingSince(createdAt: string, now: number): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return "";
  const today = startOfLocalDay(now);
  if (created >= today) {
    return "since " + new Date(created).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (created >= today - 24 * HOUR) return "since yesterday";
  if (created >= today - 6 * 24 * HOUR) return "since " + new Date(created).toLocaleDateString("en-GB", { weekday: "long" });
  return "since " + new Date(created).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export type AuditLike = { id: string; action: string; subjectId: string; detail: string; createdAt: string };

/** What an audit entry means for the shift log, or null if it is not shown there. */
export function auditKind(entry: Pick<AuditLike, "action" | "detail">): "approved" | "rejected" | "grouped" | null {
  if (entry.action === "v2_demo_hazard_review") {
    if (/^Decision: corroborated/.test(entry.detail)) return "approved";
    if (/^Decision: rejected/.test(entry.detail)) return "rejected";
    return null;
  }
  if (entry.action === "v2_demo_incident_created") return "grouped";
  return null;
}

/** Decisions made since `since` (local midnight), counted from the audit log. */
export function decisionsSince(entries: readonly AuditLike[], since: number) {
  let approved = 0, rejected = 0;
  for (const entry of entries) {
    if ((Date.parse(entry.createdAt) || 0) < since) continue;
    const kind = auditKind(entry);
    if (kind === "approved") approved += 1;
    if (kind === "rejected") rejected += 1;
  }
  return { approved, rejected };
}

/** "Today: 5 received, 2 approved, 1 rejected." */
export function todayLine(counts: { received: number | null; approved: number; rejected: number }): string {
  const parts = [
    ...(counts.received === null ? [] : [`${counts.received} received`]),
    `${counts.approved} approved`,
    `${counts.rejected} rejected`,
  ];
  return `Today: ${parts.join(", ")}`;
}

export type LogReport = { id: string; category: string; createdAt: string };
export type ShiftLogItem = { key: string; at: string; kind: "new" | "approved" | "rejected" | "grouped"; title: string; detail: string; reportId: string | null };

const KIND_TITLE: Record<ShiftLogItem["kind"], string> = { new: "New report", approved: "Approved", rejected: "Rejected", grouped: "Group opened" };

/**
 * The shift log: new reports (from the report feed) and decisions (from the audit log), newest first.
 * Rejected reports are not in the public feed, so their category may be unknown; they read as "a report".
 */
export function shiftLog(reports: readonly LogReport[], entries: readonly AuditLike[], limit = 4): ShiftLogItem[] {
  const byId = new Map(reports.map(report => [report.id, report]));
  const items: ShiftLogItem[] = reports.map(report => ({
    key: `new-${report.id}`, at: report.createdAt, kind: "new", title: KIND_TITLE.new, detail: categoryLabel(report.category), reportId: report.id,
  }));
  for (const entry of entries) {
    const kind = auditKind(entry);
    if (!kind) continue;
    const report = byId.get(entry.subjectId);
    items.push({
      key: `audit-${entry.id}`, at: entry.createdAt, kind, title: KIND_TITLE[kind],
      detail: kind === "grouped" ? "A new incident group" : report ? categoryLabel(report.category) : "A report",
      reportId: kind === "grouped" ? null : entry.subjectId,
    });
  }
  return items.sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0)).slice(0, limit);
}

/**
 * The hours the timeline covers: 06:00 to 22:00, stretched to fit any report outside that.
 * Returns whole hours from local midnight.
 */
export function timelineHours(times: readonly string[], since: number): { from: number; to: number } {
  let from = 6, to = 22;
  for (const time of times) {
    const hours = ((Date.parse(time) || since) - since) / HOUR;
    if (hours < 0 || hours >= 24) continue;
    from = Math.min(from, Math.floor(hours));
    to = Math.max(to, Math.ceil(hours + 0.01));
  }
  return { from, to: Math.min(24, to) };
}

/** Where a time sits on the timeline, from 0 to 100 (per cent of its width). Null when outside it. */
export function timelinePosition(time: string | number, since: number, range: { from: number; to: number }): number | null {
  const at = typeof time === "number" ? time : Date.parse(time);
  if (!Number.isFinite(at)) return null;
  const hours = (at - since) / HOUR;
  if (hours < range.from || hours > range.to) return null;
  return ((hours - range.from) / (range.to - range.from)) * 100;
}

/** Hour labels for the timeline: every `step` hours, as "06:00". */
export function timelineTicks(range: { from: number; to: number }, step = 2): { hour: number; label: string }[] {
  const ticks: { hour: number; label: string }[] = [];
  for (let hour = Math.ceil(range.from / step) * step; hour <= range.to; hour += step) {
    ticks.push({ hour, label: `${String(hour % 24).padStart(2, "0")}:00` });
  }
  return ticks;
}

/** Short time of day, "14:45". */
export function clockTime(time: string): string {
  const at = Date.parse(time);
  if (!Number.isFinite(at)) return "";
  return new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
