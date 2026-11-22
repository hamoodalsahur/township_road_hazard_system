/**
 * Management Maps stage (Night Desk): which report pins are shown for the "Needs review" and
 * "Approved" layer switches. Built-in examples are controlled by their own switch, so they pass here.
 * Rejected reports never reach this point (useMapWorkspace drops them before the map).
 */
type Pin = { id: string };

export function stageHazards<T extends Pin>(hazards: readonly T[], reviewStates: Readonly<Record<string, string>>, show: { waiting: boolean; approved: boolean }): T[] {
  return hazards.filter(hazard => {
    if (hazard.id.startsWith("demo-")) return true;
    const state = reviewStates[hazard.id] ?? "unverified";
    if (state === "corroborated") return show.approved;
    if (state === "unverified") return show.waiting;
    return false;
  });
}

export function mapStageCounts(hazards: readonly Pin[], reviewStates: Readonly<Record<string, string>>) {
  let waiting = 0, approved = 0;
  for (const hazard of hazards) {
    const state = reviewStates[hazard.id] ?? "unverified";
    if (state === "corroborated") approved += 1;
    else if (state === "unverified") waiting += 1;
  }
  return { waiting, approved };
}
