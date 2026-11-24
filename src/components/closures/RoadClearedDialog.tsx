"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_RESOLVE_NOTE, RESOLVE_NOTE_MAX, RESOLVE_NOTE_MIN } from "@/lib/report-resolution";

/** "Road cleared" (24 Nov 2026): resolve an approved report and end its road closures in one step. */
export default function RoadClearedDialog({ open, onOpenChange, reportId, title, operatorKey, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  title: string;
  operatorKey: string;
  onDone: (closuresEnded: number) => void;
}) {
  const [note, setNote] = useState(DEFAULT_RESOLVE_NOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setNote(DEFAULT_RESOLVE_NOTE); setError(""); } }, [open, reportId]);
  const ok = note.trim().length >= RESOLVE_NOTE_MIN && note.length <= RESOLVE_NOTE_MAX && !busy;

  async function save() {
    if (!ok) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v2/hazards/${encodeURIComponent(reportId)}/resolve`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-operator-key": operatorKey }, body: JSON.stringify({ note }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; closuresEnded?: number };
      if (!response.ok) throw new Error(result.error ?? "Could not mark the report cleared");
      window.dispatchEvent(new Event("township-closures-updated"));
      window.dispatchEvent(new Event("township-hazards-updated"));
      onDone(result.closuresEnded ?? 0);
      onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not mark the report cleared"); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Road cleared?</DialogTitle>
        <DialogDescription>
          Marks this {title.toLowerCase()} report <strong>Resolved</strong> and ends any road closure made from it, right now.
          Residents stop seeing it, and their way home goes back to the usual route.
        </DialogDescription>
      </DialogHeader>
      <label className="grid gap-1 text-small font-semibold text-slate-900" htmlFor="road-cleared-note">
        Note<span className="font-normal text-slate-600">Operators only. At least {RESOLVE_NOTE_MIN} characters, kept in the audit log.</span>
        <Input id="road-cleared-note" value={note} maxLength={RESOLVE_NOTE_MAX} onChange={event => setNote(event.target.value)} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-small text-rose-800">{error}</p>}
      <DialogFooter className="gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="approve" onClick={() => void save()} disabled={!ok}><CheckCircleIcon size={16} weight="bold" aria-hidden="true" />{busy ? "Saving…" : "Mark cleared"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
