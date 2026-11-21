# Shared UI components (shadcn/ui)

These files started from [shadcn/ui](https://ui.shadcn.com) (`npx shadcn@latest add …`, configured in `components.json`) and were then restyled for Night Desk (`docs/DESIGN.md`). They live in the repository on purpose: change them here, not in a package.

Rules when adding or changing one:
- **Colours, sizes and radii come from our tokens only:** `night-*`, `slate-*`, `teal-*`, the named text sizes (`text-caption` … `text-display`) and `rounded-lg` (10 px) for controls. The CLI writes classes for newer Tailwind (`oklch(…)`); replace them, they do nothing in Tailwind 3.
- **Icons are Phosphor** (`@phosphor-icons/react`, `*Icon` names), not Lucide.
- **Touch targets** are 44 px; `size="sm"` is for dense desktop toolbars only.
- **No entrance animations** (`animate-in`, `zoom-in` …). DESIGN.md keeps motion for state changes.
- Merge classes with `cn` from `@/lib/utils`.
- `tests/night-desk-foundation.test.ts` and `tests/design-audit-fixes.test.ts` check these files.
