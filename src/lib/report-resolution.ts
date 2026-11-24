/**
 * Road cleared (24 Nov 2026): the end of the demo story. An operator marks an approved report resolved;
 * its road closures end at the same moment, the report leaves the public map, and the resident's
 * "My reports" shows Resolved. The note is for operators only.
 */
export const RESOLVE_NOTE_MIN = 8;
export const RESOLVE_NOTE_MAX = 400;
export const DEFAULT_RESOLVE_NOTE = "Road cleared, checked by the township team";

export function validateResolveNote(body: unknown): { note: string } {
  const note = typeof body === "object" && body !== null && typeof (body as { note?: unknown }).note === "string" ? (body as { note: string }).note.trim() : "";
  if (note.length < RESOLVE_NOTE_MIN) throw new Error(`Choose a note of at least ${RESOLVE_NOTE_MIN} characters`);
  if (note.length > RESOLVE_NOTE_MAX) throw new Error(`Choose a note of at most ${RESOLVE_NOTE_MAX} characters`);
  return { note };
}

/** Why a report cannot be marked cleared, or null when it can. */
export function resolveProblem(report: { sourceMode: string; reviewState: string } | null, alreadyResolved: boolean): { status: number; error: string } | null {
  if (!report || report.sourceMode !== "simulation") return { status: 404, error: "Report not found." };
  if (report.reviewState !== "corroborated") return { status: 409, error: "Only an approved report can be marked cleared." };
  if (alreadyResolved) return { status: 409, error: "This report is already resolved." };
  return null;
}

/** The desk's message after "Mark cleared". */
export function resolvedMessage(category: string, closuresEnded: number): string {
  const roads = closuresEnded === 0 ? "No road closure was open for it." : closuresEnded === 1 ? "Its road closure has ended." : `Its ${closuresEnded} road closures have ended.`;
  return `${category} report resolved. ${roads} Residents no longer see it, and their way home goes back to normal.`;
}

/** The hazards list hides resolved reports unless ?include=resolved (the review desk asks for them). */
export function includeResolved(url: string): boolean {
  return new URL(url).searchParams.get("include") === "resolved";
}
