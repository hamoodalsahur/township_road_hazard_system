/**
 * Road closures (roadmap step 5.1): the rules, the words and the public view. Pure helpers with no
 * database or browser access, shared by the API, the screens and tests/road-closures.test.ts.
 *
 * - Only operators close roads, from an approved report or an open incident group.
 * - Every closure has an end time (at most 14 days ahead). At that time it stops being shown.
 * - Residents see roads, how they are closed, the end time and the report type. Never the reason.
 */
import { categoryLabel } from "./hazard-presentation";

export const CLOSURE_KINDS = ["closed", "one_lane"] as const;
export type ClosureKind = (typeof CLOSURE_KINDS)[number];
export const CLOSURE_KIND_LABELS: Record<ClosureKind, string> = { closed: "Closed to cars", one_lane: "One lane only" };
export const CLOSURE_COLOR = "#B42318"; // the "Possibly closed" severity red

export const MAX_CLOSURE_ROADS = 20;
export const MAX_CLOSURE_DAYS = 14;
export const MIN_CLOSURE_MINUTES = 10;
const WAY_ID = /^osm-way-\d+$/;
const ID = /^[a-z0-9]{20,40}$/;
const DAY = 86_400_000;

function reasonOf(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length < 8 || value.length > 400) throw new Error(`${what} must be 8 to 400 characters`);
  return value.trim();
}
function timeOf(value: unknown, what: string): Date {
  const at = typeof value === "string" ? new Date(value) : null;
  if (!at || !Number.isFinite(at.getTime())) throw new Error(`Invalid ${what}`);
  return at;
}

export type ClosureCreate = {
  source: { kind: "report" | "incident"; id: string };
  wayIds: string[];
  kind: ClosureKind;
  startsAt: Date;
  endsAt: Date;
  reason: string;
};

/** Checks POST /api/v2/closures. Throws a plain-English reason. The server separately checks the source and the roads. */
export function validateClosureCreate(input: unknown, now: Date = new Date()): ClosureCreate {
  if (!input || typeof input !== "object") throw new Error("Invalid closure");
  const body = input as Record<string, unknown>;
  const reportId = typeof body.reportId === "string" ? body.reportId : null;
  const incidentId = typeof body.incidentId === "string" ? body.incidentId : null;
  if ((reportId ? 1 : 0) + (incidentId ? 1 : 0) !== 1) throw new Error("Invalid source: give an approved report or an incident group");
  const id = (reportId ?? incidentId)!;
  if (!ID.test(id)) throw new Error("Invalid source id");
  if (!Array.isArray(body.wayIds) || body.wayIds.length === 0) throw new Error("Choose at least one road");
  const wayIds = [...new Set(body.wayIds)];
  if (wayIds.length > MAX_CLOSURE_ROADS) throw new Error(`Choose at most ${MAX_CLOSURE_ROADS} roads`);
  if (!wayIds.every(way => typeof way === "string" && WAY_ID.test(way))) throw new Error("Invalid road id");
  if (!CLOSURE_KINDS.includes(body.kind as ClosureKind)) throw new Error("Invalid closure kind");
  const startsAt = body.startsAt === undefined || body.startsAt === null ? now : timeOf(body.startsAt, "start time");
  const endsAt = timeOf(body.endsAt, "end time");
  if (startsAt.getTime() < now.getTime() - 5 * 60_000) throw new Error("Invalid start time: it cannot be in the past");
  checkEnd(startsAt, endsAt, now);
  return { source: { kind: reportId ? "report" : "incident", id }, wayIds: wayIds as string[], kind: body.kind as ClosureKind, startsAt, endsAt, reason: reasonOf(body.reason, "Reason") };
}

function checkEnd(startsAt: Date, endsAt: Date, now: Date) {
  if (endsAt.getTime() < Math.max(startsAt.getTime(), now.getTime()) + MIN_CLOSURE_MINUTES * 60_000) throw new Error(`Invalid end time: at least ${MIN_CLOSURE_MINUTES} minutes from now and after the start`);
  if (endsAt.getTime() > now.getTime() + MAX_CLOSURE_DAYS * DAY) throw new Error(`Invalid end time: at most ${MAX_CLOSURE_DAYS} days ahead`);
}

export type ClosureChange = { action: "end"; reason: string } | { action: "extend"; reason: string; endsAt: Date };
/** Checks PATCH /api/v2/closures/[id]: end now, or move the end time. */
export function validateClosureChange(input: unknown, current: { startsAt: Date }, now: Date = new Date()): ClosureChange {
  if (!input || typeof input !== "object") throw new Error("Invalid change");
  const body = input as Record<string, unknown>;
  const reason = reasonOf(body.reason, "Reason");
  if (body.action === "end") return { action: "end", reason };
  if (body.action !== "extend") throw new Error("Invalid change: end or extend");
  const endsAt = timeOf(body.endsAt, "end time");
  checkEnd(current.startsAt, endsAt, now);
  return { action: "extend", reason, endsAt };
}

/** Can this report or group start a closure? Approved reports, and open groups with at least one approved report. */
export function closureSourceProblem(source: { kind: "report"; reviewState: string } | { kind: "incident"; status: string; reviewStates: string[] }): string | null {
  if (source.kind === "report") return source.reviewState === "corroborated" ? null : "Only approved reports can close roads";
  if (source.status === "resolved") return "This incident group is resolved";
  return source.reviewStates.includes("corroborated") ? null : "Approve at least one report in this group first";
}

