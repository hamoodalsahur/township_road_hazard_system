/**
 * Evidence page, Night Desk (roadmap 4.2b, step 4a): how photos are grouped and worded.
 * Presentation only: nothing here changes who can see a photo.
 */
import type { PrivatePhotoState } from "./v214-evidence-state";

export type GalleryStatus = "waiting" | "public" | "private" | "check";
export type GalleryFilter = "all" | GalleryStatus;

/**
 * A photo is "shown to residents" only when it is approved AND its report is approved, the same rule
 * the resident map uses. A private photo on a report still waiting is "waiting for a decision".
 */
export function galleryStatus(state: PrivatePhotoState | undefined, reviewState: string): GalleryStatus {
  if (state === "approved_public_demo") return reviewState === "corroborated" ? "public" : "check";
  if (state === "private_unreviewed") return reviewState === "unverified" ? "waiting" : "private";
  if (state === "private_rejected") return "private";
  return "check";
}

export const GALLERY_LABEL: Record<GalleryStatus, string> = {
  waiting: "Waiting for a decision",
  public: "Shown to residents",
  private: "Operators only",
  check: "Needs checking",
};

export function galleryCounts(statuses: readonly GalleryStatus[]): Record<GalleryFilter, number> {
  const counts: Record<GalleryFilter, number> = { all: statuses.length, waiting: 0, public: 0, private: 0, check: 0 };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

/** "18.2 MB", "640 KB", "0 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** The header line: "14 photos. 5 are shown to residents, the rest stay with operators." */
export function evidenceSummary(counts: Record<GalleryFilter, number>): string {
  if (counts.all === 0) return "No photos yet. Photos that residents attach to reports appear here.";
  const photos = `${counts.all} ${counts.all === 1 ? "photo" : "photos"}.`;
  if (counts.public === 0) return `${photos} None are shown to residents.`;
  if (counts.public === counts.all) return `${photos} All are shown to residents.`;
  return `${photos} ${counts.public} ${counts.public === 1 ? "is" : "are"} shown to residents, the rest stay with operators.`;
}
