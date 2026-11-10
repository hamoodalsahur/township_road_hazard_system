/**
 * Colour tokens from docs/DESIGN.md. Tailwind maps these onto the `slate` and `teal`
 * class names (see tailwind.config.ts), so pages pick them up without markup changes.
 * tests/design-tokens.test.ts checks their contrast whenever they change.
 */

/** Warm neutrals: 50 = paper, 100 = sunken, 200 = line, 500 = subtle text, 900 = ink. */
export const WARM_NEUTRAL = {
  50: "#F5F3EE",
  100: "#ECE9E2",
  200: "#DDD8CE",
  300: "#C5BEB1",
  400: "#8A8478",
  500: "#5C6560",
  600: "#4F5853",
  700: "#3A433E",
  800: "#283029",
  900: "#1B2420",
  950: "#111513",
} as const;

/** Expressway green for actions, links, selection and focus. 800 is the primary green. */
export const BRAND_GREEN = {
  50: "#EEF5F1",
  100: "#E5EFEA",
  200: "#C6DDD2",
  300: "#9CC5B1",
  400: "#5FA184",
  500: "#2F7E5E",
  600: "#1F6A4D",
  700: "#1A5F45",
  800: "#17573F",
  900: "#0F3F2D",
  950: "#0A2A1E",
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
