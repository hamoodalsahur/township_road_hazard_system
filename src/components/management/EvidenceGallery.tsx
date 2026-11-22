"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwiseIcon, CaretRightIcon, EyeIcon, ImageIcon, LockSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { PrivatePhotoState } from "@/lib/v214-evidence-state";
import { categoryLabel, formatAgeLong } from "@/lib/hazard-presentation";
import { reportLink } from "@/lib/overview-queue";
import { GALLERY_LABEL, galleryCounts, galleryStatus, type GalleryFilter, type GalleryStatus } from "@/lib/evidence-gallery";
import HazardMarker from "@/components/hazards/HazardMarker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Report = { id: string; category: string; description: string; impact: string; reviewState: string; createdAt: string };
type Item = Report & { status: GalleryStatus };
const THUMBS = 48;

const STATUS_CHIP: Record<GalleryStatus, { className: string; Icon: typeof EyeIcon }> = {
  waiting: { className: "bg-[#E8F0FB] text-[#1F5A94]", Icon: ImageIcon },
  public: { className: "border-[1.5px] border-slate-300 bg-white text-slate-900", Icon: EyeIcon },
  private: { className: "bg-slate-100 text-slate-700", Icon: LockSimpleIcon },
  check: { className: "bg-rose-50 text-rose-800", Icon: WarningCircleIcon },
};

export function GalleryStatusChip({ status }: { status: GalleryStatus }) {
  const { className, Icon } = STATUS_CHIP[status];
  return <span className={cn("inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full px-3 text-caption font-medium", className)}>
    <Icon size={14} aria-hidden="true" />{GALLERY_LABEL[status]}
  </span>;
}

/**
 * Evidence, Night Desk: every attached photo as a grid, filtered by who can see it.
 * Private photos are fetched with the operator key into short-lived browser URLs that are released
 * when the page closes or refreshes; approved ones use the public approved-photo address.
 */
