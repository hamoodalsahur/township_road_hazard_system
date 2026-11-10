"use client";
import { useEffect, useState } from "react";
import { DEFAULT_SERVICE_AREA, serviceAreaResponse, type ServiceAreaResponse } from "@/lib/service-area";

// One request per page load, shared by every component that needs the area.
let request: Promise<ServiceAreaResponse | null> | null = null;
function fetchServiceArea(): Promise<ServiceAreaResponse | null> {
  request ??= fetch("/api/service-area", { cache: "no-store" })
    .then(response => (response.ok ? (response.json() as Promise<ServiceAreaResponse>) : null))
    .catch(() => null)
    .then(result => { if (!result) request = null; return result; });
  return request;
}

const FALLBACK = serviceAreaResponse(DEFAULT_SERVICE_AREA, DEFAULT_SERVICE_AREA.id, null);

/**
 * The active service area. Starts as the BBR default and switches once the server answers.
 * The server still re-checks every report, so a stale browser copy cannot let a point through.
 */
export function useServiceArea(): { data: ServiceAreaResponse; loaded: boolean; failed: boolean } {
  const [state, setState] = useState<{ data: ServiceAreaResponse; loaded: boolean; failed: boolean }>({ data: FALLBACK, loaded: false, failed: false });
  useEffect(() => {
    let live = true;
    void fetchServiceArea().then(result => {
      if (live) setState(result ? { data: result, loaded: true, failed: false } : { data: FALLBACK, loaded: true, failed: true });
    });
    return () => { live = false; };
  }, []);
  return state;
}
