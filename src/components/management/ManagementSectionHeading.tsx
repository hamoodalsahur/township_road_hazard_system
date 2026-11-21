"use client";

import {useContext,type ReactNode} from "react";
import {createPortal} from "react-dom";
import {MANAGEMENT_SECTIONS,type ManagementSectionId} from "@/lib/management-sections";
import {HeaderSlotContext} from "@/components/management/header-slot";

/**
 * The navy page header under the top bar (Night Desk). Inside ManagementShell it is portalled into the
 * shell's header slot so it runs full width; elsewhere (tests, previews) it renders in place.
 * `subtitle` replaces the standard description, for pages with a live summary line. `actions` sit on the
 * right (search, refresh) and `tabs` along the bottom edge. Content here sits on navy: use the `night-*`
 * text colours and the `night`/`nightGhost` button variants.
 */
export default function ManagementSectionHeading({section,subtitle,actions,tabs}:{section:ManagementSectionId;eyebrow?:string;subtitle?:ReactNode;actions?:ReactNode;tabs?:ReactNode}){
  const {inShell,slot}=useContext(HeaderSlotContext);
  const item=MANAGEMENT_SECTIONS.find(x=>x.id===section);
  if(!item)return null;
  const band=<section aria-labelledby={`page-title-${section}`} className="bg-night text-night-text">
    <div className={"mx-auto max-w-[1440px] px-4 pt-6 sm:px-8 "+(tabs?"pb-0":"pb-6")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 id={`page-title-${section}`} className="font-display text-title font-semibold sm:text-display">{item.label}</h1>
          {subtitle??<p className="mt-1 max-w-3xl text-body text-night-muted">{item.description}</p>}
        </div>
        {actions?<div className="flex flex-wrap items-center gap-2">{actions}</div>:null}
      </div>
      {tabs?<div className="mt-4">{tabs}</div>:null}
    </div>
  </section>;
  if(!inShell)return band;
  return slot?createPortal(band,slot):null;
}
