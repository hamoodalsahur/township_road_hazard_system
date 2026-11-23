"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WAY_HOME_KEY, parseWayHome, type WayHomeSettings } from "@/lib/way-home";
import type { LonLat, WayHomeAnswer } from "@/lib/routing";

export type WayHomePhase = "loading" | "unset" | "ready" | "locating" | "checking" | "done" | "denied" | "error";
export type WayHomeState = { phase: WayHomePhase; settings: WayHomeSettings | null; answer: WayHomeAnswer | null; from: LonLat | null; error: string };

function locate(): Promise<LonLat> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(p => resolve([p.coords.longitude, p.coords.latitude]), reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 120_000 });
  });
}

/**
 * The way-home check for the resident map (roadmap 6.3–6.4). Settings come from this browser only.
 * It checks by itself when the start is a saved place, or when location access was already allowed;
 * otherwise it waits for "Check my way home". It checks again when the active closures change.
 */
export function useWayHome(closuresKey: string): WayHomeState & { check: () => void } {
  const [state, setState] = useState<WayHomeState>({ phase: "loading", settings: null, answer: null, from: null, error: "" });
  const busy = useRef(false);

  const check = useCallback(async () => {
    let settings: WayHomeSettings | null = null;
    try { settings = parseWayHome(localStorage.getItem(WAY_HOME_KEY)); } catch { /* storage blocked */ }
    if (!settings) { setState({ phase: "unset", settings: null, answer: null, from: null, error: "" }); return; }
    if (busy.current) return;
    busy.current = true;
    try {
      let from: LonLat;
      if (settings.start.kind === "place") from = settings.start.at;
      else {
        setState(s => ({ ...s, settings, phase: "locating", error: "" }));
        try { from = await locate(); }
        catch (cause) {
          const denied = (cause as GeolocationPositionError)?.code === 1;
          setState(s => ({ ...s, settings, phase: denied ? "denied" : "error", error: denied ? "Location is turned off for this site." : "Your location could not be found." }));
          return;
        }
      }
      setState(s => ({ ...s, settings, from, phase: "checking", error: "" }));
      const response = await fetch("/api/v2/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from, to: settings.home }) });
      const data = await response.json().catch(() => ({})) as WayHomeAnswer & { error?: string };
      if (!response.ok) { setState(s => ({ ...s, phase: "error", answer: null, error: data.error ?? "The way-home check failed." })); return; }
      setState({ phase: "done", settings, from, answer: data, error: "" });
    } finally { busy.current = false; }
  }, []);

  // First look: decide whether to check straight away.
  useEffect(() => {
    let settings: WayHomeSettings | null = null;
    try { settings = parseWayHome(localStorage.getItem(WAY_HOME_KEY)); } catch { /* storage blocked */ }
    if (!settings) { setState(s => ({ ...s, phase: "unset" })); return; }
    if (settings.start.kind === "place") { void check(); return; }
    setState(s => ({ ...s, settings, phase: "ready" }));
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then(p => { if (p.state === "granted") void check(); }).catch(() => {});
  }, [check]);

  // A closure was added, ended or changed: check again if we already have an answer.
  const lastKey = useRef(closuresKey);
  useEffect(() => {
    if (lastKey.current === closuresKey) return;
    lastKey.current = closuresKey;
    if (state.phase === "done") void check();
  }, [closuresKey, state.phase, check]);

  return { ...state, check: () => void check() };
}
