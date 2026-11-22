"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaretRightIcon } from "@phosphor-icons/react";
import ManagementSectionHeading from "@/components/management/ManagementSectionHeading";
import { useManagementOperatorKey } from "@/components/management/ManagementShell";
import EvidenceGallery from "@/components/management/EvidenceGallery";
import EvidenceSidePanel from "@/components/management/EvidenceSidePanel";
import EvidenceInventory from "@/components/management/EvidenceInventory";
import EvidenceConsistency from "@/components/management/EvidenceConsistency";
import { evidenceSummary, type GalleryFilter } from "@/lib/evidence-gallery";

/** Evidence, Night Desk: the photo grid, with storage and privacy checks alongside. */
export default function EvidencePage() {
  const operatorKey = useManagementOperatorKey();
  const [counts, setCounts] = useState<Record<GalleryFilter, number> | null>(null);
  return <>
    <ManagementSectionHeading section="evidence" subtitle={<p className="mt-1 text-body text-night-muted" aria-live="polite">{counts ? evidenceSummary(counts) : "Loading photos…"}</p>}
      actions={counts?.waiting ? <Button asChild variant="night"><Link href="/management/incidents#report-review">Review waiting photos<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link></Button> : null} />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <EvidenceGallery operatorKey={operatorKey} onSummary={setCounts} />
      <EvidenceSidePanel operatorKey={operatorKey} />
    </div>
    <details className="group mt-6 rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-body font-semibold text-slate-900">
        <CaretRightIcon size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />Every counter
        <span className="text-caption font-normal text-slate-600">Advanced, read-only</span>
      </summary>
      <div className="grid items-start gap-4 px-5 pb-5 xl:grid-cols-2">
        <EvidenceInventory operatorKey={operatorKey} />
        <EvidenceConsistency operatorKey={operatorKey} />
      </div>
    </details>
  </>;
}
