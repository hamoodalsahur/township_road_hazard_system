/**
 * Design tokens from docs/DESIGN.md (Night Desk, chosen 21 November 2026). Tailwind maps the colours onto
 * the `slate` and `teal` class names (see tailwind.config.ts), so pages pick them up without markup changes.
 * tests/design-tokens.test.ts checks their contrast whenever they change.
 */

/** Cool blue-grey neutrals for the light work area: 50 = page, 100 = sunken, 200 = line, 500 = subtle text, 900 = ink. */
export const NEUTRAL = {
  50: "#F2F4F6",
  100: "#EEF1F3",
  200: "#E1E6EA",
  300: "#C9D2D9",
  400: "#7D8995",
  500: "#5A6672",
  600: "#46525E",
  700: "#2A333B",
  800: "#1A2129",
  900: "#111820",
  950: "#0B1015",
} as const;

/**
 * Night chrome: the navy top bar and page headers that frame every screen (Night Desk).
 * Text on it uses `text`, `muted` or `subtle`; `mint` marks the current page and the "now" line.
 */
export const NIGHT = {
  bar: "#0B131B",
  band: "#0E1720",
  raised: "#1A2733",
  line: "#1F2C38",
  edge: "#2A3946",
  text: "#E4ECF2",
  muted: "#9FB0BE",
  subtle: "#7E91A3",
  mint: "#7FD4AE",
  onMint: "#0B1F17",
} as const;

/** Jade green for actions, links, selection and focus. 800 is the primary green. */
export const BRAND_GREEN = {
  50: "#EEF8F3",
  100: "#E3F4EC",
  200: "#C3E6D5",
  300: "#95D2B6",
  400: "#4FB08A",
  500: "#1C8C64",
  600: "#107D57",
  700: "#0D7752",
  800: "#0B7350",
  900: "#064E36",
  950: "#04382A",
} as const;

/**
 * Night Ops dark theme (docs/DESIGN.md, section 5). Recorded now, used when dark mode is
 * built with the screen rebuilds (roadmap step 4.5).
 */
export const DARK = {
  page: "#0D1210",
  surface: "#141A17",
  sunken: "#0A0E0C",
  line: "#26302B",
  ink: "#E7ECE8",
  muted: "#B2BBB5",
  subtle: "#949E98",
  accent: "#6CC79D",
  onAccent: "#0B1F17",
} as const;

/** Soft layered shadows that replace most borders (Crisp Modern). */
export const SHADOW = {
  sm: "0 1px 2px rgba(15,21,19,.05), 0 8px 24px -14px rgba(15,21,19,.18)",
  md: "0 1px 2px rgba(15,21,19,.05), 0 14px 32px -16px rgba(15,21,19,.24)",
  lg: "0 18px 40px -12px rgba(15,21,19,.28)",
} as const;

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map(i => {
      const channel = parseInt(value.slice(i, i + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