export default function EvidenceGallery({ operatorKey, onSummary }: { operatorKey: string; onSummary?: (counts: Record<GalleryFilter, number> | null) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const urlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void Promise.all([
      fetch("/api/v2/hazards", { cache: "no-store" }),
      fetch("/api/v2/evidence-states", { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" }),
    ]).then(async ([feed, photos]) => {
      if (!feed.ok || !photos.ok) throw Error("Could not load photo records. Check that the local server is running.");
      const a = await feed.json() as { reports?: Report[] };
      const b = await photos.json() as { states?: Record<string, PrivatePhotoState> };
      if (!Array.isArray(a.reports) || !b.states) throw Error("Photo records were incomplete.");
      if (!active) return;
      const states = b.states;
      const next = a.reports
        .filter(report => states[report.id] && states[report.id] !== "none")
        .map(report => ({ ...report, status: galleryStatus(states[report.id], report.reviewState) }))
        .sort((l, r) => Date.parse(r.createdAt) - Date.parse(l.createdAt));
      setItems(next);
      setNow(Date.now());
    }).catch(e => { if (active) { setItems([]); setError(e instanceof Error ? e.message : "Photos are unavailable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [operatorKey, version]);

  const counts = useMemo(() => galleryCounts(items.map(item => item.status)), [items]);
  useEffect(() => { onSummary?.(loading || error ? null : counts); }, [counts, loading, error]);

  // Fetch private thumbnails a few at a time; release them all when the list changes or the page closes.
  useEffect(() => {
    let active = true;
    const wanted = items.filter(item => item.status !== "public").slice(0, THUMBS);
    async function run() {
      for (let i = 0; i < wanted.length && active; i += 3) {
        await Promise.all(wanted.slice(i, i + 3).map(async item => {
          if (urlsRef.current[item.id]) return;
          try {
            const response = await fetch(`/api/v2/hazards/${encodeURIComponent(item.id)}/evidence/private`, { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" });
            if (!response.ok) throw Error();
            const blob = await response.blob();
            if (!active) return;
            const url = URL.createObjectURL(blob);
            urlsRef.current = { ...urlsRef.current, [item.id]: url };
            setUrls(urlsRef.current);
          } catch { if (active) setFailed(old => ({ ...old, [item.id]: true })); }
        }));
      }
    }
    void run();
    return () => { active = false; };
  }, [items, operatorKey]);
  useEffect(() => () => { Object.values(urlsRef.current).forEach(url => URL.revokeObjectURL(url)); urlsRef.current = {}; }, []);
  function refresh() {
    Object.values(urlsRef.current).forEach(url => URL.revokeObjectURL(url));
    urlsRef.current = {}; setUrls({}); setFailed({}); setVersion(v => v + 1);
  }

  const visible = filter === "all" ? items : items.filter(item => item.status === filter);
  const open = items.find(item => item.id === openId) ?? null;
  const src = (item: Item) => item.status === "public" ? `/api/v2/hazards/${encodeURIComponent(item.id)}/evidence/approved` : urls[item.id];
  const filters: GalleryFilter[] = ["all", "waiting", "public", "private", ...(counts.check ? ["check" as const] : [])];
  const filterChip = (active: boolean) => "inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-small font-medium transition-colors " +
    (active ? "border-night bg-night text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900");

  return <section aria-label="Photo evidence" className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter photos by who can see them">
        {filters.map(key => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={filterChip(filter === key)}>
          {key === "all" ? "All" : GALLERY_LABEL[key]} <span className="font-semibold">{counts[key]}</span>
        </button>)}
      </div>
      <span className="ml-auto text-small text-slate-600">Newest first</span>
      <Button variant="secondary" size="icon" onClick={refresh} disabled={loading} aria-label="Refresh photos"><ArrowClockwiseIcon size={20} aria-hidden="true" /></Button>
    </div>

    {error ? <div role="alert" className="flex max-w-xl gap-3 rounded-xl bg-rose-50 p-4 text-small text-rose-800">
      <WarningCircleIcon size={20} weight="bold" className="shrink-0" aria-hidden="true" />
      <div><p className="font-semibold text-rose-950">Could not load photos</p><p className="mt-1">{error}</p>
        <Button variant="secondary" size="sm" onClick={refresh} className="mt-3"><ArrowClockwiseIcon size={16} aria-hidden="true" />Try again</Button></div>
    </div> : null}
    {loading && !error ? <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <li key={i} className="h-56 animate-pulse rounded-xl bg-slate-100" />)}
    </ul> : null}
    {!loading && !error && visible.length === 0 ? <p role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-small text-slate-600">
      {items.length === 0 ? "No photos yet. Photos that residents attach to reports appear here." : <>No photos in this group. <button type="button" onClick={() => setFilter("all")} className="font-semibold text-teal-800 hover:underline">Show all photos</button></>}
    </p> : null}

    {!loading && !error && visible.length ? <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {visible.map(item => {
        const url = src(item);
        return <li key={item.id}>
          <button type="button" onClick={() => setOpenId(item.id)} aria-label={`${categoryLabel(item.category)}, ${GALLERY_LABEL[item.status]}. Open photo`}
            className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors hover:border-slate-300", item.status === "waiting" ? "border-night" : "border-slate-200")}>
            <span className="relative block aspect-[4/3] w-full bg-slate-100">
              {url ? <img src={url} alt="" className="h-full w-full object-cover" />
                : <span className="flex h-full items-center justify-center text-caption text-slate-600">{failed[item.id] ? "Photo could not be opened" : "Loading photo…"}</span>}
              {item.status === "waiting" ? <span className="absolute left-2 top-2 rounded-full bg-night px-2 py-1 text-caption font-medium text-white">Waiting for a decision</span> : null}
            </span>
            <span className="flex items-center gap-2 px-3 pt-3">
              <HazardMarker category={item.category} impact={item.impact} reviewState={item.reviewState} size={24} decorative />
              <span className="min-w-0"><strong className="block truncate text-body font-semibold text-slate-900">{categoryLabel(item.category)}</strong>
                <time dateTime={item.createdAt} className="text-caption text-slate-600">{formatAgeLong(item.createdAt, now)}</time></span>
            </span>
            <span className="px-3 pb-3 pt-2">{item.status === "waiting" ? null : <GalleryStatusChip status={item.status} />}</span>
          </button>
        </li>;
      })}
    </ul> : null}

    <Dialog open={open !== null} onOpenChange={value => { if (!value) setOpenId(null); }}>
      {open ? <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{categoryLabel(open.category)}</DialogTitle>
          <DialogDescription>Reported {formatAgeLong(open.createdAt, now)}. ID {open.id}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl bg-slate-100">
          {src(open) ? <img src={src(open)} alt={`Photo attached to the ${categoryLabel(open.category).toLowerCase()} report`} className="max-h-[60vh] w-full object-contain" />
            : <p className="p-8 text-center text-small text-slate-600">{failed[open.id] ? "This photo could not be opened." : "Loading photo…"}</p>}
        </div>
        <p className="text-body text-slate-900">{open.description}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GalleryStatusChip status={open.status} />
          <Button asChild variant="primary"><Link href={reportLink(open.id)}>{open.status === "waiting" ? "Review this report" : "Open the report"}<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link></Button>
        </div>
      </DialogContent> : null}
    </Dialog>
  </section>;
}
