import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/product";

export const metadata: Metadata = { title: "About and privacy" };

const SECTIONS: { title: string; items: string[] }[] = [
  { title: "What this is", items: [
    `${PRODUCT_NAME} is a demonstration of a township road-problem service: residents report, the township team checks, and everyone sees the result on one map.`,
    "All reports, closures and photos are fictional demo data. Nothing here is a live road condition, an official closure or travel advice.",
    "Road lines come from OpenStreetMap and have not been checked on the ground.",
  ] },
  { title: "What is kept, and where", items: [
    "Reports you send: the type, how bad it is, the place on the map, your words and an optional photo. They are kept on the demo server so the township team can check them.",
    "Photos are shrunk and their location data removed before sending. Only the township team sees them, unless they approve a photo for everyone.",
    "My reports: only the report ids, type and send time, kept in this browser. Clearing your browser data removes the list, not the reports.",
    "Your home for way home: kept in this browser only, rounded to about 1 metre. It is never saved on the server.",
  ] },
  { title: "Who else sees what", items: [
    "When you check your way home, the start and home points are sent to OpenRouteService (run by HeiGIT) to work out the route. This app does not store or log them.",
    "Your location is only asked for when you press \"Use my location\" or check your way home from where you are, and only used for that moment.",
    "The map background is loaded from OpenFreeMap, which does not use cookies.",
  ] },
];

/** About and privacy (presentation polish): what the demo is, what is kept where, and who sees what. */
export default function AboutPage() {
  return <div className="flex-1">
    <section className="bg-night px-4 pb-6 pt-5 text-night-text sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-display font-semibold">About and privacy</h1>
        <p className="mt-1 text-body text-night-muted">In plain words: what this demo does and what happens to your information.</p>
      </div>
    </section>
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-0">
      {SECTIONS.map(section => <section key={section.title} aria-labelledby={section.title}>
        <h2 id={section.title} className="font-display text-title font-semibold">{section.title}</h2>
        <ul className="mt-3 grid gap-2">
          {section.items.map(item => <li key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-body text-slate-800">{item}</li>)}
        </ul>
      </section>)}
      <p className="text-small text-slate-600">Map data © OpenStreetMap contributors. Map style © OpenFreeMap and OpenMapTiles. Routes by OpenRouteService. <Link href="/resident" className="underline underline-offset-2">Back to the map</Link></p>
    </div>
  </div>;
}
