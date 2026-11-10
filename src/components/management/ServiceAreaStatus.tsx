"use client";
import { MapPinAreaIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useServiceArea } from "@/hooks/useServiceArea";
import { areaSpanKm } from "@/lib/service-area";

/** Which service area is active (roadmap step 2.1), and why if the configured one could not be used. */
export default function ServiceAreaStatus() {
  const { data, loaded, failed } = useServiceArea();
  const span = areaSpanKm(data.area);
  const size = `about ${span.widthKm.toFixed(1)} × ${span.heightKm.toFixed(1)} km`;
  return <section aria-label="Service area" className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><MapPinAreaIcon size={22} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-slate-900">Service area</h2>
        <p className="mt-0.5 text-[15px] text-slate-600" aria-live="polite">
          {!loaded ? "Checking…" : <>Reports are accepted inside <strong className="font-semibold text-slate-900">{data.area.name}</strong> ({size}).</>}
        </p>
        <p className="mt-1 text-[13px] text-slate-500">Set in <code className="font-mono">config/service-areas/{data.area.id}.geojson</code>. To test somewhere else, see <code className="font-mono">config/service-areas/README.md</code>.</p>
      </div>
    </div>
    {data.fallbackReason ? <p role="status" className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-900">
      <WarningCircleIcon size={20} weight="bold" className="shrink-0" aria-hidden="true" />
      <span><strong className="font-semibold">Using the BBR default instead of “{data.configuredId}”.</strong> {data.fallbackReason} Fix the file or the SERVICE_AREA line in .env, then restart the dev server.</span>
    </p> : null}
    {failed ? <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-900">Could not check the service area. The server still checks every report against its own area.</p> : null}
  </section>;
}
