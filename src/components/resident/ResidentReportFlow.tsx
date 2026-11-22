"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CameraIcon, CaretLeftIcon, CheckIcon, CrosshairIcon, InfoIcon, LockSimpleIcon, MapPinIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import HazardMarker, { categoryIcon } from "@/components/hazards/HazardMarker";
import { LifecycleTrack } from "@/components/hazards/HazardChips";
import { Button } from "@/components/ui/button";
import { useResidentFocus } from "./ResidentShell";
import { useServiceArea } from "@/hooks/useServiceArea";
import { prepareDemoPhoto } from "@/lib/demo-photo-client";
import { inspectDemoReportDraft } from "@/lib/v213-report-draft";
import { SEVERITY, categoryLabel } from "@/lib/hazard-presentation";
import { isInsideServiceArea } from "@/lib/service-area";
import {
  DESCRIPTION_MAX, DESCRIPTION_MIN, EMPTY_DRAFT, MY_REPORTS_KEY, RESIDENT_CATEGORIES, RESIDENT_IMPACTS,
  addStoredReport, parseStoredReports, stepProblem, submissionBody, type ReportDraft, type StoredReport,
} from "@/lib/resident-reports";
import type { ResidentMapReport } from "./ResidentMap";

const ResidentMap = dynamic(() => import("./ResidentMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

type Step = 1 | 2 | 3 | "sent";
const TITLES = { 1: "What did you see?", 2: "Where is it?", 3: "A few words and a photo" } as const;
const SUBTITLES = {
  1: "Step 1 of 3. Next: where it is, then a few words and a photo.",
  2: "Step 2 of 3. Move the map so the pin sits on the problem.",
  3: "Step 3 of 3. The photo is optional.",
} as const;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** Report a problem in three steps (roadmap 4.3, mockups 8 and 9). Nothing is sent until "Send report". */
export default function ResidentReportFlow() {
  const setFocused = useResidentFocus();
  const desktop = useIsDesktop();
  const { data: serviceArea, loaded } = useServiceArea();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState<"idle" | "saving" | "photo">("idle");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ report: StoredReport; photoNote: string } | null>(null);
  const [reports, setReports] = useState<ResidentMapReport[]>([]);
  const [flyTo, setFlyTo] = useState<{ lonLat: [number, number]; key: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied" | "failed">("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setFocused(step !== "sent"); return () => setFocused(false); }, [step, setFocused]);
  useEffect(() => { headingRef.current?.focus(); setTried(false); setError(""); }, [step]);
  useEffect(() => {
    if (!loaded) return;
    let live = true;
    fetch("/api/v2/hazards", { cache: "no-store" })
      .then(r => (r.ok ? r.json() as Promise<{ reports: ResidentMapReport[] }> : { reports: [] }))
      .then(data => { if (live) setReports(data.reports.filter(r => isInsideServiceArea(serviceArea.area, r.longitude, r.latitude))); })
      .catch(() => {});
    return () => { live = false; };
  }, [loaded, serviceArea.area]);
  useEffect(() => {
    if (!photo) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const photoHint = useMemo(() => inspectDemoReportDraft("placeholder text", null, photo ? { type: photo.type, size: photo.size } : null, serviceArea.area).photoError, [photo, serviceArea.area]);
  const problem = step === "sent" ? null : stepProblem(step, draft) ?? (step === 3 ? photoHint : null);

  function next() {
    if (step === "sent") return;
    if (problem) { setTried(true); return; }
    if (step === 3) { void send(); return; }
    setStep((step + 1) as Step);
  }
  function back() { if (step === 2 || step === 3) setStep((step - 1) as Step); }

  function setCentre(lonLat: [number, number]) {
    setDraft(d => ({ ...d, location: lonLat, locationInside: isInsideServiceArea(serviceArea.area, lonLat[0], lonLat[1]) }));
  }
  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocating("failed"); return; }
    setLocating("busy");
    // Asked only when the resident presses the button. The position moves the map here; it is not stored or sent on its own.
    navigator.geolocation.getCurrentPosition(
      position => { setLocating("idle"); setFlyTo({ lonLat: [position.coords.longitude, position.coords.latitude], key: Date.now() }); },
      failure => setLocating(failure.code === failure.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function send() {
    const body = submissionBody(draft);
    if (!body || photoHint) { setTried(true); return; }
    setSending("saving"); setError("");
    try {
      const response = await fetch("/api/v2/hazards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string; report?: { id: string; createdAt: string } };
      if (!response.ok || !result.report) throw new Error(result.error ?? "The report could not be sent.");
      const stored: StoredReport = { id: result.report.id, category: body.category!, impact: body.impact!, sentAt: result.report.createdAt ?? new Date().toISOString() };
      try { localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(addStoredReport(parseStoredReports(localStorage.getItem(MY_REPORTS_KEY)), stored))); } catch { /* private mode: the report is still sent */ }
      let photoNote = "";
      if (photo) {
        setSending("photo");
        try {
          const encoded = await prepareDemoPhoto(photo);
          const upload = await fetch(`/api/v2/hazards/${encodeURIComponent(stored.id)}/evidence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(encoded) });
          if (!upload.ok) throw new Error(((await upload.json().catch(() => ({}))) as { error?: string }).error ?? "upload failed");
          photoNote = "Your photo is with the township team only.";
        } catch (cause) {
          photoNote = `The report was sent, but the photo was not: ${cause instanceof Error ? cause.message : "upload failed"}.`;
        }
      }
      window.dispatchEvent(new Event("township-hazards-updated"));
      setSent({ report: stored, photoNote });
      setStep("sent");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be sent.");
    } finally {
      setSending("idle");
    }
  }

  function startAgain() { setDraft(EMPTY_DRAFT); setPhoto(null); setSent(null); setStep(1); }

  // ----- Sent -----------------------------------------------------------------------------------
  if (step === "sent" && sent) {
    return <div className="flex flex-1 flex-col">
      <section className="bg-night px-4 pb-6 pt-7 text-night-text sm:px-8">
        <div className="mx-auto max-w-xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-night-mint text-night-on-mint"><CheckIcon size={26} weight="bold" aria-hidden="true" /></span>
          <h1 ref={headingRef} tabIndex={-1} className="mt-4 font-display text-display font-semibold outline-none">Sent. Thank you.</h1>
          <p className="mt-2 text-body text-night-muted">The township team will check it. Nothing on the map changes until they do.</p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-xl px-4 py-5 sm:px-0">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <HazardMarker category={sent.report.category} impact={sent.report.impact} reviewState="unverified" size={32} decorative />
            <div><p className="text-body font-semibold">{categoryLabel(sent.report.category)}</p>
              <p className="text-small text-slate-600">Sent just now · {RESIDENT_IMPACTS.find(i => i.value === sent.report.impact)?.label.toLowerCase()}</p></div>
          </div>
          <LifecycleTrack reviewState="unverified" />
        </div>
        {sent.photoNote ? <p className="mt-3 text-small text-slate-700" role="status">{sent.photoNote}</p> : null}
        <p className="mt-4 text-body text-slate-700">You can follow it in <strong className="font-semibold">My reports</strong>. It is kept in this browser only, so it will not show on another phone.</p>
        <div className="mt-6 grid gap-2">
          <Button asChild className="h-12 text-body"><Link href="/resident/mine">See my reports</Link></Button>
          <Button asChild variant="secondary" className="h-12 text-body"><Link href="/resident">Back to the map</Link></Button>
          <Button variant="link" onClick={startAgain}>Report something else</Button>
        </div>
      </div>
    </div>;
  }
  if (step === "sent") return null;

  // ----- Steps 1 to 3 ---------------------------------------------------------------------------
  const showProblem = tried && problem;
  const summary = draft.category && draft.impact ? `${categoryLabel(draft.category)} · ${RESIDENT_IMPACTS.find(i => i.value === draft.impact)?.label}` : null;
  const mapVisible = desktop || step === 2;
  const radio = (on: boolean) => "flex cursor-pointer rounded-xl border bg-white transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#1F5A94] " +
    (on ? "border-2 border-night bg-slate-50" : "border-slate-200 hover:border-slate-300");

  return <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-59px)] lg:flex-none lg:flex-row">
    {mapVisible ? <div className="relative order-3 min-h-[320px] flex-1 lg:order-1">
      {loaded ? <ResidentMap area={serviceArea} reports={reports} picking={step === 2} onCentre={setCentre} flyTo={flyTo}
        label={step === 2 ? "Map for placing your report. Drag the map; the pin stays in the middle." : `Map of ${serviceArea.area.name}`} /> : null}
      {step === 2 ? <>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
          <svg width="44" height="56" viewBox="0 0 44 56"><path d="M22 2C11 2 3 10 3 21c0 14 19 32 19 32s19-18 19-32C41 10 33 2 22 2z" fill="#0E1720" stroke="#fff" strokeWidth="3" /><circle cx="22" cy="21" r="7" fill="#7FD4AE" /></svg>
        </div>
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-night/95 px-3 py-2.5 text-small text-night-text lg:top-5">
          <InfoIcon size={18} className="shrink-0 text-night-mint" aria-hidden="true" />Drag the map. The pin stays in the middle.
        </p>
        <div className="absolute inset-x-3 bottom-7 z-[500] flex items-end justify-between gap-2 lg:inset-x-5 lg:bottom-7">
          <span role="status" className={"inline-flex h-8 min-w-0 items-center gap-1.5 truncate whitespace-nowrap rounded-full border px-3 text-small font-medium " +
            (!draft.location ? "border-slate-200 bg-white text-slate-600" : draft.locationInside ? "border-[#CFE3D8] bg-[#F1F8F4] text-[#0B5A3F]" : "border-[#E7B4AC] bg-white text-[#A8321F]")}>
            {!draft.location ? "Loading the map…" : draft.locationInside ? <><CheckIcon size={14} weight="bold" className="shrink-0" aria-hidden="true" />Inside {serviceArea.area.name}</> : <><WarningCircleIcon size={14} weight="bold" className="shrink-0" aria-hidden="true" />Outside the area we cover</>}
          </span>
          <button type="button" onClick={useMyLocation} disabled={locating === "busy"}
            className="mr-12 inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 text-small font-semibold shadow-md disabled:opacity-60">
            <CrosshairIcon size={18} aria-hidden="true" />{locating === "busy" ? "Finding you…" : "Use my location"}
          </button>
        </div>
      </> : null}
    </div> : null}

    <section aria-labelledby="report-step-title" className="contents lg:order-2 lg:flex lg:w-[440px] lg:flex-col lg:border-l lg:border-slate-200 lg:bg-slate-50">
      <div className="order-1 bg-night px-4 pb-4 pt-3 text-night-text sm:px-8 lg:px-6 lg:pt-5">
        {summary && step !== 1 ? <button type="button" onClick={back} className="inline-flex items-center gap-1 text-small font-medium text-night-mint">
          <CaretLeftIcon size={14} aria-hidden="true" />{summary}{step === 3 ? " · pin placed" : ""}</button> : null}
        <h1 id="report-step-title" ref={headingRef} tabIndex={-1} className="mt-2 font-display text-title font-semibold outline-none lg:text-display">{TITLES[step]}</h1>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map(n => <span key={n} className={"h-1 flex-1 rounded-full " + (n <= step ? "bg-night-mint" : "bg-night-edge")} />)}
        </div>
        <p className="mt-2 text-small text-night-muted">{SUBTITLES[step]}</p>
      </div>

      <div className={"order-2 px-4 py-4 sm:px-8 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 " + (step === 2 ? "hidden lg:block" : "flex-1")}>
        {step === 1 ? <>
          <fieldset>
            <legend className="font-display text-heading font-semibold">Type of problem</legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {RESIDENT_CATEGORIES.map(choice => {
                const Icon = categoryIcon(choice.value);
                const on = draft.category === choice.value;
                return <label key={choice.value} className={radio(on) + (choice.value === "other" ? " col-span-3 h-11 flex-row items-center justify-center gap-2" : " h-[76px] flex-col items-center justify-center gap-1.5") + " text-small font-medium"}>
                  <input type="radio" name="category" value={choice.value} checked={on} onChange={() => setDraft(d => ({ ...d, category: choice.value }))} className="sr-only" />
                  {choice.value === "other" ? null : <Icon size={26} weight="bold" aria-hidden="true" />}{choice.label}
                </label>;
              })}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="font-display text-heading font-semibold">Can cars get through?</legend>
            <div className="mt-3 grid gap-2">
              {RESIDENT_IMPACTS.map(choice => {
                const on = draft.impact === choice.value;
                return <label key={choice.value} className={radio(on) + " items-center gap-3 px-4 py-2.5"}>
                  <input type="radio" name="impact" value={choice.value} checked={on} onChange={() => setDraft(d => ({ ...d, impact: choice.value }))} className="sr-only" />
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: SEVERITY[choice.value].solid }} />
                  <span><span className="block text-body font-semibold">{choice.label}</span>{choice.hint ? <span className="block text-small text-slate-600">{choice.hint}</span> : null}</span>
                </label>;
              })}
            </div>
          </fieldset>
        </> : null}

        {step === 2 ? <div className="grid gap-2">
          <button type="button" onClick={() => setStep(1)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-body">
            {draft.category ? (() => { const Icon = categoryIcon(draft.category); return <Icon size={22} weight="bold" aria-hidden="true" />; })() : null}
            <span>{summary}</span><span className="ml-auto text-small font-semibold text-[#0B7350]">Change</span>
          </button>
          <div className="flex items-center gap-3 rounded-xl border-2 border-night bg-white px-4 py-3">
            <MapPinIcon size={22} aria-hidden="true" />
            <span><span className="block text-body font-semibold">Location</span>
              <span className="block text-small text-slate-600">{draft.locationInside ? `Inside ${serviceArea.area.name} · move the map to adjust` : "Outside the area we cover · move the map"}</span></span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-body text-slate-500"><CameraIcon size={22} aria-hidden="true" />A few words and a photo</div>
        </div> : null}

        {step === 3 ? <>
          <label htmlFor="report-words" className="font-display text-heading font-semibold">What is happening there?</label>
          <textarea id="report-words" value={draft.description} maxLength={DESCRIPTION_MAX} rows={4}
            onChange={event => setDraft(d => ({ ...d, description: event.target.value }))}
            placeholder="For example: water across both lanes near the junction, about knee deep"
            aria-describedby="report-words-help"
            className="mt-3 block w-full rounded-xl border border-slate-300 bg-white p-3 text-body focus:border-night focus:outline-none focus:ring-[3px] focus:ring-[#1F5A94]/20" />
          <p id="report-words-help" className="mt-1.5 flex text-caption text-slate-600"><span>At least {DESCRIPTION_MIN} characters. Please don&apos;t include names or phone numbers.</span><span className="ml-auto whitespace-nowrap pl-3 tabular-nums">{draft.description.length} / {DESCRIPTION_MAX}</span></p>

          <h2 className="mt-5 font-display text-heading font-semibold">Photo</h2>
          {photo && photoUrl ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
            <img src={photoUrl} alt="Your photo, before sending" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0"><span className="block truncate text-small font-semibold">{photo.name}</span>
              <span className={"block text-small " + (photoHint ? "text-[#A8321F]" : "text-slate-600")}>{photoHint ?? "Ready. It is shrunk and its location data removed before sending."}</span></span>
            <button type="button" onClick={() => setPhoto(null)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Remove the photo">
              <XIcon size={18} weight="bold" aria-hidden="true" /></button>
          </div> : <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-body font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#1F5A94]">
            <CameraIcon size={24} aria-hidden="true" />Add a photo (optional)
            <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={event => setPhoto(event.target.files?.[0] ?? null)} />
          </label>}
          <p className="mt-3 flex gap-2.5 rounded-xl bg-slate-100 p-3 text-small text-slate-700">
            <LockSimpleIcon size={18} className="shrink-0" aria-hidden="true" />Only the township team sees your photo. Others see it only if the team approves it.
          </p>
          {summary ? <p className="mt-4 text-small text-slate-600">You are sending: <strong className="font-semibold text-slate-900">{summary.toLowerCase().replace(/^./, c => c.toUpperCase())}</strong>, at the pin you placed.</p> : null}
        </> : null}
      </div>

      <div className="sticky bottom-0 order-4 border-t border-slate-200 bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:px-8 lg:static lg:px-4 lg:pb-4">
        {showProblem ? <p role="alert" className="mb-2 text-small font-medium text-[#A8321F]">{problem}</p> : null}
        {error ? <p role="alert" className="mb-2 text-small font-medium text-[#A8321F]">{error}</p> : null}
        {step === 2 && locating === "denied" ? <p role="status" className="mb-2 text-small text-slate-700">Location is turned off for this site. Move the map by hand instead.</p> : null}
        {step === 2 && locating === "failed" ? <p role="status" className="mb-2 text-small text-slate-700">Your location could not be found. Move the map by hand instead.</p> : null}
        <div className="flex gap-2">
          {step !== 1 ? <Button variant="secondary" className="h-12 w-24 text-body" onClick={back} disabled={sending !== "idle"}>Back</Button>
            : <Button asChild variant="secondary" className="hidden h-12 w-24 text-body lg:inline-flex"><Link href="/resident">Cancel</Link></Button>}
          <Button variant={step === 3 ? "approve" : "primary"} className="h-12 flex-1 text-body" onClick={next} disabled={sending !== "idle"}>
            {step === 1 ? "Next: where is it?" : step === 2 ? "Next: add details" : sending === "saving" ? "Sending…" : sending === "photo" ? "Adding your photo…" : "Send report"}
          </Button>
        </div>
      </div>
    </section>
  </div>;
}
