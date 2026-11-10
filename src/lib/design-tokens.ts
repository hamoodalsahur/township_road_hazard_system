/**
 * Design tokens from docs/DESIGN.md (Crisp Modern). Tailwind maps the colours onto the `slate` and `teal`
 * class names (see tailwind.config.ts), so pages pick them up without markup changes.
 * tests/design-tokens.test.ts checks their contrast whenever they change.
 */

/** Cool neutrals with a slight green cast: 50 = page, 100 = sunken, 200 = line, 500 = subtle text, 900 = ink. */
export const NEUTRAL = {
  50: "#F6F7F6",
  100: "#F0F2F1",
  200: "#E6E9E7",
  300: "#CDD3D0",
  400: "#848D89",
  500: "#56625C",
  600: "#45514C",
  700: "#333D39",
  800: "#222A27",
  900: "#0F1513",
  950: "#0A0E0C",
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
