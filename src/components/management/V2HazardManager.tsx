"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon, ArrowsInIcon, ArrowsOutIcon, BrainIcon, CameraIcon, CaretLeftIcon, CheckIcon,
  ClipboardTextIcon, LockSimpleIcon, MagnifyingGlassIcon, WarningCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { filterReviewReports, reportReviewCounts } from "@/lib/v212-report-review-list";
import { type PrivatePhotoState } from "@/lib/v214-evidence-state";
import { reviewPhotoPresentation } from "@/lib/v216-review-photo-presentation";
import { categoryLabel, formatAge, formatAgeLong } from "@/lib/hazard-presentation";
import {
  decisionMessage, moveSelection, nextReportAfterDecision, reasonIsValid, reviewShortcut, MIN_REASON_LENGTH,
} from "@/lib/incident-review-queue";
import HazardMarker from "@/components/hazards/HazardMarker";
import ReportMiniMap from "@/components/hazards/ReportMiniMap";
import { LifecycleTrack, ReviewStateChip, SeverityChip } from "@/components/hazards/HazardChips";

type RecordItem = { id: string; category: string; description: string; impact: string; reviewState: string; createdAt: string; latitude: number; longitude: number };
type AiResult = { provider: string; model: string; analysed: number; matches: { id: string; similarity: number; category: string }[]; disclaimer: string };

const pill = "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800";
const smallButton = "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-[inset_0_0_0_1px_#E6E9E7] hover:bg-slate-50 disabled:opacity-50";

