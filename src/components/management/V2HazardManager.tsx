"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon, ArrowsInIcon, BrainIcon, CameraIcon, CaretLeftIcon, CheckIcon, ClipboardTextIcon, EyeIcon, FunnelIcon,
  CheckCircleIcon, TrashIcon,
  ImageIcon, LockSimpleIcon, MagnifyingGlassIcon, MagnifyingGlassPlusIcon, WarningCircleIcon, XCircleIcon, XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { filterReviewReports, reportReviewCounts } from "@/lib/v212-report-review-list";
import { type PrivatePhotoState } from "@/lib/v214-evidence-state";
import { reviewPhotoPresentation } from "@/lib/v216-review-photo-presentation";
import { categoryLabel, formatAge, formatAgeLong } from "@/lib/hazard-presentation";
import { formatWait, requestedId } from "@/lib/overview-queue";
import {
  decisionMessage, moveSelection, nextReportAfterDecision, reasonIsValid, reviewShortcut, MIN_REASON_LENGTH,
} from "@/lib/incident-review-queue";
import HazardMarker from "@/components/hazards/HazardMarker";
import CloseRoadsDialog, { type ClosureSource } from "@/components/closures/CloseRoadsDialog";
import RoadClearedDialog from "@/components/closures/RoadClearedDialog";
import DeleteReportDialog from "@/components/management/DeleteReportDialog";
import { resolvedMessage } from "@/lib/report-resolution";
import { closureAfterApproval, type ClosureKind } from "@/lib/road-closures";
import { ClosureSwatch } from "@/components/closures/ClosureLines";
import ReportMiniMap from "@/components/hazards/ReportMiniMap";
import { LifecycleTrack, ResolvedChip, ReviewStateChip, SeverityChip } from "@/components/hazards/HazardChips";

type RecordItem = { id: string; category: string; description: string; impact: string; reviewState: string; createdAt: string; latitude: number; longitude: number; resolvedAt?: string | null };
type AiResult = { provider: string; model: string; analysed: number; matches: { id: string; similarity: number; category: string }[]; disclaimer: string };


