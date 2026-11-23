"use client";
import { useCallback, useEffect, useState } from "react";
import type { PublicClosure } from "@/lib/road-closures";

/** Road closures active right now (public fields only). Refreshed every minute and after an operator changes one. */
export function useClosures(): { closures: PublicClosure[]; reload: () => void } {
  const [closures, setClosures] = useState<PublicClosure[]>([]);
  const reload = useCallback(() => {
    fetch("/api/v2/closures/public", { cache: "no-store" })
      .then(r => (r.ok ? r.json() as Promise<{ closures: PublicClosure[] }> : { closures: [] }))
      .then(data => setClosures(data.closures ?? []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 60_000);
    window.addEventListener("township-closures-updated", reload);
    return () => { window.clearInterval(timer); window.removeEventListener("township-closures-updated", reload); };
  }, [reload]);
  return { closures, reload };
}
