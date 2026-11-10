import type { Config } from "tailwindcss";
import { BRAND_GREEN, WARM_NEUTRAL } from "./src/lib/design-tokens";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Design direction (docs/DESIGN.md): warm neutrals carry the interface and one calm
      // green marks actions. The existing `slate` and `teal` class names are remapped so
      // every page takes the new look without layout changes.
      colors: {
        slate: WARM_NEUTRAL,
        teal: BRAND_GREEN,
        navy: "#102840",
        ocean: "#176891",
        mist: "#eef5f8",
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Arial", "sans-serif"],
        mono: ['"Atkinson Hyperlegible Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      // Small controls 6px, panels 12px (DESIGN.md section 8).
      borderRadius: {
        lg: "6px",
        "2xl": "12px",
        "3xl": "16px",
      },
    },
  },
  plugins: [],
};

export default config;