export default function V2HazardManager({ operatorKey, onCountsChange, onSummaryChange }: {
  operatorKey: string;
  onCountsChange?: (needsReview: number | null) => void;
  /** The one-line summary ("3 reports need your decision. Oldest waiting 2d 4h."), shown in the page header. */
  onSummaryChange?: (summary: string) => void;
}) {
  const [closing, setClosing] = useState(false); // "Close roads" dialog (roadmap 5.1)
  const [clearing, setClearing] = useState(false); // "Road cleared" dialog
  const [deleting, setDeleting] = useState(false); // "Delete report" dialog
  // Approve and close: the report just approved, when it says the road is blocked.
  const [afterApprove, setAfterApprove] = useState<{ source: ClosureSource; start: { kind: ClosureKind; reason: string } } | null>(null);
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
  // A link such as ?report=<id> (from the Overview) opens that report once, on the first load.
  const firstLoadRef = useRef(true);
  /** `prefer` picks the report to open after a decision; null means none are left. */
  async function reload(prefer?: { id: string | null }) {
    setLoading(true); setLoadError("");
    try {
      const [r, photoResponse] = await Promise.all([
        fetch("/api/v2/hazards?include=resolved", { cache: "no-store" }),
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
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        const requested = requestedId(window.location.search, "report");
        if (requested && data.reports.some(item => item.id === requested)) {
          prefer = { id: requested };
          setPhoneView("detail");
        }
      }
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
    const item = items.find(entry => entry.id === id);
    const category = categoryLabel(item?.category ?? "");
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
      const start = decision === "corroborated" && item ? closureAfterApproval(item.impact, item.category, notes[id] ?? "") : null;
      if (start && item) setAfterApprove({ start, source: { kind: "report", id: item.id, title: categoryLabel(item.category), summary: item.description,
        category: item.category, impact: item.impact, points: [[item.longitude, item.latitude]] } });
      window.dispatchEvent(new Event("township-hazards-updated"));
      selectReport(next);
      await reload({ id: next });
    } catch (e) { setDecisionError(e instanceof Error ? e.message : "Could not review"); }
    finally { setBusy(false); }
  }
  const hasPhoto = (id: string) => photoStates !== null && photoStates[id] !== undefined && photoStates[id] !== "none";
  const filterChip = (active: boolean) => "inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-small font-medium transition-colors " +
    (active ? "border-night bg-night text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900");
  const summary = loadError ? "Reports could not be loaded"
    : counts.unverified === 0 ? "Nothing needs your decision right now"
    : `${counts.unverified} ${counts.unverified === 1 ? "report needs" : "reports need"} your decision.` +
      (oldestWaiting ? ` ${counts.unverified === 1 ? "Waiting" : "Oldest waiting"} ${formatWait(oldestWaiting, now)}.` : "");
  useEffect(() => { onSummaryChange?.(loading && items.length === 0 ? "Loading reports…" : summary); }, [summary, loading, items.length]);
  const sortLabel = { needs_review_first: "needs review first, then newest", newest: "newest first", oldest: "oldest first" }[order];
  const clearFilters = () => { setQuery(""); setStateFilter("all"); setCategoryFilter("all"); setOrder("needs_review_first"); };

  return <section ref={rootRef} aria-label="Report review" className="scroll-mt-20 pb-6">
    <p className="sr-only" aria-live="polite">{loading && items.length === 0 ? "Loading reports…" : summary}</p>

    {message && <div role="status" className="fixed inset-x-4 bottom-24 z-40 flex items-start gap-3 rounded-xl bg-night px-4 py-3 text-small leading-5 text-white shadow-lg sm:inset-x-auto sm:left-8 sm:w-[440px] lg:bottom-6">
      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-night-mint"><CheckIcon size={14} weight="bold" color="#0B1F17" aria-hidden="true" /></span>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setMessage("")} className="-m-2 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white" aria-label="Dismiss message"><XIcon size={16} aria-hidden="true" /></button>
    </div>}

    {afterApprove ? <CloseRoadsDialog open onOpenChange={value => { if (!value) setAfterApprove(null); }} operatorKey={operatorKey}
      source={afterApprove.source} start={afterApprove.start}
      onDone={() => setMessage(`${afterApprove.source.title}: road closed. Residents see it on the map, and their way home goes around it.`)} /> : null}

    {loadError && <div role="alert" className="flex max-w-xl gap-3 rounded-xl bg-rose-50 p-4 text-small leading-5 text-rose-800">
      <WarningCircleIcon size={20} weight="bold" className="shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-rose-950">Could not load reports. No previous review data is shown as current.</p>
        <p className="mt-1">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={() => void reload()} className="mt-3"><ArrowClockwiseIcon size={16} aria-hidden="true" />Retry</Button>
      </div>
    </div>}
    {loading && items.length === 0 && !loadError && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-small text-slate-600">Loading reports…</p>}

    {!loading && !loadError && <div className="grid items-start gap-5 xl:h-[max(36rem,calc(100vh-16rem))] xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)] xl:items-stretch">
      <div className={"min-w-0 xl:flex xl:min-h-0 xl:flex-col " + (phoneView === "detail" ? "hidden xl:flex" : "")}>
        <div className="mb-3 flex items-center gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search reports by description, category or ID</span>
            <MagnifyingGlassIcon size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reports or IDs" className="pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden" />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"><XCircleIcon size={20} aria-hidden="true" /></button> : null}
          </label>
          <Button variant="secondary" size="icon" disabled={loading} onClick={() => void reload()} aria-label="Refresh reports"><ArrowClockwiseIcon size={20} aria-hidden="true" /></Button>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by review state">
            <button type="button" aria-pressed={stateFilter === "all"} onClick={() => setStateFilter("all")} className={filterChip(stateFilter === "all")}>All <span className="font-semibold">{counts.total}</span></button>
            <button type="button" aria-pressed={stateFilter === "unverified"} onClick={() => setStateFilter("unverified")} className={filterChip(stateFilter === "unverified")}>Needs review <span className="font-semibold">{counts.unverified}</span></button>
            <button type="button" aria-pressed={stateFilter === "corroborated"} onClick={() => setStateFilter("corroborated")} className={filterChip(stateFilter === "corroborated")}>Approved <span className="font-semibold">{counts.corroborated}</span></button>
          </div>
          <label className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-small text-slate-600">
            <FunnelIcon size={16} aria-hidden="true" /><span className="sr-only">Category</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent font-medium text-slate-900 focus:outline-none">
              <option value="all">All categories</option>
              {categories.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}
            </select>
          </label>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-slate-600">
          <label className="inline-flex items-center gap-1">Sorted by
            <select value={order} onChange={e => setOrder(e.target.value as "needs_review_first" | "newest" | "oldest")} aria-label={`Sort order, now ${sortLabel}`}
              className="min-h-9 rounded-lg bg-transparent pr-1 font-semibold text-slate-900 hover:bg-slate-100 focus:outline-none">
              <option value="needs_review_first">needs review first</option>
              <option value="newest">newest first</option>
              <option value="oldest">oldest first</option>
            </select>
          </label>
          {filtersActive && <button type="button" onClick={clearFilters} className="min-h-9 font-semibold text-teal-800 hover:underline">Clear filters</button>}
          <span className="ml-auto whitespace-nowrap">{visibleItems.length} {visibleItems.length === 1 ? "report" : "reports"}</span>
        </div>
        {visibleItems.length === 0 && <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-small text-slate-600">
          {items.length ? <>No matching reports for these filters. <button type="button" onClick={clearFilters} className="font-semibold text-teal-800 hover:underline">Clear filters</button></>
            : "No reports yet. New resident reports appear here as soon as they are sent."}
        </div>}
        <ul aria-label="Incoming reports" className="flex flex-col gap-2 p-1 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          {visibleItems.map(item => {
            const selected = selectedReportId === item.id;
            const waiting = item.reviewState === "unverified";
            return <li key={item.id}>
              <button type="button" id={"report-row-" + item.id} onClick={() => toggleReport(item.id)} aria-pressed={selected}
                className={"flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-[#1F5A94] " +
                  (selected ? "border-[#B9DCCB] bg-[#EAF6F0] shadow-[inset_4px_0_0_#0B7350]" : "border-slate-200 bg-white hover:border-slate-300")}>
                <HazardMarker category={item.category} impact={item.impact} reviewState={item.reviewState} size={30} decorative />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <strong className="text-heading font-semibold text-slate-900">{categoryLabel(item.category)}</strong>
                    <span className="shrink-0 whitespace-nowrap">
                      <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()} className="font-display text-heading font-semibold tabular-nums text-slate-900">{waiting ? formatWait(item.createdAt, now) : formatAge(item.createdAt, now)}</time>
                      <span className="ml-1 text-caption text-slate-600">{waiting ? "waiting" : "ago"}</span>
                    </span>
                  </span>
                  <span className="mb-2 mt-1 block truncate text-small text-slate-600">{item.description}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <SeverityChip impact={item.impact} />{item.resolvedAt ? <ResolvedChip /> : <ReviewStateChip reviewState={item.reviewState} />}
                    {hasPhoto(item.id) && <span aria-label="Attached sample photo" className="ml-auto inline-flex items-center gap-1 text-caption text-slate-600"><CameraIcon size={14} aria-hidden="true" />Photo</span>}
                  </span>
                </span>
              </button>
            </li>;
          })}
        </ul>
      </div>

      <div className={"min-w-0 flex-col rounded-xl border border-slate-200 bg-white xl:flex xl:h-full xl:overflow-hidden " + (phoneView === "list" ? "hidden" : "flex")}>
        <button type="button" onClick={() => setPhoneView("list")} className="flex min-h-11 items-center gap-1 px-5 pt-3 text-body font-semibold text-teal-800 xl:hidden">
          <CaretLeftIcon size={16} aria-hidden="true" />All reports
        </button>
        {selectedReport && visibleItems.some(i => i.id === selectedReport.id) ? <>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:px-6">
            <header className="flex flex-wrap items-start gap-4">
              <HazardMarker category={selectedReport.category} impact={selectedReport.impact} reviewState={selectedReport.reviewState} size={48} />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-title font-semibold text-slate-900">{categoryLabel(selectedReport.category)}</h2>
                <p className="text-small text-slate-600"><time dateTime={selectedReport.createdAt} title={new Date(selectedReport.createdAt).toLocaleString()}>Reported {formatAgeLong(selectedReport.createdAt, now)}, {reportedAt(selectedReport.createdAt, now)}</time></p>
                <div className="mt-2 flex flex-wrap gap-2"><SeverityChip impact={selectedReport.impact} />{selectedReport.resolvedAt ? <ResolvedChip /> : <ReviewStateChip reviewState={selectedReport.reviewState} />}</div>
              </div>
              <div className="text-right">
                {selectedReport.reviewState === "unverified" ? <>
                  <p className="font-display text-title font-semibold tabular-nums text-slate-900">{formatWait(selectedReport.createdAt, now)}</p>
                  <p className="text-caption text-slate-600">waiting for review</p>
                </> : null}
                <p className="mt-1 font-mono text-caption text-slate-600">ID {selectedReport.id}</p>
                <Button variant="ghost" size="sm" className="mt-1 text-rose-800 hover:bg-rose-50 hover:text-rose-900" onClick={() => setDeleting(true)}>
                  <TrashIcon size={16} aria-hidden="true" />Delete…
                </Button>
                <DeleteReportDialog open={deleting} onOpenChange={setDeleting} reportId={selectedReport.id} title={categoryLabel(selectedReport.category)} operatorKey={operatorKey}
                  onDone={removed => { setMessage(`${categoryLabel(selectedReport.category)} report deleted${removed ? `, with ${removed} road ${removed === 1 ? "closure" : "closures"}` : ""}.`); void reload(); }} />
              </div>
            </header>
            <p className="text-body leading-6 text-slate-900">{selectedReport.description}</p>

            <section aria-labelledby="evidence-heading">
              <h3 id="evidence-heading" className="mb-2 text-small font-semibold text-slate-600">Evidence</h3>
              {selectedPhotoMode === "none" ? <>
                {/* No photo: a short note, and the map takes the space instead of an empty box. */}
                <p className="mb-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-small text-slate-600">
                  <ImageIcon size={20} className="shrink-0" aria-hidden="true" />
                  <span><strong className="block font-semibold text-slate-900">No photo for this report</strong>Decide from the description and the location</span>
                </p>
                <ReportMiniMap longitude={selectedReport.longitude} latitude={selectedReport.latitude}
                  category={selectedReport.category} impact={selectedReport.impact} reviewState={selectedReport.reviewState} />
              </> : <div className={"grid gap-3 " + (photoLarge ? "" : "md:grid-cols-[1.4fr_1fr]")}>
                <div className="min-w-0">
                  {selectedPhotoMode === "approved_inline" && <div className="relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={"/api/v2/hazards/" + encodeURIComponent(selectedReport.id) + "/evidence/approved"}
                      alt={"Approved sample photo for " + categoryLabel(selectedReport.category)}
                      className={"w-full object-contain " + (photoLarge ? "max-h-[28rem]" : "h-44")} />
                    <PhotoSizeButton large={photoLarge} onToggle={() => setPhotoLarge(v => !v)} />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-night/90 px-3 py-1 text-caption text-white"><EyeIcon size={14} aria-hidden="true" />Shown to residents</span>
                  </div>}
                  {selectedPhotoMode === "inspect_private" && (evidenceUrls[selectedReport.id]
                    ? <div className="relative overflow-hidden rounded-xl bg-slate-100">
                        <img src={evidenceUrls[selectedReport.id]} alt={"Private sample photo for " + categoryLabel(selectedReport.category)}
                          className={"w-full object-contain " + (photoLarge ? "max-h-[28rem]" : "h-44")} />
                        <PhotoSizeButton large={photoLarge} onToggle={() => setPhotoLarge(v => !v)} />
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-night/90 px-3 py-1 text-caption text-white">
                          <LockSimpleIcon size={14} aria-hidden="true" />Operators only
                        </span>
                      </div>
                    : photoErrorId === selectedReport.id
                      ? <div role="alert" className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl bg-rose-50 p-4 text-center text-small text-rose-800">Photo could not be opened.
                          <Button variant="secondary" size="sm" onClick={() => void viewEvidence(selectedReport.id)}><ArrowClockwiseIcon size={16} aria-hidden="true" />Retry photo</Button></div>
                      : <p role="status" className="flex h-44 items-center justify-center rounded-xl bg-slate-100 text-small text-slate-600">{photoLoadingId === selectedReport.id ? "Loading the photo…" : "Preparing photo preview…"}</p>)}
                  {selectedPhotoMode === "unavailable" && <p role="status" className="flex h-44 items-center rounded-xl bg-slate-100 p-4 text-small leading-5 text-slate-700">Photo information could not be verified. Refresh before deciding whether residents may see a photo.</p>}
                </div>
                {!photoLarge && <ReportMiniMap longitude={selectedReport.longitude} latitude={selectedReport.latitude}
                  category={selectedReport.category} impact={selectedReport.impact} reviewState={selectedReport.reviewState} />}
              </div>}
            </section>

            <section aria-labelledby="progress-heading">
              <h3 id="progress-heading" className="mb-2 text-small font-semibold text-slate-600">Progress</h3>
              <LifecycleTrack reviewState={selectedReport.reviewState} incidentStatus={selectedReport.resolvedAt ? "resolved" : undefined} />
            </section>

            {selectedReport.reviewState === "unverified" && <section aria-labelledby="support-heading" className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <BrainIcon size={20} className="shrink-0 text-slate-600" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-small text-slate-600"><strong id="support-heading" className="font-semibold text-slate-900">Similar reports</strong>, an optional AI check. You make the decision.</p>
                <Button variant="secondary" size="sm" disabled={aiBusy !== null} onClick={() => void runAiAnalysis(selectedReport.id)}>
                  {aiBusy === selectedReport.id ? "Checking…" : "Find similar reports"}
                </Button>
              </div>
              {aiErrors[selectedReport.id] && <p role="status" className="mt-2 text-caption text-rose-800">{aiErrors[selectedReport.id]}</p>}
              {aiResults[selectedReport.id] && <div className="mt-3 space-y-1 text-caption text-slate-700">
                {aiResults[selectedReport.id].matches.length
                  ? aiResults[selectedReport.id].matches.map(m => <p key={m.id}>Possible match: <span className="font-mono">{m.id}</span>, {(m.similarity * 100).toFixed(0)}% similar</p>)
                  : <p>No strong matches found</p>}
                <p className="pt-1 text-slate-600">Advisory only, not automatic verification</p>
              </div>}
            </section>}
          </div>

          {selectedReport.reviewState === "unverified" ? <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-auto flex flex-col gap-3 border-t lg:bottom-0 border-slate-200 bg-slate-50 px-5 py-4 shadow-[0_-12px_24px_-20px_rgba(17,24,32,.35)] sm:px-6 xl:shadow-none">
            <div>
              <label htmlFor={"reason-" + selectedReport.id} className="flex flex-wrap items-baseline gap-x-2 text-small font-semibold text-slate-900">
                Reason for your decision<span className="font-normal text-slate-600">Required, at least {MIN_REASON_LENGTH} characters. Kept in the audit log.</span>
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input id={"reason-" + selectedReport.id} ref={reasonRef} value={notes[selectedReport.id] ?? ""} maxLength={400} className="min-w-[200px] flex-1"
                  onChange={e => setNotes(old => ({ ...old, [selectedReport.id]: e.target.value }))}
                  placeholder="For example: matches the photo and an earlier report" />
                <div className="flex flex-1 gap-3 sm:flex-none">
                  <Button ref={rejectRef} variant="reject" disabled={busy || !reasonIsValid(notes[selectedReport.id])}
                    onClick={() => void review(selectedReport.id, "rejected")} className="flex-1 sm:flex-none">{busy ? "Saving…" : "Reject report"}</Button>
                  <Button ref={approveRef} variant="approve" disabled={busy || !reasonIsValid(notes[selectedReport.id])}
                    onClick={() => void review(selectedReport.id, "corroborated")} className="flex-[1.5] sm:flex-none">
                    <CheckIcon size={16} weight="bold" aria-hidden="true" />{busy ? "Saving…" : "Approve report"}</Button>
                </div>
              </div>
            </div>
            {decisionError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-small text-rose-800">{decisionError}</p>}
            <div className="flex items-start gap-3">
              {photoStates?.[selectedReport.id] === "private_unreviewed" ? <div className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                <Checkbox id={"publish-" + selectedReport.id} className="mt-1" checked={publishPhotos[selectedReport.id] === true}
                  onCheckedChange={value => setPublishPhotos(p => ({ ...p, [selectedReport.id]: value === true }))} />
                <label htmlFor={"publish-" + selectedReport.id} className="text-small text-slate-700">
                  <strong className="block font-semibold text-slate-900">Public visibility</strong>
                  Also show this photo to residents after approval. Only if it shows no faces, number plates or private details.
                </label>
              </div> : <p className="min-w-0 flex-1 text-caption text-slate-600">Approval means a person checked this fictional report, not that the hazard is verified.</p>}
              <ShortcutHelp />
            </div>
          </div> : <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
            <p className="min-w-0 flex-1 text-small text-slate-600">Decision recorded in the audit history. {selectedReport.resolvedAt ? "Resolved: the road was cleared and its closures ended." : <>Approval does not change any road status.{selectedReport.reviewState === "corroborated" ? " When the road is clear again, mark it cleared." : ""}</>}</p>
            {selectedReport.reviewState === "corroborated" && !selectedReport.resolvedAt ? <>
              <Button variant="secondary" onClick={() => setClosing(true)}><ClosureSwatch />Close roads…</Button>
              <Button variant="secondary" onClick={() => setClearing(true)}><CheckCircleIcon size={16} weight="bold" aria-hidden="true" />Road cleared…</Button>
              <RoadClearedDialog open={clearing} onOpenChange={setClearing} reportId={selectedReport.id} title={categoryLabel(selectedReport.category)} operatorKey={operatorKey}
                onDone={ended => { setMessage(resolvedMessage(categoryLabel(selectedReport.category), ended)); void reload({ id: selectedReport.id }); }} />
            </> : null}
            {selectedReport.reviewState === "corroborated" ? <CloseRoadsDialog open={closing} onOpenChange={setClosing} operatorKey={operatorKey}
              source={{ kind: "report", id: selectedReport.id, title: categoryLabel(selectedReport.category), summary: selectedReport.description, category: selectedReport.category, impact: selectedReport.impact, points: [[selectedReport.longitude, selectedReport.latitude]] }} /> : null}
          </div>}
        </> : <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-600">
          {counts.unverified === 0 && items.length > 0 ? <>
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100"><CheckIcon size={24} weight="bold" className="text-teal-800" aria-hidden="true" /></span>
            <h2 className="mt-1 text-heading font-semibold text-slate-900">All caught up</h2>
            <p className="max-w-sm text-body">No reports are waiting for review. New resident reports appear here as soon as they are sent.</p>
            <Button variant="secondary" size="sm" onClick={() => void reload()} className="mt-2"><ArrowClockwiseIcon size={16} aria-hidden="true" />Check for new reports</Button>
          </> : <>
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100"><ClipboardTextIcon size={24} className="text-slate-600" aria-hidden="true" /></span>
            <h2 className="mt-1 text-heading font-semibold text-slate-900">No report selected</h2>
            <p className="text-body">Choose a report from the list to see its details</p>
          </>}
        </div>}
      </div>
    </div>}
  </section>;
}

