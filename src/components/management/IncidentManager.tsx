"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, BrainIcon, CaretDownIcon, CaretLeftIcon, LinkBreakIcon, MagnifyingGlassIcon, PlusIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import IncidentRoadCandidates from "@/components/management/IncidentRoadCandidates";
import { filterIncidentGroups, incidentStatusCounts } from "@/lib/v212-incident-list";
import { AI_REVIEW_REMINDER, similarityLabel, canManuallyLinkSuggestion } from "@/lib/v214-ai-review-guidance";
import { categoryLabel, formatAge, formatAgeLong, highestSeverity, incidentStatusLabel } from "@/lib/hazard-presentation";
import { reasonIsValid } from "@/lib/incident-review-queue";
import HazardMarker from "@/components/hazards/HazardMarker";
import { SeverityChip, StatusChip } from "@/components/hazards/HazardChips";

type Report = { id: string; category: string; description: string; reviewState: string; createdAt: string; impact?: string };
type Incident = {
  id: string; title: string; category: string; status: string; reviewNote: string; possibleRoad: string | null; createdAt: string;
  reports: { reportId: string; linkedAt: string; report: { category: string; description: string; reviewState: string; createdAt?: string; impact?: string } }[];
};
type Suggestions = { provider: string; model: string; candidates: { id: string; description: string; similarity: number }[]; disclaimer: string };

const pill = "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-45";
const smallButton = "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3.5 text-[13px] font-semibold text-slate-900 shadow-[inset_0_0_0_1px_#E6E9E7] hover:bg-slate-50 disabled:opacity-45";
const field = "mt-1 min-h-11 w-full rounded-[10px] border border-slate-400 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-500";
const label = "block text-[13px] font-semibold text-slate-600";