export default function V2HazardManager({ operatorKey, onCountsChange }: { operatorKey: string; onCountsChange?: (needsReview: number | null) => void }) {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [photoStates, setPhotoStates] = useState<Record<string, PrivatePhotoState> | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const activeSelectionRef = useRef<string | null>(null);
  const selectedReport = items.find(item => item.id === selectedReportId);
  const selectedPhotoMode = photoStates === null ? "unavailable" : reviewPhotoPresentation(
    photoStates[selectedReportId ?? ""] ?? "none", selectedReport?.reviewState ?? "unverified",
  );
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [order, setOrder] = useState<"needs_review_first" | "newest" | "oldest">("needs_review_first");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const evidenceUrlsRef = useRef<Record<string, string>>({});
  const counts = reportReviewCounts(items);
  const categories = [...new Set(items.map(i => i.category))].sort();
  const visibleItems = filterReviewReports(items, { query, reviewState: stateFilter, category: categoryFilter, order });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [publishPhotos, setPublishPhotos] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [photoLoadingId, setPhotoLoadingId] = useState<string | null>(null);
  const [photoErrorId, setPhotoErrorId] = useState<string | null>(null);
  const [photoLarge, setPhotoLarge] = useState(false);
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  // On narrow screens the list and the detail take turns filling the screen.
  const [phoneView, setPhoneView] = useState<"list" | "detail">("list");
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const filtersActive = query !== "" || stateFilter !== "all" || categoryFilter !== "all" || order !== "needs_review_first";
  const oldestWaiting = items.filter(i => i.reviewState === "unverified").map(i => i.createdAt).sort()[0];

  function selectReport(id: string | null) {
    // Changing rows immediately releases any private local image preview.
    for (const [key, url] of Object.entries(evidenceUrlsRef.current)) {
      URL.revokeObjectURL(url);
      delete evidenceUrlsRef.current[key];
    }
    setEvidenceUrls({});
    setPhotoErrorId(null);
    setPhotoLoadingId(null);
    setPhotoLarge(false);
    setDecisionError("");
    activeSelectionRef.current = id;
    setSelectedReportId(id);
  }
  /** Opens a report. On narrow screens this also swaps the list for the detail view. */
  function toggleReport(id: string) {
    if (selectedReportId !== id) selectReport(id);
    setPhoneView("detail");
    if (!window.matchMedia("(min-width: 1280px)").matches) requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: "start" }));
  }
  async function runAiAnalysis(id: string) {
    setAiBusy(id); setAiErrors(old => ({ ...old, [id]: "" }));
    try {
      const response = await fetch("/api/v2/hazards/" + id + "/ai-triage", { method: "POST", headers: { "x-demo-operator-key": operatorKey } });
      const result = await response.json() as AiResult & { error?: string };
      if (!response.ok) throw Error(result.error ?? "AI comparison failed");
      setAiResults(old => ({ ...old, [id]: result }));
    } catch (error) { setAiErrors(old => ({ ...old, [id]: error instanceof Error ? error.message : "AI unavailable" })); }
    finally { setAiBusy(null); }
  }
  async function viewEvidence(id: string) {
    setPhotoLoadingId(id);
    setPhotoErrorId(null);
    try {
      const response = await fetch("/api/v2/hazards/" + id + "/evidence/private", { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" });
      if (!response.ok) throw Error(response.status === 404 ? "No private photo is attached to this report." : "Could not retrieve private photo.");
      const blob = await response.blob();
      // An operator may have switched reports while the private photo was loading.
      if (activeSelectionRef.current !== id) return;
      const url = URL.createObjectURL(blob);
      setEvidenceUrls(old => {
        if (old[id]) URL.revokeObjectURL(old[id]);
        const updated = { ...old, [id]: url };
        evidenceUrlsRef.current = updated;
        return updated;
      });
    } catch (error) { if (activeSelectionRef.current === id) setPhotoErrorId(id); }
    finally { setPhotoLoadingId(current => (current === id ? null : current)); }
  }
  /** `prefer` picks the report to open after a decision; null means none are left. */
  async function reload(prefer?: { id: string | null }) {
    setLoading(true); setLoadError("");
    try {
      const [r, photoResponse] = await Promise.all([
        fetch("/api/v2/hazards", { cache: "no-store" }),
        fetch("/api/v2/evidence-states", { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" }),
      ]);
      if (photoResponse.ok) {
        const data = await photoResponse.json() as { states: Record<string, PrivatePhotoState> };
        setPhotoStates(data.states);
      } else setPhotoStates(null);
      if (!r.ok) throw Error("Could not load reports. Check that the local server and database are running; do not reset your database.");
      const data = await r.json() as { reports: RecordItem[] };
      setItems(data.reports);
      setNow(Date.now());
      setSelectedReportId(current => {
        // With nothing waiting, no report opens and the panel says "All caught up".
        const fallback = data.reports.find(item => item.reviewState === "unverified")?.id ?? null;
        const wanted = prefer ? prefer.id : current;
        const next = prefer && prefer.id === null ? null : data.reports.some(item => item.id === wanted) ? wanted : fallback;
        activeSelectionRef.current = next;
        return next;
      });
    } catch (e) { setLoadError(e instanceof Error ? e.message : "Unable to load reports"); setPhotoStates(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [operatorKey]);
  useEffect(() => { onCountsChange?.(loadError ? null : loading && items.length === 0 ? null : counts.unverified); }, [counts.unverified, loading, loadError]);
  // Keep list ages current while the page is open.
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 8000); return () => clearTimeout(timer); }, [message]);
  // Release private browser object URLs when leaving report review. Never store images on other pages.
  useEffect(() => () => {
    activeSelectionRef.current = null;
    Object.values(evidenceUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
  }, []);
  // The authenticated operator can inspect an attached sample automatically.
  // The private endpoint still requires the operator key; public access is unchanged.
  useEffect(() => {
    if (selectedReportId && selectedPhotoMode === "inspect_private" && !evidenceUrlsRef.current[selectedReportId]) {
      void viewEvidence(selectedReportId);
    }
  }, [selectedReportId, selectedPhotoMode, photoStates, operatorKey]);

  // Keyboard shortcuts (J/K move, A approve, R reject). A and R only move focus; Enter confirms.
  const canDecide = !!selectedReport && selectedReport.reviewState === "unverified" && !busy;
  const shortcutState = useRef({ visibleItems, selectedReportId, canDecide, reason: notes[selectedReportId ?? ""] });
  shortcutState.current = { visibleItems, selectedReportId, canDecide, reason: notes[selectedReportId ?? ""] };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!rootRef.current || rootRef.current.closest("[hidden]")) return;
      const target = event.target as HTMLElement | null;
      const inTextField = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      const state = shortcutState.current;
      const action = reviewShortcut({ key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, inTextField }, state.canDecide, reasonIsValid(state.reason));
      if (!action) return;
      event.preventDefault();
      if (action.type === "move") {
        const next = moveSelection(state.visibleItems, state.selectedReportId, action.delta);
        if (next && next !== state.selectedReportId) {
          selectReport(next);
          document.getElementById("report-row-" + next)?.scrollIntoView({ block: "nearest" });
        }
      } else if (action.type === "focus-reason") reasonRef.current?.focus();
      else (action.decision === "approve" ? approveRef : rejectRef).current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function review(id: string, decision: "corroborated" | "rejected") {
    setBusy(true); setMessage(""); setDecisionError("");
    const publishPhoto = decision === "corroborated" && photoStates?.[id] === "private_unreviewed" && publishPhotos[id] === true;
    const next = nextReportAfterDecision(visibleItems, id);
    const category = categoryLabel(items.find(item => item.id === id)?.category ?? "");
    try {
      const response = await fetch(`/api/v2/hazards/${id}/review`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey },
        body: JSON.stringify({ decision, note: notes[id] ?? "", publishPhoto: decision === "corroborated" && photoStates?.[id] === "private_unreviewed" && publishPhotos[id] === true }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw Error(result.error ?? "Review failed");
      setPublishPhotos(old => ({ ...old, [id]: false }));
      if (evidenceUrlsRef.current[id]) {
        URL.revokeObjectURL(evidenceUrlsRef.current[id]);
        delete evidenceUrlsRef.current[id];
        setEvidenceUrls(old => { const copy = { ...old }; delete copy[id]; return copy; });
      }
      setMessage(decisionMessage({ category, decision, photoPublished: publishPhoto, remaining: Math.max(0, counts.unverified - 1) }));
      window.dispatchEvent(new Event("township-hazards-updated"));
      selectReport(next);
      await reload({ id: next });
    } catch (e) { setDecisionError(e instanceof Error ? e.message : "Could not review"); }
    finally { setBusy(false); }
  }
  const hasPhoto = (id: string) => photoStates !== null && photoStates[id] !== undefined && photoStates[id] !== "none";
  const chip = (active: boolean) => "inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors " +
    (active ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-600 hover:text-slate-900");
  const summary = loadError ? "Reports could not be loaded"
    : counts.unverified === 0 ? "Nothing needs your decision right now"
    : `${counts.unverified} ${counts.unverified === 1 ? "report needs" : "reports need"} your decision` +
      (oldestWaiting ? ` · ${counts.unverified === 1 ? "waiting" : "oldest waiting"} ${formatAge(oldestWaiting, now)}` : "");

  return <section ref={rootRef} aria-label="Report review" className="pb-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[15px] text-slate-600" aria-live="polite">{loading && items.length === 0 ? "Loading reports…" : summary}</p>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm text-slate-500 focus-within:outline focus-within:outline-2 focus-within:outline-teal-800 sm:w-72 sm:flex-none">
          <MagnifyingGlassIcon size={18} aria-hidden="true" />
          <span className="sr-only">Search reports</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reports or IDs"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none" />
        </label>
        <button type="button" disabled={loading} onClick={() => void reload()} className={pill + " bg-white text-slate-900 shadow-sm hover:bg-slate-50 disabled:opacity-50"}>
          <ArrowClockwiseIcon size={18} aria-hidden="true" />Refresh
        </button>
      </div>
    </div>

    {message && <div role="status" className="fixed inset-x-4 bottom-5 z-40 flex items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-5 text-white shadow-lg sm:inset-x-auto sm:left-6 sm:w-[440px] lg:left-[calc(15rem+2rem)]">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6CC79D]"><CheckIcon size={13} weight="bold" color="#0B1F17" aria-hidden="true" /></span>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setMessage("")} className="-m-1 rounded-full p-1 text-white/70 hover:text-white" aria-label="Dismiss message"><XIcon size={16} aria-hidden="true" /></button>
    </div>}

    {loadError && <div role="alert" className="flex max-w-xl gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-5 text-rose-800">
      <WarningCircleIcon size={22} weight="bold" className="shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-rose-950">Could not load reports. No previous review data is shown as current.</p>
        <p className="mt-1">{loadError}</p>
        <button type="button" onClick={() => void reload()} className={smallButton + " mt-3"}><ArrowClockwiseIcon size={16} aria-hidden="true" />Retry</button>
      </div>
    </div>}
    {loading && items.length === 0 && !loadError && <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">Loading reports…</p>}

    {!loading && !loadError && <div className="grid items-start gap-6 xl:h-[max(34rem,calc(100vh-20.5rem))] xl:grid-cols-[minmax(320px,440px)_minmax(0,1fr)] xl:items-stretch">
      <div className={"min-w-0 xl:flex xl:min-h-0 xl:flex-col " + (phoneView === "detail" ? "hidden xl:flex" : "")}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by review state">
          <button type="button" aria-pressed={stateFilter === "all"} onClick={() => setStateFilter("all")} className={chip(stateFilter === "all")}>All {counts.total}</button>
          <button type="button" aria-pressed={stateFilter === "unverified"} onClick={() => setStateFilter("unverified")} className={chip(stateFilter === "unverified")}>Needs review {counts.unverified}</button>
          <button type="button" aria-pressed={stateFilter === "corroborated"} onClick={() => setStateFilter("corroborated")} className={chip(stateFilter === "corroborated")}>Approved {counts.corroborated}</button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-slate-600 shadow-[inset_0_0_0_1px_#E6E9E7]">Category
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent font-semibold text-slate-900 focus:outline-none">
              <option value="all">All</option>
              {categories.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}
            </select>
          </label>
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-slate-600 shadow-[inset_0_0_0_1px_#E6E9E7]">Sort
            <select value={order} onChange={e => setOrder(e.target.value as "needs_review_first" | "newest" | "oldest")} className="bg-transparent font-semibold text-slate-900 focus:outline-none">
              <option value="needs_review_first">Needs review first</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          {filtersActive && <button type="button" onClick={() => { setQuery(""); setStateFilter("all"); setCategoryFilter("all"); setOrder("needs_review_first"); }}
            className="min-h-9 px-1 font-semibold text-teal-800 hover:underline">Clear filters</button>}
          <span className="ml-auto text-slate-500">{visibleItems.length} shown</span>
        </div>
        {visibleItems.length === 0 && <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">{items.length ? "No matching reports. Clear the filters to see everything." : "No reports yet. New resident reports appear here as soon as they are sent."}</p>}
        <ul aria-label="Incoming reports" className="flex flex-col gap-2.5 p-0.5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          {visibleItems.map(item => <li key={item.id}>
            <button type="button" id={"report-row-" + item.id} onClick={() => toggleReport(item.id)} aria-pressed={selectedReportId === item.id}
              className={"flex w-full items-start gap-2.5 rounded-2xl bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 " +
                (selectedReportId === item.id ? "ring-2 ring-teal-800" : "")}>
              <HazardMarker category={item.category} impact={item.impact} reviewState={item.reviewState} size={30} decorative />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <strong className="text-[15px] font-semibold text-slate-900">{categoryLabel(item.category)}</strong>
                  <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()} className="shrink-0 font-mono text-xs text-slate-500">{formatAge(item.createdAt, now)}</time>
                </span>
                <span className="mb-2 mt-0.5 block truncate text-sm text-slate-600">{item.description}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <SeverityChip impact={item.impact} /><ReviewStateChip reviewState={item.reviewState} />
                  {hasPhoto(item.id) && <span aria-label="Attached sample photo" className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500"><CameraIcon size={14} aria-hidden="true" />Photo</span>}
                </span>
              </span>
            </button>
          </li>)}
        </ul>
      </div>

      <div className={"min-w-0 flex-col rounded-3xl bg-white shadow-md xl:flex xl:h-full xl:overflow-hidden " + (phoneView === "list" ? "hidden" : "flex")}>
        <button type="button" onClick={() => setPhoneView("list")} className="flex min-h-11 items-center gap-1 px-5 pt-3 text-[15px] font-semibold text-teal-800 xl:hidden">
          <CaretLeftIcon size={16} aria-hidden="true" />Reports
        </button>
        {selectedReport && visibleItems.some(i => i.id === selectedReport.id) ? <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-3.5">
              <HazardMarker category={selectedReport.category} impact={selectedReport.impact} reviewState={selectedReport.reviewState} size={50} />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{categoryLabel(selectedReport.category)}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5"><SeverityChip impact={selectedReport.impact} /><ReviewStateChip reviewState={selectedReport.reviewState} /></div>
              </div>
              <p className="basis-full text-[13px] leading-[18px] text-slate-500 sm:basis-auto sm:text-right">
                <time dateTime={selectedReport.createdAt} title={new Date(selectedReport.createdAt).toLocaleString()}>Reported {formatAgeLong(selectedReport.createdAt, now)}</time>
                <span className="block font-mono">ID {selectedReport.id}</span>
              </p>
            </div>
            <p className="text-base leading-6 text-slate-900">{selectedReport.description}</p>

            <div className={"grid gap-3 " + (photoLarge ? "" : "md:grid-cols-[1fr_1.25fr]")}>
              <div className="min-w-0">
                <h3 className="sr-only">Submitted photo</h3>
                {selectedPhotoMode === "approved_inline" && <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                  <img src={"/api/v2/hazards/" + encodeURIComponent(selectedReport.id) + "/evidence/approved"}
                    alt={"Approved sample photo for " + categoryLabel(selectedReport.category)}
                    className={"w-full object-contain " + (photoLarge ? "max-h-[28rem]" : "h-44")} />
                  <PhotoSizeButton large={photoLarge} onToggle={() => setPhotoLarge(v => !v)} />
                  <span className="absolute bottom-2.5 left-2.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs text-white">Shown in the resident app</span>
                </div>}
                {selectedPhotoMode === "inspect_private" && (evidenceUrls[selectedReport.id]
                  ? <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                      <img src={evidenceUrls[selectedReport.id]} alt={"Private sample photo for " + categoryLabel(selectedReport.category)}
                        className={"w-full object-contain " + (photoLarge ? "max-h-[28rem]" : "h-44")} />
                      <PhotoSizeButton large={photoLarge} onToggle={() => setPhotoLarge(v => !v)} />
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs text-white">
                        <LockSimpleIcon size={14} aria-hidden="true" />Private sample photo · only operators can see it
                      </span>
                    </div>
                  : photoErrorId === selectedReport.id
                    ? <div role="alert" className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl bg-rose-50 p-4 text-center text-sm text-rose-800">Photo could not be opened.
                        <button type="button" onClick={() => void viewEvidence(selectedReport.id)} className={smallButton}><ArrowClockwiseIcon size={16} aria-hidden="true" />Retry photo</button></div>
                    : <p role="status" className="flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-600">{photoLoadingId === selectedReport.id ? "Loading attached image…" : "Preparing photo preview…"}</p>)}
                {selectedPhotoMode === "none" && <p className="flex h-44 items-center justify-center gap-2 rounded-2xl bg-slate-50 text-sm text-slate-600"><CameraIcon size={20} aria-hidden="true" />No photo attached</p>}
                {selectedPhotoMode === "unavailable" && <p role="status" className="flex h-44 items-center rounded-2xl bg-[#FDF4DC] p-4 text-sm leading-5 text-[#7A5100]">Photo information could not be verified. Refresh before making a photo visibility decision.</p>}
              </div>
              {!photoLarge && <ReportMiniMap longitude={selectedReport.longitude} latitude={selectedReport.latitude}
                category={selectedReport.category} impact={selectedReport.impact} reviewState={selectedReport.reviewState} />}
            </div>

            <LifecycleTrack reviewState={selectedReport.reviewState} />

            {selectedReport.reviewState === "unverified" && <div className="rounded-2xl bg-slate-50 p-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <BrainIcon size={20} className="shrink-0 text-slate-600" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-slate-600"><strong className="font-semibold text-slate-900">Similar reports</strong> · optional AI check. You make the decision.</p>
                <button type="button" disabled={aiBusy !== null} onClick={() => void runAiAnalysis(selectedReport.id)} className={smallButton}>
                  {aiBusy === selectedReport.id ? "Checking…" : "Find similar reports"}
                </button>
              </div>
              {aiErrors[selectedReport.id] && <p role="status" className="mt-2 text-[13px] text-rose-800">{aiErrors[selectedReport.id]}</p>}
              {aiResults[selectedReport.id] && <div className="mt-3 space-y-1 text-[13px] text-slate-700">
                {aiResults[selectedReport.id].matches.length
                  ? aiResults[selectedReport.id].matches.map(m => <p key={m.id}>Possible match: <span className="font-mono">{m.id}</span> · {(m.similarity * 100).toFixed(0)}% similar</p>)
                  : <p>No strong matches found.</p>}
                <p className="pt-1 text-slate-500">Advisory only; not automatic verification.</p>
              </div>}
            </div>}
          </div>

          {selectedReport.reviewState === "unverified" ? <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 rounded-b-3xl border-t border-slate-100 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-20px_rgba(15,21,19,.35)] sm:px-7 xl:shadow-none">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="min-w-[200px] flex-1">
                <span className="sr-only">Reason for decision</span>
                <input ref={reasonRef} value={notes[selectedReport.id] ?? ""} maxLength={400}
                  onChange={e => setNotes(old => ({ ...old, [selectedReport.id]: e.target.value }))}
                  placeholder={`Reason for decision (at least ${MIN_REASON_LENGTH} characters)`}
                  className="min-h-11 w-full rounded-full border border-slate-400 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500" />
              </label>
              <div className="flex flex-1 gap-2.5 sm:flex-none">
                <button ref={rejectRef} type="button" disabled={busy || !reasonIsValid(notes[selectedReport.id])}
                  onClick={() => void review(selectedReport.id, "rejected")}
                  className={pill + " flex-1 justify-center border border-rose-200 bg-white text-rose-800 hover:bg-rose-50 disabled:opacity-45 sm:flex-none"}>Reject report</button>
                <button ref={approveRef} type="button" disabled={busy || !reasonIsValid(notes[selectedReport.id])}
                  onClick={() => void review(selectedReport.id, "corroborated")}
                  className={pill + " flex-[1.3] justify-center bg-teal-800 text-white hover:bg-teal-700 disabled:opacity-45 sm:flex-none"}>
                  <CheckIcon size={16} weight="bold" aria-hidden="true" />Approve report</button>
              </div>
            </div>
            {photoStates?.[selectedReport.id] === "private_unreviewed" && <label className="flex min-h-9 items-center gap-2.5 text-sm text-slate-900">
              <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-teal-800"
                checked={publishPhotos[selectedReport.id] === true}
                onChange={e => setPublishPhotos(p => ({ ...p, [selectedReport.id]: e.target.checked }))} />
              <span>Also show this photo in the resident app after approval <span className="text-slate-500">(no faces, number plates or private details)</span></span>
            </label>}
            {decisionError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{decisionError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Approval means a person checked this fictional report, not that the hazard is verified.</span>
              <span className="hidden xl:inline" aria-hidden="true"><Kbd>J</Kbd>/<Kbd>K</Kbd> move · <Kbd>A</Kbd> approve · <Kbd>R</Kbd> reject · <Kbd>Enter</Kbd> confirm</span>
            </div>
          </div> : <p className="mt-auto border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:px-7">
            Decision recorded in the audit history. Approval does not change any road status.
          </p>}
        </> : <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-600">
          {counts.unverified === 0 && items.length > 0 ? <>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100"><CheckIcon size={28} weight="bold" className="text-teal-800" aria-hidden="true" /></span>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">All caught up</h2>
            <p className="max-w-sm text-[15px]">No reports are waiting for a decision. New resident reports appear here as soon as they are sent.</p>
            <button type="button" onClick={() => void reload()} className={smallButton + " mt-2"}><ArrowClockwiseIcon size={16} aria-hidden="true" />Check for new reports</button>
          </> : <>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100"><ClipboardTextIcon size={28} className="text-slate-600" aria-hidden="true" /></span>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">No report selected</h2>
            <p className="text-[15px]">Choose a report from the list to see its details.</p>
          </>}
        </div>}
      </div>
    </div>}
  </section>;
}

function PhotoSizeButton({ large, onToggle }: { large: boolean; onToggle: () => void }) {
  const Icon = large ? ArrowsInIcon : ArrowsOutIcon;
  return <button type="button" onClick={onToggle} aria-label={large ? "Show smaller photo" : "Show larger photo"}
    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm hover:bg-white">
    <Icon size={18} aria-hidden="true" />
  </button>;
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] text-slate-900">{children}</kbd>;
}
