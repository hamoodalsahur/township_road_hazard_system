"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useState,type FormEvent,type ReactNode} from "react";
import {ArrowUpRight,LockKeyhole,LogOut,Waves,LayoutDashboard,ClipboardList,MapPinned,Images,BrainCircuit,Settings2} from "lucide-react";
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

  const sectionIcons={overview:LayoutDashboard,incidents:ClipboardList,maps:MapPinned,evidence:Images,research:BrainCircuit,system:Settings2};
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {operatorKey ? <OperatorKeyContext.Provider value={operatorKey}>
      <div className="lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <Link href="/management" className="flex items-center gap-3 px-5 py-5 text-slate-900" aria-label={`${PRODUCT_NAME} management overview`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white"><Waves size={23} aria-hidden="true"/></span>
            <span><strong className="block text-sm leading-5">{PRODUCT_NAME}</strong><span className="text-xs text-slate-500">Management workspace</span></span>
          </Link>
          <nav aria-label="Management sections" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-4 lg:flex-col lg:gap-2 lg:overflow-visible">
            {MANAGEMENT_SECTIONS.map(section=>{
              const Icon=sectionIcons[section.id];
              return <Link key={section.id} href={section.href} aria-current={active===section.id?"page":undefined}
                className={"flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors "+
                (active===section.id?"bg-teal-50 text-teal-900 ring-1 ring-teal-100":"text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                <Icon size={18} aria-hidden="true"/>{section.label}
              </Link>;
            })}
          </nav>
          <p className="mx-4 mb-5 hidden rounded-xl bg-slate-50 px-3 py-4 text-xs leading-5 text-slate-500 lg:absolute lg:bottom-0 lg:block">
            Academic demonstration. Incident records are fictional; OSM roads are unverified reference data.
          </p>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
            <p className="text-sm font-semibold text-slate-700">Township management</p>
            <div className="flex items-center gap-3">
              <Link href="/resident" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Resident view <ArrowUpRight size={13}/></Link>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-900 text-xs font-bold text-white" aria-label="Local demo operator">OP</span>
              <button type="button" onClick={logout} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><LogOut size={14}/> Log out</button>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-5 pb-20 pt-7 sm:px-8">{children}</main>
        </div>
      </div>
    </OperatorKeyContext.Provider> :
      <div className="mx-auto max-w-md px-4 pb-20 pt-16">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-label="Management login">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-teal-50 p-3"><LockKeyhole size={25} className="text-teal-700"/></div>
            <h1 className="text-2xl font-bold">Management sign in</h1>
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
