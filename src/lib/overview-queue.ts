/**
 * Overview page, queue first (roadmap step 4.2, docs/DESIGN.md section 9).
 * Pure helpers so the ordering and wording can be tested without a browser.
 */

type QueueReport = { id: string; reviewState: string; createdAt: string };
type GroupLike = { id: string; status: string; createdAt: string };

/** How long a report has waited: "7 min", "1h 35m", "2d 4h". Empty for an invalid date. */
export function formatWait(createdAt: string, now: number = Date.now()): string {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return "";
  const minutes = Math.max(0, Math.floor((now - created) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

export const OVER_A_DAY_MS = 24 * 60 * 60 * 1000;

/** Reports waiting for a decision, oldest first, with how many did not fit. */
export function decisionQueue<T extends QueueReport>(reports: readonly T[], limit = 5, now: number = Date.now()) {
  const waiting = reports
    .filter(report => report.reviewState === "unverified")
    .slice()
    .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
  return {
    total: waiting.length,
    items: waiting.slice(0, limit).map(report => ({
      report,
      wait: formatWait(report.createdAt, now),
      overADay: now - Date.parse(report.createdAt) > OVER_A_DAY_MS,
    })),
    more: Math.max(0, waiting.length - limit),
    oldestId: waiting[0]?.id ?? null,
  };
}

/** Incident groups still under review, oldest first. */
export function groupsUnderReview<T extends GroupLike>(groups: readonly T[], limit = 4) {
  const open = groups
    .filter(group => group.status === "under_review")
    .slice()
    .sort((a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0));
  return { total: open.length, items: open.slice(0, limit), more: Math.max(0, open.length - limit) };
}

/** Newest reports first. */
export function recentReports<T extends { createdAt: string }>(reports: readonly T[], limit = 4): T[] {
  return reports.slice().sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, limit);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The single summary line that replaces the four number boxes. */
export function overviewSummary(input: { needsDecision: number; groupsUnderReview: number; totalReports: number; resolvedGroups: number }): string[] {
  return [
    input.needsDecision === 0 ? "Nothing waiting for a decision" : `${plural(input.needsDecision, "report needs", "reports need")} your decision`,
    `${plural(input.groupsUnderReview, "incident group", "incident groups")} under review`,
    `${plural(input.totalReports, "report", "reports")} in total`,
    `${plural(input.resolvedGroups, "group", "groups")} resolved`,
  ];
}

/** Links into Incidents that open one specific report or group. */
export const reportLink = (id: string) => `/management/incidents?report=${encodeURIComponent(id)}#report-review`;
export const groupLink = (id: string) => `/management/incidents?incident=${encodeURIComponent(id)}#incident-groups`;

/** Reads `?report=` or `?incident=` from a URL search string; ignores anything that is not a plain ID. */
export function requestedId(search: string, key: "report" | "incident"): string | null {
  const value = new URLSearchParams(search).get(key);
  return value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}
