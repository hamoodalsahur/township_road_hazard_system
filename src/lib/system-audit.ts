/**
 * System & Audit, Night Desk: operator actions in plain words.
 * Reads the stored audit text only; it never changes an entry.
 */
export type AuditEntry = { id: string; action: string; subjectId: string; actor: string; detail: string; createdAt: string };

const ACTIONS: Record<string, string> = {
  v2_demo_incident_created: "Group opened",
  v2_demo_incident_updated: "Group updated",
  v2_demo_incident_report_linked: "Report added to group",
  v2_demo_incident_report_unlinked: "Report removed from group",
  v2_road_closure_created: "Road closed",
  v2_road_closure_ended: "Road closure ended",
  v2_road_closure_extended: "Road closure end time changed",
};

/** "Approved", "Rejected", "Group opened"… Unknown actions are shown as their stored name, made readable. */
export function auditActionLabel(entry: Pick<AuditEntry, "action" | "detail">): string {
  if (entry.action === "v2_demo_hazard_review") {
    if (/^Decision: corroborated/.test(entry.detail)) return "Approved";
    if (/^Decision: rejected/.test(entry.detail)) return "Rejected";
    return "Reviewed";
  }
  return ACTIONS[entry.action] ?? entry.action.replace(/^v2_demo_/, "").replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
}

/** The operator's own reason, pulled out of the stored text when it follows a known pattern. */
export function auditReason(entry: Pick<AuditEntry, "action" | "detail">): string {
  const detail = entry.detail ?? "";
  const review = /^Decision: [a-z_]+; public demo photo approved: (?:true|false)\. ?([\s\S]*)$/.exec(detail);
  if (review) return review[1].trim();
  const reason = /(?:operator reason|reason): ([\s\S]*)$/.exec(detail);
  return (reason ? reason[1] : detail).trim();
}

/** Whether the photo was made public with this decision (review entries only). */
export function auditPhotoPublished(entry: Pick<AuditEntry, "action" | "detail">): boolean {
  return entry.action === "v2_demo_hazard_review" && /public demo photo approved: true/.test(entry.detail);
}

const cell = (value: string) => /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
/** A CSV of the entries on screen, for the operator to keep. Formula-like cells are quoted so spreadsheets do not run them. */
export function auditCsv(entries: readonly AuditEntry[]): string {
  const safe = (value: string) => /^[=+\-@]/.test(value) ? `'${value}` : value;
  const rows = [["When", "Action", "Subject ID", "Reason given", "By"], ...entries.map(entry => [
    entry.createdAt, auditActionLabel(entry), entry.subjectId, auditReason(entry), entry.actor,
  ])];
  return rows.map(row => row.map(value => cell(safe(String(value)))).join(",")).join("\r\n") + "\r\n";
}
