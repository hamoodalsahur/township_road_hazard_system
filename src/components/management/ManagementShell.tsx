"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useEffect,useState,type FormEvent,type ReactNode} from "react";
import {ArrowUpRightIcon,ClipboardTextIcon,GearSixIcon,ImagesIcon,InfoIcon,ListIcon,LockKeyIcon,MapTrifoldIcon,PathIcon,SignOutIcon,SquaresFourIcon,BrainIcon} from "@phosphor-icons/react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger} from "@/components/ui/dialog";
import {HeaderSlotContext} from "@/components/management/header-slot";
import {MANAGEMENT_SECTIONS,managementSectionFromPath,type ManagementSectionId} from "@/lib/management-sections";
import {PRODUCT_NAME} from "@/lib/product";

const OperatorKeyContext=createContext<string|null>(null);

/** Phones get a bottom tab bar with the three daily sections; the rest sit under "More". */
const PHONE_TAB_IDS:readonly ManagementSectionId[]=["overview","incidents","maps"];
const PHONE_TAB_LABELS:Partial<Record<ManagementSectionId,string>>={maps:"Maps"};

/** Key is kept in React memory only across management child-route transitions.
 * Refresh/logout requires sign-in. Never persist it in a URL, cookie, or browser storage.
 */
export function useManagementOperatorKey():string{
  const key=useContext(OperatorKeyContext);
  if(!key)throw new Error("Management operator context unavailable");
  return key;
}

/** sessionStorage name for the operator key: this tab only. */
const TAB_KEY="laluan.operatorKey.tab";

