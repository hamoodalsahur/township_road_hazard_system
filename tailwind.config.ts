import type { Config } from "tailwindcss";
import { BRAND_GREEN, NEUTRAL, SHADOW } from "./src/lib/design-tokens";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Design direction (docs/DESIGN.md, Crisp Modern): cool neutrals carry the interface and
      // one jade green marks actions. The existing `slate` and `teal` class names are remapped
      // so every page takes the new look without layout changes.
      colors: {
        slate: NEUTRAL,
        teal: BRAND_GREEN,
        navy: "#102840",
        ocean: "#176891",
        mist: "#eef5f8",
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Arial", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      // Controls 10px, cards 18px, large panels and sheets 24px (DESIGN.md section 8).
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      // Soft layered shadows instead of heavy borders (DESIGN.md section 8).
      boxShadow: {
        sm: SHADOW.sm,
        DEFAULT: SHADOW.md,
        md: SHADOW.md,
        lg: SHADOW.lg,
      },
    },
  },
  plugins: [],
};

export default config;