export type ClosureState = "upcoming" | "active" | "past_end" | "ended";
/** "past_end": the end time passed without an operator ending it. It is no longer shown to residents. */
export function closureState(c: { startsAt: Date | string; endsAt: Date | string; endedAt?: Date | string | null }, now: Date = new Date()): ClosureState {
  if (c.endedAt) return "ended";
  const t = now.getTime();
  if (t < new Date(c.startsAt).getTime()) return "upcoming";
  if (t < new Date(c.endsAt).getTime()) return "active";
  return "past_end";
}

/** Residents only ever see closures that are active right now (owner's choice, 23 Nov 2026). */
export const isPublic = (c: Parameters<typeof closureState>[0], now: Date = new Date()) => closureState(c, now) === "active";

export type PublicClosure = {
  id: string; kind: ClosureKind; kindLabel: string; endsAt: string; category: string; categoryLabel: string; title: string;
  roads: { wayId: string; name: string; coordinates: [number, number][] }[];
};
type StoredClosure = { id: string; kind: string; endsAt: Date | string; category: string; roads: { wayId: string; name: string; coordinates: unknown }[] };

/** The public fields of a closure. Never the reason, the operator, the source ids or any notes. */
export function publicClosure(c: StoredClosure): PublicClosure {
  const kind = (CLOSURE_KINDS.includes(c.kind as ClosureKind) ? c.kind : "closed") as ClosureKind;
  return {
    id: c.id, kind, kindLabel: CLOSURE_KIND_LABELS[kind], endsAt: new Date(c.endsAt).toISOString(),
    category: c.category, categoryLabel: categoryLabel(c.category), title: roadNames(c.roads.map(r => r.name)),
    roads: c.roads.map(r => ({ wayId: r.wayId, name: r.name, coordinates: (Array.isArray(r.coordinates) ? r.coordinates : []) as [number, number][] })),
  };
}

/** "Jalan A", "Jalan A and Jalan B", "Jalan A, Jalan B and 3 more roads". Unnamed roads are counted, not listed. */
export function roadNames(names: readonly string[]): string {
  const named = [...new Set(names.filter(n => n && !/^unnamed/i.test(n)))];
  const unnamed = names.length - names.filter(n => n && !/^unnamed/i.test(n)).length;
  if (named.length === 0) return names.length === 1 ? "1 unnamed road" : `${names.length} unnamed roads`;
  const shown = named.slice(0, 2);
  const more = named.length - shown.length + unnamed;
  if (more > 0) return `${shown.join(", ")} and ${more} more ${more === 1 ? "road" : "roads"}`;
  return shown.length === 2 ? `${shown[0]} and ${shown[1]}` : shown[0];
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
/** "until 23:40", "until tomorrow 09:00", "until Thu 18:00", "until 2 Dec 18:00". Local time. */
export function untilLabel(endsAt: Date | string, now: Date = new Date()): string {
  const at = new Date(endsAt);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(at) - day(now)) / DAY);
  if (days <= 0) return `until ${hhmm(at)}`;
  if (days === 1) return `until tomorrow ${hhmm(at)}`;
  if (days < 7) return `until ${at.toLocaleDateString("en-GB", { weekday: "short" })} ${hhmm(at)}`;
  return `until ${at.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${hhmm(at)}`;
}

/** "Ends in 5h 52m", "Ends in 12 min", "End time passed 40 min ago", "Starts 21:00", "Ended Fri 18:30". */
export function timeLeftLabel(c: { startsAt: Date | string; endsAt: Date | string; endedAt?: Date | string | null }, now: Date = new Date()): string {
  const state = closureState(c, now);
  const span = (ms: number) => { const m = Math.max(1, Math.round(ms / 60_000)); return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`; };
  if (state === "ended") return `Ended ${untilLabel(c.endedAt!, now).replace("until ", "")}`;
  if (state === "upcoming") return `Starts ${untilLabel(c.startsAt, now).replace("until ", "")}`;
  if (state === "active") return `Ends in ${span(new Date(c.endsAt).getTime() - now.getTime())}`;
  return `End time passed ${span(now.getTime() - new Date(c.endsAt).getTime())} ago`;
}

/** Quick end-time choices in the close-roads dialog: 2 hours, 6 hours, tomorrow 09:00. */
export function endChoices(now: Date = new Date()): { label: string; at: Date }[] {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  return [{ label: "2 hours", at: new Date(now.getTime() + 2 * 3_600_000) }, { label: "6 hours", at: new Date(now.getTime() + 6 * 3_600_000) }, { label: "Tomorrow 09:00", at: tomorrow }];
}

/** Middle point of a line, for the "Closed until …" label on the map. */
export function lineMiddle(coordinates: readonly [number, number][]): [number, number] | null {
  if (coordinates.length === 0) return null;
  return coordinates[Math.floor((coordinates.length - 1) / 2)];
}

/** What the operator dialog previews and what residents read in the list. */
export function residentLine(c: Pick<PublicClosure, "title" | "kind" | "endsAt" | "categoryLabel">, now: Date = new Date()): string {
  return `${c.title} ${c.kind === "one_lane" ? "down to one lane" : "closed"} ${untilLabel(c.endsAt, now)} · ${c.categoryLabel}`;
}
