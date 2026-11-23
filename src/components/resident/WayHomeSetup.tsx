"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CrosshairIcon, HouseIcon, LockSimpleIcon, MapPinIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useResidentFocus } from "./ResidentShell";
import { useServiceArea } from "@/hooks/useServiceArea";
import { WAY_HOME_KEY, parseWayHome, serializeWayHome, type WayHomeSettings } from "@/lib/way-home";
import type { LonLat } from "@/lib/routing";

const ResidentMap = dynamic(() => import("./ResidentMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-small text-slate-600">Loading the map…</div>,
});

type Step = "home" | "start" | "place";
const TITLES: Record<Step, string> = { home: "Set your home", start: "Check my way home from", place: "Set your usual starting place" };
const HINTS: Record<Step, string> = {
  home: "Drag the map so the pin sits on your home. It stays in this browser only.",
  start: "Where should the check start?",
  place: "Drag the map so the pin sits on the place you usually leave from, for example work or campus.",
};

/** Way home setup (roadmap 6.3, mockup way-phone.png): home pin, then where checks start. Saved in this browser only. */
export default function WayHomeSetup() {
  const setFocused = useResidentFocus();
  const router = useRouter();
  const { data: serviceArea, loaded } = useServiceArea();
  const [step, setStep] = useState<Step>("home");
  const [existing, setExisting] = useState<WayHomeSettings | null>(null);
  const [home, setHome] = useState<LonLat | null>(null);
  const [place, setPlace] = useState<LonLat | null>(null);
  const [startKind, setStartKind] = useState<"here" | "place">("here");
  const [centre, setCentre] = useState<LonLat | null>(null);
  const [flyTo, setFlyTo] = useState<{ lonLat: LonLat; key: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "failed">("idle");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setFocused(true); return () => setFocused(false); }, [setFocused]);
  useEffect(() => {
    let saved: WayHomeSettings | null = null;
    try { saved = parseWayHome(localStorage.getItem(WAY_HOME_KEY)); } catch { /* storage blocked */ }
    setExisting(saved);
    if (saved) {
      setHome(saved.home); setStartKind(saved.start.kind);
      if (saved.start.kind === "place") setPlace(saved.start.at);
      setFlyTo({ lonLat: saved.home, key: Date.now() });
    }
  }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocating("failed"); return; }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(p => { setLocating("idle"); setFlyTo({ lonLat: [p.coords.longitude, p.coords.latitude], key: Date.now() }); }, () => setLocating("failed"), { enableHighAccuracy: true, timeout: 15_000 });
  }
  function save(settings: WayHomeSettings) {
    try { localStorage.setItem(WAY_HOME_KEY, serializeWayHome(settings)); } catch { /* storage blocked: nothing saved */ }
    router.push("/resident");
  }
  function next() {
    if (step === "home" && centre) { setHome(centre); setStep("start"); return; }
    if (step === "start" && home) {
      if (startKind === "here") { save({ home, start: { kind: "here" } }); return; }
      setStep("place"); if (place) setFlyTo({ lonLat: place, key: Date.now() }); return;
    }
    if (step === "place" && home && centre) save({ home, start: { kind: "place", at: centre } });
  }
  function remove() {
    try { localStorage.removeItem(WAY_HOME_KEY); } catch { /* ignore */ }
    router.push("/resident");
  }

  const picking = step === "home" || step === "place";
  const pinIcon = step === "home" ? <HouseIcon size={18} weight="bold" aria-hidden="true" /> : <MapPinIcon size={18} weight="bold" aria-hidden="true" />;
  return <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-59px)] lg:flex-none lg:flex-row">
    {picking ? <div className="relative order-3 min-h-[320px] flex-1 lg:order-1">
      {loaded ? <ResidentMap area={serviceArea} reports={[]} picking onCentre={setCentre} flyTo={flyTo}
        label={step === "home" ? "Map for placing your home. Drag the map; the pin stays in the middle." : "Map for placing your usual starting place."} /> : null}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <svg width="44" height="56" viewBox="0 0 44 56"><path d="M22 2C11 2 3 10 3 21c0 14 19 32 19 32s19-18 19-32C41 10 33 2 22 2z" fill="#0E1720" stroke="#fff" strokeWidth="3" /></svg>
        <span className="absolute left-[13px] top-[11px] text-night-mint">{pinIcon}</span>
      </div>
      <button type="button" onClick={useMyLocation} disabled={locating === "busy"}
        className="absolute bottom-7 left-3 z-[500] inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-small font-semibold shadow-md disabled:opacity-60 lg:left-5">
        <CrosshairIcon size={18} aria-hidden="true" />{locating === "busy" ? "Finding you…" : locating === "failed" ? "Location not available" : "Use my location"}
      </button>
    </div> : null}

    <section aria-labelledby="way-setup-title" className="contents lg:order-2 lg:flex lg:w-[440px] lg:flex-col lg:border-l lg:border-slate-200 lg:bg-slate-50">
      <div className="order-1 bg-night px-4 pb-4 pt-4 text-night-text sm:px-8 lg:px-6 lg:pt-6">
        <h1 id="way-setup-title" ref={heading} tabIndex={-1} className="font-display text-title font-semibold outline-none lg:text-display">{TITLES[step]}</h1>
        <p className="mt-1 text-small text-night-muted">{HINTS[step]}</p>
      </div>
      <div className={"order-2 px-4 py-4 sm:px-8 lg:flex-1 lg:px-6 " + (picking ? "hidden lg:block" : "flex-1")}>
        {step === "start" ? <fieldset className="grid gap-2">
          <legend className="sr-only">Where the check starts</legend>
          {([["here", "Where I am", "Asks for your location each time you check", CrosshairIcon], ["place", "A usual starting place", "For example work or campus, set on the map", MapPinIcon]] as const).map(([value, title, hint, Icon]) =>
            <label key={value} className={"flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#1F5A94] " + (startKind === value ? "border-2 border-night" : "border-slate-200")}>
              <input type="radio" name="start" value={value} checked={startKind === value} onChange={() => setStartKind(value)} className="sr-only" />
              <Icon size={22} aria-hidden="true" /><span><span className="block text-body font-semibold">{title}</span><span className="block text-small text-slate-600">{hint}</span></span>
            </label>)}
        </fieldset> : null}
        <p className="mt-4 flex gap-2 rounded-xl bg-slate-100 p-3 text-small text-slate-700"><LockSimpleIcon size={18} className="shrink-0" aria-hidden="true" />
          Your home is kept in this browser only. To work out a route, the start and home points go to the route service this app uses (your area&apos;s own road lines on this computer, or OpenRouteService); we don&apos;t keep them.</p>
        {existing ? <Button variant="ghost" className="mt-3 text-[#A8321F]" onClick={remove}><TrashIcon size={16} aria-hidden="true" />Remove my home from this browser</Button> : null}
      </div>
      <div className="sticky bottom-0 order-4 mt-auto flex gap-2 border-t border-slate-200 bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 sm:px-8 lg:px-4 lg:pb-4">
        {step === "home" ? <Button variant="secondary" className="h-12 w-28" onClick={() => router.push("/resident")}>Cancel</Button>
          : <Button variant="secondary" className="h-12 w-28" onClick={() => setStep(step === "place" ? "start" : "home")}>Back</Button>}
        <Button className="h-12 flex-1 text-body" disabled={picking && !centre} onClick={next}>
          {step === "home" ? "Next: where checks start" : step === "start" ? (startKind === "here" ? "Save" : "Next: set the place") : "Save"}
        </Button>
      </div>
    </section>
  </div>;
}