export default function ManagementShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  const active=managementSectionFromPath(pathname);
  const [password,setPassword]=useState("");
  const [operatorKey,setOperatorKey]=useState("");
  const [error,setError]=useState("");
  const [checking,setChecking]=useState(false);

  // Stay signed in on refresh (24 Nov 2026): the key is kept for this browser tab only (sessionStorage),
  // never kept beyond the tab. Closing the tab or logging out forgets it; it is checked again on load.
  useEffect(()=>{
    let saved:string|null=null;
    try{saved=sessionStorage.getItem(TAB_KEY);}catch{/* storage blocked: sign in as before */}
    if(!saved)return;
    let live=true;
    fetch("/api/audit",{headers:{"x-demo-operator-key":saved},cache:"no-store"})
      .then(r=>{if(!live)return;if(r.ok)setOperatorKey(saved!);else{try{sessionStorage.removeItem(TAB_KEY);}catch{}}})
      .catch(()=>{});
    return ()=>{live=false;};
  },[]);

  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError("");setChecking(true);
    try{
      const response=await fetch("/api/audit",{
        headers:{"x-demo-operator-key":password},cache:"no-store"
      });
      if(!response.ok)throw new Error(response.status===403
        ?"Incorrect demo password. Please try again."
        :"Could not verify the local demo key. Check the development server.");
      setOperatorKey(password);
      try{sessionStorage.setItem(TAB_KEY,password);}catch{/* still signed in until refresh */}
      setPassword("");
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Unable to sign in");
    }finally{setChecking(false);}
  }

  function logout(){
    try{sessionStorage.removeItem(TAB_KEY);}catch{}
    setOperatorKey("");
    setPassword("");
    setError("");
  }

  // Reports waiting for a decision, shown as a badge on Incidents. Refreshed after every review.
  const [needsReview,setNeedsReview]=useState<number|null>(null);
  useEffect(()=>{
    if(!operatorKey){setNeedsReview(null);return;}
    let live=true;
    const refresh=()=>{
      fetch("/api/v2/hazards",{cache:"no-store"})
        .then(r=>r.ok?r.json() as Promise<{reports:{reviewState:string}[]}>:null)
        .then(data=>{if(live)setNeedsReview(data?data.reports.filter(r=>r.reviewState==="unverified").length:null);})
        .catch(()=>{if(live)setNeedsReview(null);});
    };
    refresh();
    window.addEventListener("township-hazards-updated",refresh);
    return ()=>{live=false;window.removeEventListener("township-hazards-updated",refresh);};
  },[operatorKey]);

  const sectionIcons={overview:SquaresFourIcon,incidents:ClipboardTextIcon,maps:MapTrifoldIcon,evidence:ImagesIcon,research:BrainIcon,system:GearSixIcon};
  // The page header band (navy, under the top bar) is filled by each page's ManagementSectionHeading.
  const [headerSlot,setHeaderSlot]=useState<HTMLElement|null>(null);
  const [moreOpen,setMoreOpen]=useState(false);
  useEffect(()=>{setMoreOpen(false);},[pathname]);
  const badgeLabel=(n:number)=>`${n} ${n===1?"report needs":"reports need"} review`;
  const phoneTabs=MANAGEMENT_SECTIONS.filter(section=>PHONE_TAB_IDS.includes(section.id));
  const moreSections=MANAGEMENT_SECTIONS.filter(section=>!PHONE_TAB_IDS.includes(section.id));
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {operatorKey ? <OperatorKeyContext.Provider value={operatorKey}>
      <HeaderSlotContext.Provider value={{inShell:true,slot:headerSlot}}>
      <header className="sticky top-0 z-40 border-b border-night-line bg-night-bar text-night-text">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 sm:px-8 lg:h-[58px]">
          <Link href="/management" className="flex shrink-0 items-center gap-3" aria-label={`${PRODUCT_NAME} management overview`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-mint text-night-on-mint"><PathIcon size={20} aria-hidden="true"/></span>
            <span className="font-display text-heading font-semibold">{PRODUCT_NAME}</span>
          </Link>
          <nav aria-label="Management sections" className="hidden h-full items-stretch gap-6 lg:flex">
            {MANAGEMENT_SECTIONS.map(section=>{
              const badge=section.id==="incidents"&&needsReview?needsReview:null;
              const current=active===section.id;
              return <Link key={section.id} href={section.href} aria-current={current?"page":undefined}
                className={"flex items-center gap-2 whitespace-nowrap text-body font-medium transition-colors "+
                (current?"text-white shadow-[inset_0_-3px_0_#7FD4AE]":"text-night-muted hover:text-white")}>
                {section.label}
                {badge?<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-night-mint px-2 text-caption font-semibold text-night-on-mint" aria-label={badgeLabel(badge)}>{badge}</span>:null}
              </Link>;
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-night-edge px-3 py-1 text-caption text-night-muted sm:inline-flex" title="Demo service: fictional reports, not live road conditions">
              <InfoIcon size={14} aria-hidden="true"/>Demo data<span className="sr-only">: fictional reports, not live road conditions</span>
            </span>
            <Button asChild variant="nightGhost" size="sm" className="hidden lg:inline-flex"><Link href="/resident">Resident view <ArrowUpRightIcon size={14} aria-hidden="true"/></Link></Button>
            <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-night-raised text-caption font-semibold text-night-text lg:flex" aria-label="Local demo operator">OP</span>
            <Button variant="nightGhost" size="sm" onClick={logout} className="hidden lg:inline-flex"><SignOutIcon size={16} aria-hidden="true"/>Log out</Button>
            <span className="inline-flex items-center rounded-full border border-night-edge px-3 py-1 text-caption text-night-muted sm:hidden">Demo data</span>
          </div>
        </div>
      </header>
      <div ref={setHeaderSlot}/>
      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-8 lg:pb-16">{children}</main>
      <nav aria-label="Management sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl">
          {phoneTabs.map(section=>{
            const Icon=sectionIcons[section.id];
            const badge=section.id==="incidents"&&needsReview?needsReview:null;
            const current=active===section.id;
            return <li key={section.id} className="flex-1"><Link href={section.href} aria-current={current?"page":undefined}
              className={"relative flex min-h-16 flex-col items-center justify-center gap-1 text-caption "+(current?"font-semibold text-slate-900":"font-medium text-slate-600")}>
              <Icon size={24} weight={current?"fill":"regular"} aria-hidden="true"/>{PHONE_TAB_LABELS[section.id]??section.label}
              {badge?<span className="absolute left-1/2 top-2 ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-night px-2 text-caption font-semibold text-white" aria-label={badgeLabel(badge)}>{badge}</span>:null}
            </Link></li>;
          })}
          <li className="flex-1">
            <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
              <DialogTrigger className={"flex min-h-16 w-full flex-col items-center justify-center gap-1 text-caption "+(active&&moreSections.some(s=>s.id===active)?"font-semibold text-slate-900":"font-medium text-slate-600")}>
                <ListIcon size={24} aria-hidden="true"/>More
              </DialogTrigger>
              <DialogContent placement="sheet" aria-describedby={undefined}>
                <DialogHeader><DialogTitle>More</DialogTitle></DialogHeader>
                <ul className="grid gap-1">
                  {moreSections.map(section=>{
                    const Icon=sectionIcons[section.id];
                    return <li key={section.id}><Link href={section.href} aria-current={active===section.id?"page":undefined}
                      className={"flex min-h-12 items-center gap-3 rounded-lg px-3 text-body font-medium "+(active===section.id?"bg-slate-100 text-slate-900":"text-slate-700 hover:bg-slate-50")}>
                      <Icon size={20} aria-hidden="true"/>{section.label}</Link></li>;
                  })}
                  <li><Link href="/resident" className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-body font-medium text-slate-700 hover:bg-slate-50"><ArrowUpRightIcon size={20} aria-hidden="true"/>Resident view</Link></li>
                </ul>
                <p className="text-caption text-slate-600">Demo service: fictional reports, not live road conditions</p>
                <Button variant="secondary" onClick={logout}><SignOutIcon size={20} aria-hidden="true"/>Log out</Button>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </nav>
      </HeaderSlotContext.Provider>
    </OperatorKeyContext.Provider> :
      <div className="flex min-h-screen flex-col bg-night-bar px-4 pb-16 pt-10 text-night-text sm:pt-16">
        <div className="mx-auto mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-night-mint text-night-on-mint"><PathIcon size={24} aria-hidden="true"/></span>
          <span className="font-display text-title font-semibold">{PRODUCT_NAME}</span>
        </div>
        <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 text-slate-900 shadow-lg" aria-label="Management login">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-slate-100 p-3"><LockKeyIcon size={24} className="text-slate-900" aria-hidden="true"/></div>
            <h1 className="font-display text-title font-semibold">Management sign in</h1>
            <p className="text-small text-slate-600">Local demonstration operator access</p>
          </div>
          <form onSubmit={event=>void login(event)} className="space-y-4">
            <label className="block text-small font-semibold">Demo password
              <Input type="password" autoComplete="off" required value={password} onChange={event=>setPassword(event.target.value)}
                className="mt-2" placeholder="Password from your private .env"/>
            </label>
            {error?<p role="alert" className="rounded-lg bg-rose-50 p-3 text-small text-rose-800">{error}</p>:null}
            <Button type="submit" disabled={checking||!password} className="w-full">
              {checking?"Verifying…":"Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-caption text-slate-600">Kept for this browser tab only, so a refresh keeps you signed in. Closing the tab or logging out forgets it.</p>
        </section>
      </div>}
  </div>;
}
