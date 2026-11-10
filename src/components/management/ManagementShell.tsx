"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useEffect,useState,type FormEvent,type ReactNode} from "react";
import {ArrowUpRightIcon,ClipboardTextIcon,GearSixIcon,ImagesIcon,InfoIcon,LockKeyIcon,MapTrifoldIcon,PathIcon,SignOutIcon,SquaresFourIcon,BrainIcon} from "@phosphor-icons/react";
import {MANAGEMENT_SECTIONS,managementSectionFromPath} from "@/lib/management-sections";
import {PRODUCT_NAME} from "@/lib/product";

const OperatorKeyContext=createContext<string|null>(null);

/** Key is kept in React memory only across management child-route transitions.
 * Refresh/logout requires sign-in. Never persist it in a URL, cookie, or browser storage.
 */
export function useManagementOperatorKey():string{
  const key=useContext(OperatorKeyContext);
  if(!key)throw new Error("Management operator context unavailable");
  return key;
}

export default function ManagementShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  const active=managementSectionFromPath(pathname);
  const [password,setPassword]=useState("");
  const [operatorKey,setOperatorKey]=useState("");
  const [error,setError]=useState("");
  const [checking,setChecking]=useState(false);

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
      setPassword("");
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Unable to sign in");
    }finally{setChecking(false);}
  }

  function logout(){
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
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {operatorKey ? <OperatorKeyContext.Provider value={operatorKey}>
      <div className="lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
          <Link href="/management" className="flex items-center gap-3 px-4 py-5 text-slate-900" aria-label={`${PRODUCT_NAME} management overview`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white"><PathIcon size={22} aria-hidden="true"/></span>
            <span><strong className="block text-[17px] font-semibold leading-5">{PRODUCT_NAME}</strong><span className="whitespace-nowrap text-[13px] text-slate-500">Management workspace</span></span>
          </Link>
          <nav aria-label="Management sections" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {MANAGEMENT_SECTIONS.map(section=>{
              const Icon=sectionIcons[section.id];
              const badge=section.id==="incidents"&&needsReview?needsReview:null;
              return <Link key={section.id} href={section.href} aria-current={active===section.id?"page":undefined}
                className={"flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors "+
                (active===section.id?"bg-teal-100 text-teal-900":"text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                <Icon size={20} aria-hidden="true"/><span className="flex-1">{section.label}</span>
                {badge?<span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-semibold text-white" aria-label={`${badge} ${badge===1?"report needs":"reports need"} review`}>{badge}</span>:null}
              </Link>;
            })}
          </nav>
          <p className="mx-4 mb-5 mt-auto hidden px-1 text-xs leading-5 text-slate-500 lg:block">
            Demo service. Reports are fictional; OSM roads are unverified reference data.
          </p>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5 sm:px-8">
            <p className="flex items-center gap-2 text-[13px] text-slate-600"><InfoIcon size={16} aria-hidden="true"/>Demo service: fictional reports, not live road conditions.</p>
            <div className="flex items-center gap-2">
              <Link href="/resident" className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-slate-200">Resident view <ArrowUpRightIcon size={14} aria-hidden="true"/></Link>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-900" aria-label="Local demo operator">OP</span>
              <button type="button" onClick={logout} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-slate-200"><SignOutIcon size={15} aria-hidden="true"/> Log out</button>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8">{children}</main>
        </div>
      </div>
    </OperatorKeyContext.Provider> :
      <div className="mx-auto max-w-md px-4 pb-20 pt-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-label="Management login">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-teal-50 p-3"><LockKeyIcon size={25} className="text-teal-700" aria-hidden="true"/></div>
            <h1 className="text-2xl font-semibold">Management sign in</h1>
            <p className="text-sm text-slate-600">Local demonstration operator access</p>
          </div>
          <form onSubmit={event=>void login(event)} className="space-y-4">
            <label className="block text-sm font-semibold">Demo password
              <input type="password" autoComplete="off" required value={password} onChange={event=>setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3" placeholder="Password from your private .env"/>
            </label>
            {error?<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>:null}
            <button type="submit" disabled={checking||!password} className="w-full rounded-xl bg-teal-800 px-4 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {checking?"Verifying…":"Log in"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">The local demo key is held in memory only. Refreshing requires signing in again.</p>
        </section>
      </div>}
  </div>;
}