export default function IncidentManager({ operatorKey, onCountsChange }: { operatorKey: string; onCountsChange?: (underReview: number | null) => void }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [creating, setCreating] = useState(false);
  const [newReport, setNewReport] = useState(""); const [title, setTitle] = useState(""); const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({}), [roads, setRoads] = useState<Record<string, string>>({}), [statuses, setStatuses] = useState<Record<string, string>>({}), [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestions>>({});
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [phoneView, setPhoneView] = useState<"list" | "detail">("list");
  const rootRef = useRef<HTMLElement>(null);
  async function suggest(id: string) {
    setSuggestBusy(id); setError("");
    try {
      const response = await fetch("/api/v2/incidents/" + id + "/suggestions", { method: "POST", headers: { "x-demo-operator-key": operatorKey } });
      const data = await response.json() as Suggestions & { error?: string };
      if (!response.ok) throw Error(data.error || "AI suggestions unavailable");
      setSuggestions(old => ({ ...old, [id]: data }));
    } catch (e) { setError(e instanceof Error ? e.message : "AI unavailable"); }
    finally { setSuggestBusy(null); }
  }
  async function reload() {
    setLoading(true); setLoadError("");
    try {
      const [a, b] = await Promise.all([fetch("/api/v2/incidents", { headers: { "x-demo-operator-key": operatorKey }, cache: "no-store" }), fetch("/api/v2/hazards", { cache: "no-store" })]);
      if (!a.ok || !b.ok) throw Error("Unable to load incident groups. Check that the local server and database are running.");
      const incidentsData = await a.json() as { incidents: Incident[] }, reportsData = await b.json() as { reports: Report[] };
      setIncidents(incidentsData.incidents); setReports(reportsData.reports.filter(r => r.reviewState !== "rejected"));
      setSelectedIncidentId(old => incidentsData.incidents.some(i => i.id === old) ? old : incidentsData.incidents[0]?.id ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to refresh incident groups");
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [operatorKey]);
  // Report decisions made in the other tab change which reports can be grouped.
  useEffect(() => {
    const refresh = () => void reload();
    window.addEventListener("township-hazards-updated", refresh);
    return () => window.removeEventListener("township-hazards-updated", refresh);
  }, [operatorKey]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 8000); return () => clearTimeout(timer); }, [message]);
  const assigned = new Set(incidents.flatMap(i => i.reports.map(r => r.reportId)));
  const available = reports.filter(r => !assigned.has(r.id));
  const counts = incidentStatusCounts(incidents);
  useEffect(() => { onCountsChange?.(loadError ? null : loading && incidents.length === 0 ? null : counts.underReview); }, [counts.underReview, loading, loadError]);
  const categories = [...new Set(incidents.map(i => i.category))].sort();
  const visible = filterIncidentGroups(incidents, { query, status: statusFilter, category: categoryFilter, sort });
  const selected = incidents.find(i => i.id === selectedIncidentId) ?? null;
  const filtersActive = query !== "" || statusFilter !== "all" || categoryFilter !== "all" || sort !== "newest";

  async function request(path: string, method: "POST" | "PATCH" | "DELETE", body: object) {
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await fetch(path, { method, headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey }, body: JSON.stringify(body) });
      const data = await res.json() as { error?: string; incident?: { id: string } };
      if (!res.ok) throw Error(data.error || "Operator action failed");
      setMessage("Incident decision recorded in the audit history. No road status changed.");
      setSuggestions({});
      if (method === "POST" && path === "/api/v2/incidents") {
        setCreating(false); setNewReport(""); setTitle(""); setReason("");
        if (data.incident?.id) setSelectedIncidentId(data.incident.id);
      }
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setBusy(false); }
  }
  function open(id: string) {
    setSelectedIncidentId(id); setCreating(false); setError(""); setPhoneView("detail");
    if (!window.matchMedia("(min-width: 1280px)").matches) requestAnimationFrame(() => rootRef.current?.scrollIntoView({ block: "start" }));
  }
  const chip = (active: boolean) => "inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors " +
    (active ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-600 hover:text-slate-900");
  const groupSeverity = (incident: Incident) => highestSeverity(incident.reports.map(link => link.report.impact)).key;
  const markerState = (incident: Incident) => (incident.status === "under_review" ? "unverified" : "corroborated");

  return <section ref={rootRef} aria-label="Incident groups" className="pb-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[15px] text-slate-600" aria-live="polite">{loadError ? "Incident groups could not be loaded" : loading && incidents.length === 0 ? "Loading incident groups…" :
        counts.underReview === 0 ? "No incident group is under review" : `${counts.underReview} incident ${counts.underReview === 1 ? "group" : "groups"} under review`}</p>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-slate-100 px-4 text-sm text-slate-500 focus-within:outline focus-within:outline-2 focus-within:outline-teal-800 sm:w-72 sm:flex-none">
          <MagnifyingGlassIcon size={18} aria-hidden="true" />
          <span className="sr-only">Search by title, ID or possible road</span>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search groups, IDs or roads"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none" />
        </label>
        <button type="button" disabled={loading} onClick={() => void reload()} className={pill + " bg-white text-slate-900 shadow-sm hover:bg-slate-50"}>
          <ArrowClockwiseIcon size={18} aria-hidden="true" />Refresh
        </button>
      </div>
    </div>

    {message && <p role="status" className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</p>}
    {loadError ? <div role="alert" className="flex max-w-xl gap-3 rounded-2xl bg-rose-50 p-4 text-sm leading-5 text-rose-800">
      <WarningCircleIcon size={22} weight="bold" className="shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold text-rose-950">Incident groups could not be refreshed. Previously displayed information is hidden because it may be outdated.</p>
        <p className="mt-1">{loadError}</p>
        <button type="button" onClick={() => void reload()} disabled={loading} className={smallButton + " mt-3"}><ArrowClockwiseIcon size={16} aria-hidden="true" />Retry loading</button>
      </div>
    </div> : null}
    {loading && incidents.length === 0 && !loadError ? <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">Loading incident groups…</p> : null}

    {!loadError && !(loading && incidents.length === 0) ? <div className="grid items-start gap-6 xl:h-[max(34rem,calc(100vh-20.5rem))] xl:grid-cols-[minmax(320px,440px)_minmax(0,1fr)] xl:items-stretch">
      <div className={"min-w-0 xl:flex xl:min-h-0 xl:flex-col " + (phoneView === "detail" ? "hidden xl:flex" : "")}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          <button type="button" aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")} className={chip(statusFilter === "all")}>All {counts.total}</button>
          <button type="button" aria-pressed={statusFilter === "under_review"} onClick={() => setStatusFilter("under_review")} className={chip(statusFilter === "under_review")}>Under review {counts.underReview}</button>
          <button type="button" aria-pressed={statusFilter === "corroborated"} onClick={() => setStatusFilter("corroborated")} className={chip(statusFilter === "corroborated")}>Corroborated {counts.corroborated}</button>
          <button type="button" aria-pressed={statusFilter === "resolved"} onClick={() => setStatusFilter("resolved")} className={chip(statusFilter === "resolved")}>Resolved {counts.resolved}</button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-slate-600 shadow-[inset_0_0_0_1px_#E6E9E7]">Category
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent font-semibold text-slate-900 focus:outline-none">
              <option value="all">All</option>{categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </label>
          <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 font-semibold text-slate-600 shadow-[inset_0_0_0_1px_#E6E9E7]">Order
            <select value={sort} onChange={e => setSort(e.target.value as "newest" | "oldest")} className="bg-transparent font-semibold text-slate-900 focus:outline-none">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select>
          </label>
          {filtersActive ? <button type="button" className="min-h-9 px-1 font-semibold text-teal-800 hover:underline" onClick={() => { setQuery(""); setStatusFilter("all"); setCategoryFilter("all"); setSort("newest"); }}>Clear filters</button> : null}
          <span className="ml-auto text-slate-500">{visible.length} of {counts.total} shown</span>
        </div>
        {incidents.length > 0 && visible.length === 0 ? <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">No incident groups match these filters. Clear the filters to see the full list.</p> : null}
        {!loading&&!loadError&&incidents.length===0 ? <p className="rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-sm">No incident groups yet. Start one from a reviewed report with “New incident group”.</p> : null}
        <ul className="flex flex-col gap-2.5 p-0.5 xl:min-h-0 xl:overflow-y-auto" aria-label="Incident groups list">
          {!loadError&&visible.map(incident => <li key={incident.id}>
            <button type="button" onClick={() => open(incident.id)} aria-pressed={selectedIncidentId === incident.id && !creating}
              className={"flex w-full items-start gap-2.5 rounded-2xl bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 " +
                (selectedIncidentId === incident.id && !creating ? "ring-2 ring-teal-800" : "")}>
              <HazardMarker category={incident.category} impact={groupSeverity(incident)} reviewState={markerState(incident)} size={30} decorative />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <strong className="truncate text-[15px] font-semibold text-slate-900">{incident.title}</strong>
                  <span className="shrink-0 font-mono text-xs text-slate-500">{incident.reports.length} {incident.reports.length === 1 ? "report" : "reports"}</span>
                </span>
                <span className="mb-2 mt-0.5 block text-sm text-slate-600">{categoryLabel(incident.category)} · {formatAge(incident.createdAt)} old</span>
                <span className="flex flex-wrap gap-1.5"><SeverityChip impact={groupSeverity(incident)} /><StatusChip>{incidentStatusLabel(incident.status)}</StatusChip></span>
              </span>
            </button>
          </li>)}
        </ul>
        <button type="button" onClick={() => { setCreating(true); setError(""); setPhoneView("detail"); }} aria-pressed={creating}
          className={pill + " mt-4 self-start bg-slate-900 px-5 text-white hover:bg-slate-800"}><PlusIcon size={18} aria-hidden="true" />New incident group</button>
      </div>

      <div className={"min-w-0 flex-col rounded-3xl bg-white shadow-md xl:flex xl:h-full xl:overflow-hidden " + (phoneView === "list" ? "hidden" : "flex")}>
        <button type="button" onClick={() => setPhoneView("list")} className="flex min-h-11 items-center gap-1 px-5 pt-3 text-[15px] font-semibold text-teal-800 xl:hidden">
          <CaretLeftIcon size={16} aria-hidden="true" />Incident groups
        </button>
        {error ? <p role="alert" className="mx-5 mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-7">{error}</p> : null}

        {creating ? <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:px-7 sm:py-6" onSubmit={e => { e.preventDefault(); void request("/api/v2/incidents", "POST", { reportId: newReport, title, note: reason }); }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">New incident group</h2>
              <p className="mt-1 text-sm text-slate-600">Create a fictional incident group from one ungrouped report. Nothing is grouped automatically.</p>
            </div>
            <button type="button" onClick={() => setCreating(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Cancel new incident group"><XIcon size={20} aria-hidden="true" /></button>
          </div>
          <label className={label}>Starting report
            <select className={field} value={newReport} onChange={e => setNewReport(e.target.value)}>
              <option value="">Select an ungrouped report</option>{available.map(r => <option key={r.id} value={r.id}>{categoryLabel(r.category)} · {r.description.slice(0, 70)}</option>)}
            </select>
          </label>
          <label className={label}>Incident title<input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Flooded junction cluster" className={field} /></label>
          <label className={label}>Operator reason<input maxLength={400} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why these reports belong together" className={field} /></label>
          <p className="text-xs text-slate-500">Title and reason need at least 8 characters each.</p>
          <div><button type="submit" disabled={busy || !newReport || title.trim().length < 8 || reason.trim().length < 8} className={pill + " bg-teal-800 text-white hover:bg-teal-700"}>Create incident group</button></div>
        </form>

        : selected ? <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-3.5">
              <HazardMarker category={selected.category} impact={groupSeverity(selected)} reviewState={markerState(selected)} size={50} decorative />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{selected.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5"><SeverityChip impact={groupSeverity(selected)} /><StatusChip>{incidentStatusLabel(selected.status)}</StatusChip></div>
              </div>
              <p className="basis-full text-[13px] leading-[18px] text-slate-500 sm:basis-auto sm:text-right">Created {formatAgeLong(selected.createdAt)}<span className="block font-mono">INC {selected.id}</span></p>
            </div>
            <p className="text-sm text-slate-600">Possible road: <span className="text-slate-900">{selected.possibleRoad || "Not assessed"}</span> · Last reason: <span className="text-slate-900">{selected.reviewNote}</span></p>

            <div>
              <h3 className={label + " mb-2"}>Linked reports</h3>
              <ul className="flex flex-col gap-2">{selected.reports.map(link => <li key={link.reportId} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <HazardMarker category={link.report.category} impact={link.report.impact ?? "unknown"} reviewState={link.report.reviewState} size={24} decorative />
                <span className="min-w-0 flex-1 truncate text-slate-900" title={link.report.description}>{link.report.description}</span>
                {link.report.createdAt ? <span className="shrink-0 font-mono text-xs text-slate-500">{formatAge(link.report.createdAt)}</span> : null}
                {selected.status !== "resolved" && selected.reports.length > 1 ? <button type="button" disabled={busy || !reasonIsValid(notes[selected.id])}
                  title={reasonIsValid(notes[selected.id]) ? undefined : "Write an operator justification first"}
                  onClick={() => void request("/api/v2/incidents/" + selected.id, "DELETE", { reportId: link.reportId, note: notes[selected.id] })}
                  className={smallButton}><LinkBreakIcon size={14} aria-hidden="true" />Unlink<span className="sr-only"> (reason required)</span></button> : null}
              </li>)}</ul>
            </div>

            {selected.status !== "resolved" ? <>
              <div className="rounded-2xl bg-slate-50 p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <BrainIcon size={20} className="shrink-0 text-slate-600" aria-hidden="true" />
                  <p className="min-w-0 flex-1 text-sm text-slate-600"><strong className="font-semibold text-slate-900">AI suggestions</strong> · compares nearby ungrouped reports. Never links on its own.</p>
                  <button type="button" disabled={suggestBusy !== null || busy} onClick={() => void suggest(selected.id)} className={smallButton}>{suggestBusy === selected.id ? "Comparing…" : "Find AI candidates"}</button>
                </div>
                {suggestions[selected.id] ? <div className="mt-3 space-y-2 text-[13px] text-slate-700">
                  <p className="text-slate-500">Provider: {suggestions[selected.id].provider} · Model: {suggestions[selected.id].model}</p>
                  {suggestions[selected.id].candidates.length === 0 ? <p>No strong candidate found. Manual linking is still possible.</p> : null}
                  {suggestions[selected.id].candidates.map(candidate => <div key={candidate.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2.5">
                    <span className="min-w-0 flex-1">{candidate.description} · {similarityLabel(candidate.similarity)}</span>
                    <button type="button" disabled={!available.some(r => r.id === candidate.id)} aria-pressed={links[selected.id] === candidate.id}
                      onClick={() => setLinks(old => ({ ...old, [selected.id]: candidate.id }))} className={smallButton}>
                      {links[selected.id] === candidate.id ? "Selected ✓" : "Select (no automatic link)"}
                    </button>
                  </div>)}
                  <p className="text-slate-500">{suggestions[selected.id].disclaimer}</p>
                  <p className="rounded-xl bg-[#FDF4DC] p-2.5 leading-5 text-[#7A5100]">{AI_REVIEW_REMINDER}</p>
                </div> : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className={label}>Add an ungrouped report (same category)
                  <select value={links[selected.id] ?? ""} onChange={e => setLinks(p => ({ ...p, [selected.id]: e.target.value }))} className={field}>
                    <option value="">Choose ungrouped report</option>{available.filter(r => r.category === selected.category).map(r => <option key={r.id} value={r.id}>{r.description.slice(0, 90)}</option>)}
                  </select>
                </label>
                <label className={label}>Possible road affected (free text, no closure)
                  <input maxLength={120} value={roads[selected.id] ?? selected.possibleRoad ?? ""} onChange={e => setRoads(p => ({ ...p, [selected.id]: e.target.value }))} placeholder="e.g. Demo access road" className={field} />
                </label>
              </div>
              {links[selected.id] ? <p role="status" className="text-[13px] text-slate-600">Report selected for manual review only. It is linked only after you write a justification and press “Link selected report”.</p> : null}

              <fieldset>
                <legend className={label + " mb-1.5"}>Status</legend>
                <div className="flex gap-1 rounded-full bg-slate-100 p-1">
                  {([["under_review", "Under review"], ["corroborated", "Corroborated"], ["resolved", "Resolved"]] as const).map(([value, text]) => {
                    const current = (statuses[selected.id] ?? selected.status) === value;
                    const disabled = value === "under_review" && selected.status !== "under_review";
                    return <label key={value} className={"flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-center text-[13px] font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-teal-800 sm:text-sm " +
                      (current ? "bg-white text-slate-900 shadow-sm" : "text-slate-600") + (disabled ? " cursor-not-allowed opacity-45" : "")}>
                      <input type="radio" name={"status-" + selected.id} value={value} checked={current} disabled={disabled} className="sr-only"
                        onChange={() => setStatuses(p => ({ ...p, [selected.id]: value }))} />{text}
                    </label>;
                  })}
                </div>
              </fieldset>
            </> : <p className="rounded-2xl bg-slate-50 p-3.5 text-sm text-slate-600">Resolved groups are read-only. Resolved does not mean the road is safe.</p>}

            <details className="group rounded-2xl bg-slate-50 p-3.5">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900">
                Nearby mapped roads (unverified)<CaretDownIcon size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <IncidentRoadCandidates id={selected.id} operatorKey={operatorKey} />
            </details>
          </div>

          {selected.status !== "resolved" ? <div className="sticky bottom-0 mt-auto flex flex-col gap-2.5 rounded-b-3xl border-t border-slate-100 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-20px_rgba(15,21,19,.35)] sm:px-7 xl:shadow-none">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="min-w-[200px] flex-1"><span className="sr-only">Operator justification (required for linking, unlinking and status changes)</span>
                <input maxLength={400} value={notes[selected.id] ?? ""} onChange={e => setNotes(p => ({ ...p, [selected.id]: e.target.value }))}
                  className="min-h-11 w-full rounded-full border border-slate-400 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500" placeholder="Operator justification (required)" />
              </label>
              <div className="flex flex-1 gap-2.5 sm:flex-none">
                <button type="button" className={pill + " flex-1 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 sm:flex-none"}
                  disabled={busy || !canManuallyLinkSuggestion(links[selected.id] ?? "", available.filter(r => r.category === selected.category).map(r => r.id), notes[selected.id] ?? "")}
                  onClick={() => void request("/api/v2/incidents/" + selected.id, "POST", { reportId: links[selected.id], note: notes[selected.id] })}>Link selected report</button>
                <button type="button" className={pill + " flex-1 bg-teal-800 text-white hover:bg-teal-700 sm:flex-none"}
                  disabled={busy || (notes[selected.id] ?? "").trim().length < 8}
                  onClick={() => void request("/api/v2/incidents/" + selected.id, "PATCH", { status: statuses[selected.id] ?? selected.status, note: notes[selected.id], possibleRoad: roads[selected.id] ?? selected.possibleRoad ?? "" })}>Save incident decision</button>
              </div>
            </div>
            <p className="text-xs text-slate-500">Grouping and status are human decisions. Corroborated does not mean a road is closed.</p>
          </div> : null}
        </>

        : <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-[15px] text-slate-600">
          <h2 className="text-xl font-semibold text-slate-900">No group selected</h2>
          <p>Choose an incident group, or start a new one.</p>
        </div>}
      </div>
    </div> : null}
  </section>;
}
