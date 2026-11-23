import Link from "next/link";
import { ArrowRightIcon, BellSimpleIcon, HouseLineIcon, ListChecksIcon, MapTrifoldIcon, PathIcon, ShieldCheckIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/product";

const STEPS = [
  { icon: WarningCircleIcon, title: "Residents report", text: "A flood, a fallen tree or a blocked road, in three steps, with an optional photo." },
  { icon: ShieldCheckIcon, title: "The township team checks", text: "Operators approve or reject each report with a reason, and can close roads until a set time." },
  { icon: MapTrifoldIcon, title: "Everyone sees the map", text: "Confirmed problems and closed roads show on the map, and each resident can follow their own reports." },
  { icon: HouseLineIcon, title: "Your way home", text: "Set your home once; the map says whether a closure is on your way and shows a detour." },
];

/** Front page (Night Desk): what the service does, and the two ways in. */
export default function HomePage() {
  return <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
    <header className="border-b border-night-line bg-night-bar text-night-text">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-8 lg:h-[58px]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-mint text-night-on-mint"><PathIcon size={20} aria-hidden="true" /></span>
        <span className="font-display text-heading font-semibold">{PRODUCT_NAME}</span>
        <nav aria-label="Main" className="ml-auto flex items-center gap-5 text-body">
          <Link href="/resident/about" className="hidden text-night-muted hover:text-white sm:inline">About</Link>
          <Link href="/management" className="text-night-muted hover:text-white">Operator sign in</Link>
        </nav>
      </div>
    </header>

    <section className="bg-night text-night-text">
      <div className="mx-auto max-w-[1200px] px-4 pb-14 pt-12 sm:px-8 lg:pb-20 lg:pt-16">
        <p className="text-body text-night-mint">{PRODUCT_TAGLINE}</p>
        <h1 className="mt-3 max-w-3xl font-display text-[40px] font-semibold leading-[44px] sm:text-[52px] sm:leading-[56px]">See what is blocking the roads around you, and tell the township when something is.</h1>
        <p className="mt-5 max-w-2xl text-body text-night-muted sm:text-heading">Residents report road problems from their phone. The township team checks each one, closes roads when needed, and everyone sees the result on one map.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/resident" className="inline-flex h-12 items-center gap-2 rounded-lg bg-night-mint px-5 text-body font-semibold text-night-on-mint hover:bg-[#9ADFBF]">
            Open the map<ArrowRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
          <Link href="/resident/report" className="inline-flex h-12 items-center gap-2 rounded-lg border border-night-edge px-5 text-body font-semibold text-night-text hover:bg-night-raised">
            Report a problem</Link>
        </div>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-night-edge px-3 py-1 text-caption text-night-muted">
          <BellSimpleIcon size={14} aria-hidden="true" />Demo service: all reports and closures are fictional, not live road conditions</p>
      </div>
    </section>

    <section aria-labelledby="how-heading" className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8">
      <h2 id="how-heading" className="font-display text-title font-semibold">How it works</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => <li key={title} className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900"><Icon size={20} weight="bold" aria-hidden="true" /></span>
            <span className="font-display text-heading font-semibold tabular-nums text-slate-500">{i + 1}</span>
          </span>
          <h3 className="mt-4 text-body font-semibold">{title}</h3>
          <p className="mt-1 text-small text-slate-600">{text}</p>
        </li>)}
      </ol>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Link href="/resident/mine" className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <ListChecksIcon size={28} aria-hidden="true" />
          <span><span className="block text-body font-semibold">Already sent a report?</span><span className="block text-small text-slate-600">See what happened to it in My reports.</span></span>
          <ArrowRightIcon size={18} className="ml-auto text-slate-500 group-hover:text-slate-900" aria-hidden="true" />
        </Link>
        <Link href="/management" className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300">
          <ShieldCheckIcon size={28} aria-hidden="true" />
          <span><span className="block text-body font-semibold">Township operators</span><span className="block text-small text-slate-600">Review reports, group incidents and close roads.</span></span>
          <ArrowRightIcon size={18} className="ml-auto text-slate-500 group-hover:text-slate-900" aria-hidden="true" />
        </Link>
      </div>
    </section>

    <footer className="border-t border-slate-200">
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-small text-slate-600 sm:px-8">
        <span>{PRODUCT_NAME} is a demonstration. Map data © OpenStreetMap contributors, map style by OpenFreeMap.</span>
        <Link href="/resident/about" className="underline underline-offset-2 hover:text-slate-900">About and privacy</Link>
      </div>
    </footer>
  </div>;
}
