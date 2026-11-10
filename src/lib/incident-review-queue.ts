/**
 * Queue behaviour for the Incidents review screen (roadmap step 4.2).
 * Pure functions so they can be tested without a browser. They never call the review API.
 */

type QueueItem = { id: string; reviewState: string };

/**
 * After a decision, open the next report that still needs review: the next one below in the
 * list as shown, otherwise the first one above. Returns null when none are left.
 */
export function nextReportAfterDecision(listBefore: readonly QueueItem[], decidedId: string): string | null {
  const index = listBefore.findIndex(item => item.id === decidedId);
  const waiting = (item: QueueItem) => item.reviewState === "unverified" && item.id !== decidedId;
  const after = listBefore.slice(index + 1).find(waiting);
  if (after) return after.id;
  return listBefore.slice(0, Math.max(index, 0)).find(waiting)?.id ?? null;
}

/** Move the selection up or down the visible list, stopping at either end. */
export function moveSelection(list: readonly { id: string }[], currentId: string | null, delta: 1 | -1): string | null {
  if (list.length === 0) return null;
  const index = list.findIndex(item => item.id === currentId);
  if (index === -1) return list[delta === 1 ? 0 : list.length - 1].id;
  return list[Math.min(list.length - 1, Math.max(0, index + delta))].id;
}

export type ShortcutAction =
  | { type: "move"; delta: 1 | -1 }
  | { type: "focus-reason" }
  | { type: "focus-decision"; decision: "approve" | "reject" }
  | null;

export type ShortcutKey = { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; inTextField: boolean };

/**
 * Keyboard shortcuts: J/K move through the list, A approve, R reject.
 * A and R never send a decision on their own. They move focus to the reason box (when the
 * reason is too short) or to the matching button, so a second deliberate key press
 * (Enter or Space) is always needed. Shortcuts are ignored while typing in a field.
 */
export function reviewShortcut(event: ShortcutKey, canDecide: boolean, reasonValid: boolean): ShortcutAction {
  if (event.inTextField || event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "j") return { type: "move", delta: 1 };
  if (key === "k") return { type: "move", delta: -1 };
  if ((key === "a" || key === "r") && canDecide) {
    return reasonValid ? { type: "focus-decision", decision: key === "a" ? "approve" : "reject" } : { type: "focus-reason" };
  }
  return null;
}

/** The minimum reason length the review API accepts. */
export const MIN_REASON_LENGTH = 8;
export function reasonIsValid(reason: string | undefined): boolean {
  return (reason ?? "").trim().length >= MIN_REASON_LENGTH;
}

/** Confirmation shown after a decision. It never claims a road status changed. */
export function decisionMessage(input: { category: string; decision: "corroborated" | "rejected"; photoPublished: boolean; remaining: number }): string {
  const verb = input.decision === "corroborated" ? "approved" : "rejected";
  const photo = input.decision === "corroborated" && input.photoPublished
    ? " The photo will show in the resident app."
    : " Any photo stays private.";
  const left = input.remaining === 0 ? " No reports left to review." : input.remaining === 1 ? " 1 report left." : ` ${input.remaining} reports left.`;
  return `${input.category} report ${verb}.${photo}${left} No road status changed.`;
}
