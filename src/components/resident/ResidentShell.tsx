"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { InfoIcon, ListChecksIcon, MapTrifoldIcon, PathIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useServiceArea } from "@/hooks/useServiceArea";
import { PRODUCT_NAME } from "@/lib/product";

/** Resident tabs (DESIGN.md "Resident website"): the same three jobs as the phone app. */
export const RESIDENT_TABS = [
  { href: "/resident", label: "Map", long: "Map", icon: MapTrifoldIcon },
  { href: "/resident/report", label: "Report", long: "Report a problem", icon: PlusIcon },
  { href: "/resident/mine", label: "My reports", long: "My reports", icon: ListChecksIcon },
] as const;

/** Lets the report steps hide the phone tab bar and show a close button instead, like the mockups. */
const FocusContext = createContext<(focused: boolean) => void>(() => {});
export const useResidentFocus = () => useContext(FocusContext);

export function activeResidentTab(pathname: string): string {
  if (pathname.startsWith("/resident/report")) return "/resident/report";
  if (pathname.startsWith("/resident/mine")) return "/resident/mine";
  return "/resident";
}

export default function ResidentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = activeResidentTab(pathname);
  const [focused, setFocused] = useState(false);
  // Pages that hide the tab bar (report steps, way-home setup) turn it back on when they unmount.
  const { data: serviceArea } = useServiceArea();

  return (
    <FocusContext.Provider value={setFocused}>
      <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-night-line bg-night-bar text-night-text">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 sm:px-8 lg:h-[58px]">
            <Link href="/resident" className="flex shrink-0 items-center gap-3" aria-label={`${PRODUCT_NAME} map`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-mint text-night-on-mint"><PathIcon size={20} aria-hidden="true" /></span>
              <span className="font-display text-heading font-semibold">{PRODUCT_NAME}</span>
            </Link>
            <nav aria-label="Resident pages" className="hidden h-full items-stretch gap-6 lg:flex">
              {RESIDENT_TABS.map(tab => {
                const current = active === tab.href;
                const Icon = tab.icon;
                return <Link key={tab.href} href={tab.href} aria-current={current ? "page" : undefined}
                  className={"flex items-center gap-2 whitespace-nowrap text-body font-medium transition-colors " +
                    (current ? "text-white shadow-[inset_0_-3px_0_#7FD4AE]" : "text-night-muted hover:text-white")}>
                  <Icon size={18} aria-hidden="true" />{tab.long}
                </Link>;
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-night-edge px-3 py-1 text-caption text-night-muted"
                title="Fictional demo reports, not live road conditions">
                <InfoIcon size={14} aria-hidden="true" /><span className="hidden sm:inline">{serviceArea.area.name} ·</span> Demo data
                <span className="sr-only">: fictional reports, not live road conditions</span>
              </span>
              {focused ? <Link href="/resident" className="flex h-11 w-11 items-center justify-center rounded-lg text-night-text hover:bg-night-raised lg:hidden" aria-label="Close and go back to the map">
                <XIcon size={22} weight="bold" aria-hidden="true" />
              </Link> : null}
            </div>
          </div>
        </header>
        <main className={"flex min-h-0 flex-1 flex-col " + (focused ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0")}>{children}</main>
        {focused ? null : <nav aria-label="Resident pages" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="mx-auto flex max-w-xl">
            {RESIDENT_TABS.map(tab => {
              const current = active === tab.href;
              const Icon = tab.icon;
              return <li key={tab.href} className="flex-1"><Link href={tab.href} aria-current={current ? "page" : undefined}
                className={"flex min-h-16 flex-col items-center justify-center gap-1 text-caption " + (current ? "font-semibold text-slate-900" : "font-medium text-slate-600")}>
                <Icon size={24} weight={current ? "fill" : "regular"} aria-hidden="true" />{tab.label}
              </Link></li>;
            })}
          </ul>
        </nav>}
      </div>
    </FocusContext.Provider>
  );
}