/** "today at 16:13", "yesterday at 09:05" or "on 18 November at 11:52", in the operator's clock. */
function reportedAt(createdAt: string, now: number): string {
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return "";
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (at.getTime() >= today.getTime()) return `today at ${time}`;
  if (at.getTime() >= today.getTime() - 86_400_000) return `yesterday at ${time}`;
  return `on ${at.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} at ${time}`;
}

/** Keyboard shortcuts, kept out of the way behind a "?" button (they still work without opening it). */
function ShortcutHelp() {
  return <Dialog>
    <DialogTrigger className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-small font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 xl:flex" aria-label="Keyboard shortcuts">?</DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>They work while the review list is open and you are not typing.</DialogDescription></DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-body">
        <dt><Kbd>J</Kbd> <Kbd>K</Kbd></dt><dd>Next or previous report</dd>
        <dt><Kbd>A</Kbd></dt><dd>Move to Approve (nothing is saved yet)</dd>
        <dt><Kbd>R</Kbd></dt><dd>Move to Reject (nothing is saved yet)</dd>
        <dt><Kbd>Enter</Kbd></dt><dd>Confirm the focused button</dd>
      </dl>
      <p className="text-small text-slate-600">A reason of at least {MIN_REASON_LENGTH} characters is needed before either decision.</p>
    </DialogContent>
  </Dialog>;
}

function PhotoSizeButton({ large, onToggle }: { large: boolean; onToggle: () => void }) {
  const Icon = large ? ArrowsInIcon : MagnifyingGlassPlusIcon;
  return <button type="button" onClick={onToggle} aria-pressed={large}
    className="absolute bottom-3 right-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-small font-semibold text-slate-900 shadow-sm hover:bg-slate-50">
    <Icon size={16} aria-hidden="true" />{large ? "Smaller" : "Enlarge"}
  </button>;
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded-md border border-b-2 border-slate-300 bg-slate-100 px-2 py-px font-sans text-caption font-medium text-slate-900">{children}</kbd>;
}
