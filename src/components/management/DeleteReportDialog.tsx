"use client";

import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Delete a report for good (24 Nov 2026). Asks once, says exactly what goes with it. */
export default function DeleteReportDialog({ open, onOpenChange, reportId, title, operatorKey, onDone }: {
  open: boolean; onOpenChange: (open: boolean) => void; reportId: string; title: string; operatorKey: string;
  onDone: (closuresRemoved: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v2/hazards/${encodeURIComponent(reportId)}`, { method: "DELETE", headers: { "x-demo-operator-key": operatorKey } });
      const result = await response.json().catch(() => ({})) as { error?: string; closuresRemoved?: number };
      if (!response.ok) throw new Error(result.error ?? "The report was not deleted");
      window.dispatchEvent(new Event("township-closures-updated"));
      window.dispatchEvent(new Event("township-hazards-updated"));
      onDone(result.closuresRemoved ?? 0);
      onOpenChange(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The report was not deleted"); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={value => { if (!busy) { setError(""); onOpenChange(value); } }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Delete this {title.toLowerCase()} report?</DialogTitle>
        <DialogDescription>
          It is removed from the database for good, with its photo and any road closures made from it. It also leaves its incident group, if it has one.
          This can’t be undone. The audit history keeps a note that it was deleted.
        </DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-small text-rose-800">{error}</p>}
      <DialogFooter className="gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
        <Button variant="reject" onClick={() => void remove()} disabled={busy}><TrashIcon size={16} weight="bold" aria-hidden="true" />{busy ? "Deleting…" : "Delete report"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
