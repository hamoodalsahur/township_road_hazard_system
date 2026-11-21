"use client";
import { useEffect, useState } from "react";
import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import type { EvidenceInventory } from "@/lib/v2-evidence-inventory";
import type { EvidenceConsistencyCounts } from "@/lib/v2-evidence-consistency";
import { formatBytes } from "@/lib/evidence-gallery";

const CHECKS: [keyof EvidenceConsistencyCounts, string][] = [
  ["approvedWithNonCorroboratedReport", "Photos marked public on a report that is not approved"],
  ["unreviewedPhotoOnReviewedReport", "Undecided photos on a report that was already decided"],
  ["reviewedPhotoOnUnverifiedReport", "Decided photos on a report still waiting"],
  ["unexpectedEvidenceStatus", "Photos with an unknown status"],
  ["unexpectedReportReviewState", "Reports with an unknown review state"],
  ["unsupportedDeclaredMimeType", "Photos that are not JPEG or PNG"],
  ["invalidStoredByteCount", "Photos with an impossible file size"],
];

/**
 * Evidence side panel: storage counts and privacy checks, loaded on arrival (both read-only counts;
 * no photo content, descriptions or coordinates are returned by either endpoint).
 */
export default function EvidenceSidePanel({ operatorKey }: { operatorKey: string }) {
  const [inventory, setInventory] = useState<EvidenceInventory | null>(null);
  const [checks, setChecks] = useState<EvidenceConsistencyCounts | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const headers = { "x-demo-operator-key": operatorKey };
    void Promise.all([
      fetch("/api/v2/evidence-inventory", { headers, cache: "no-store" }).then(r => r.ok ? r.json() as Promise<{ metrics?: EvidenceInventory }> : null),
      fetch("/api/v2/evidence-consistency", { headers, cache: "no-store" }).then(r => r.ok ? r.json() as Promise<{ metrics?: EvidenceConsistencyCounts }> : null),
    ]).then(([a, b]) => {
      if (!active) return;
      setInventory(a?.metrics ?? null); setChecks(b?.metrics ?? null);
      setError(a?.metrics && b?.metrics ? "" : "Some counts could not be loaded.");
    }).catch(() => { if (active) setError("Counts could not be loaded."); });
    return () => { active = false; };
  }, [operatorKey]);

  const total = inventory?.totalEvidence ?? 0;
  const share = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  const problems = checks ? CHECKS.filter(([key]) => (checks[key] as number) > 0) : [];

  return <aside className="flex flex-col gap-3" aria-label="Photo storage and checks">
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-display text-heading font-semibold text-slate-900">Storage</h2>
      {inventory ? <>
        <p className="mt-2 font-display text-title font-semibold tabular-nums text-slate-900">{formatBytes(inventory.storedPayloadBytes)} <span className="font-sans text-small font-normal text-slate-600">in {total} {total === 1 ? "photo" : "photos"}</span></p>
        <div className="my-3 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <span className="bg-[#1F5A94]" style={{ width: share(inventory.privateUnreviewed) }} />
          <span className="bg-slate-900" style={{ width: share(inventory.approvedPublicDemo) }} />
          <span className="bg-slate-400" style={{ width: share(inventory.privateRejected) }} />
        </div>
        <dl className="text-small">
          {([["Waiting for a decision", inventory.privateUnreviewed, "bg-[#1F5A94]"], ["Approved for residents", inventory.approvedPublicDemo, "bg-slate-900"], ["Kept private", inventory.privateRejected, "bg-slate-400"]] as const)
            .map(([label, value, dot]) => <div key={label} className="flex items-center gap-2 border-t border-slate-100 py-2 first:border-0">
              <span aria-hidden="true" className={"h-2 w-2 rounded-full " + dot} /><dt className="flex-1 text-slate-700">{label}</dt><dd className="font-semibold tabular-nums text-slate-900">{value}</dd></div>)}
          {inventory.privateOverThirtyDays ? <div className="flex items-center gap-2 border-t border-slate-100 py-2"><span className="h-2 w-2" /><dt className="flex-1 text-slate-700">Private for over 30 days</dt><dd className="font-semibold tabular-nums text-slate-900">{inventory.privateOverThirtyDays}</dd></div> : null}
        </dl>
      </> : <p className="mt-2 text-small text-slate-600">{error ? "Storage counts are unavailable." : "Loading…"}</p>}
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-display text-heading font-semibold text-slate-900">Checks</h2>
      {checks ? problems.length === 0
        ? <p className="mt-2 flex gap-2 text-small text-slate-700"><CheckCircleIcon size={20} weight="fill" className="shrink-0 text-teal-800" aria-hidden="true" />No problems found in {checks.recordsScanned} photo {checks.recordsScanned === 1 ? "record" : "records"}</p>
        : <ul className="mt-2 text-small">{problems.map(([key, label]) => <li key={key} className="flex gap-2 border-t border-slate-100 py-2 first:border-0">
            <WarningIcon size={20} weight="fill" className="shrink-0 text-rose-800" aria-hidden="true" /><span className="flex-1 text-slate-700">{label}</span><strong className="tabular-nums">{checks[key] as number}</strong></li>)}
          </ul>
        : <p className="mt-2 text-small text-slate-600">{error ? "Checks are unavailable." : "Loading…"}</p>}
      {checks && problems.length ? <p className="mt-2 text-caption text-slate-600">One photo can trip more than one check, so these do not add up</p> : null}
    </section>

    <p className="rounded-xl border border-[#CFDDEB] bg-[#F1F6FB] p-4 text-small leading-5 text-slate-700">
      A photo is shown to residents only when an operator approves the report and ticks &ldquo;Also show this photo to residents&rdquo;.
    </p>
  </aside>;
}
