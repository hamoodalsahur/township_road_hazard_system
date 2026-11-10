import type {ReactNode} from "react";
import {MANAGEMENT_SECTIONS,type ManagementSectionId} from "@/lib/management-sections";

/** Page title. `subtitle` replaces the standard description, for pages with a live summary line. */
export default function ManagementSectionHeading({section,subtitle}:{section:ManagementSectionId;eyebrow?:string;subtitle?:ReactNode}){
  const item=MANAGEMENT_SECTIONS.find(x=>x.id===section);
  if(!item)return null;
  return <div className="mb-6">
    <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.03em] text-slate-900">{item.label}</h1>
    {subtitle??<p className="mt-1.5 max-w-3xl text-[15px] text-slate-600">{item.description}</p>}
  </div>;
}
