import Link from "next/link";
import { ArrowUpRight, Waves } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/product";

type Page = "home" | "resident" | "management";
const links: { href: string; label: string; page: Page }[] = [
  { href: "/", label: "Overview", page: "home" },
  { href: "/resident", label: "Resident view", page: "resident" },
  { href: "/management", label: "Management", page: "management" },
];

export default function SiteHeader({ current }: { current: Page }) {
  return (
    <header className="relative z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3 text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-sm transition group-hover:bg-teal-700">
            <Waves size={21} strokeWidth={2} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight sm:text-base">{PRODUCT_NAME}</span>
            <span className="block text-[11px] font-medium text-slate-500">Bandar Bukit Raja · Research prototype</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Main navigation">
          {links.map(link => (
            <Link key={link.href} href={link.href} aria-current={current === link.page ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${current === link.page ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
              {link.label}{current === link.page ? <ArrowUpRight size={13} aria-hidden="true" /> : null}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
