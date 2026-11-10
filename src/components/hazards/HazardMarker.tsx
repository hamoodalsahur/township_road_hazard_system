"use client";
import {
  BarricadeIcon, CloudLightningIcon, RoadHorizonIcon, TrafficConeIcon, TreeIcon, WarningCircleIcon, WavesIcon,
  type Icon,
} from "@phosphor-icons/react";
import { categoryLabel, reviewStateOf, severityOf } from "@/lib/hazard-presentation";

/** Category glyphs from docs/DESIGN.md section 7. Fixed mapping, never taken from report text. */
export const CATEGORY_ICONS: Record<string, Icon> = {
  flooding: WavesIcon,
  roadworks: TrafficConeIcon,
  fallen_tree: TreeIcon,
  pothole: RoadHorizonIcon,
  road_obstruction: BarricadeIcon,
  storm_damage: CloudLightningIcon,
  other: WarningCircleIcon,
};
export const categoryIcon = (category: string): Icon => CATEGORY_ICONS[category] ?? WarningCircleIcon;

// Upright rounded pin, 36 x 42 inside a 46 x 52 box (5 px room for the selection ring).
const PIN = "M13,2 H23 A10,10 0 0 1 33,12 V22 A10,10 0 0 1 23,32 H22 L18,39 L14,32 H13 A10,10 0 0 1 3,22 V12 A10,10 0 0 1 13,2 Z";
const OUTLINE = "rgba(15,21,19,.7)";
const SURFACE = "#FFFFFF";
const SELECTED = "#0B7350";

type Props = {
  category: string;
  impact: string;
  reviewState: string;
  selected?: boolean;
  /** Pin height in px (the design size is 42). */
  size?: number;
  /** Set when a nearby text already says the same thing. */
  decorative?: boolean;
  className?: string;
};

/**
 * Hazard pin: glyph = category, colour = severity, fill = verification
 * (outlined while being checked, solid once approved).
 */
export default function HazardMarker({ category, impact, reviewState, selected = false, size = 42, decorative = false, className }: Props) {
  const severity = severityOf(impact);
  const state = reviewStateOf(reviewState);
  const Glyph = categoryIcon(category);
  const solid = state.markerFill === "solid";
  const label = `${categoryLabel(category)}, ${severity.label}, ${state.label}`;
  const scale = size / 42;
  return <svg width={46 * scale} height={52 * scale} viewBox="-5 -5 46 52" className={className}
    role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : label}
    style={{ flexShrink: 0, overflow: "visible" }}>
    {decorative ? null : <title>{label}</title>}
    {selected ? <path d={PIN} fill="none" stroke={SELECTED} strokeWidth={7} strokeLinejoin="round" /> : null}
    {solid
      ? <path d={PIN} fill={severity.solid} stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
      : <>
          <path d={PIN} fill={SURFACE} stroke={OUTLINE} strokeWidth={5.5} strokeLinejoin="round" />
          <path d={PIN} fill={SURFACE} stroke={severity.solid} strokeWidth={3.2} strokeLinejoin="round" />
        </>}
    <Glyph x={9} y={8} width={18} height={18} weight="bold" color={solid ? severity.glyph : severity.text} aria-hidden="true" />
  </svg>;
}
