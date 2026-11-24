/**
 * Five real operator routes (AI & Research removed 24 Nov 2026), shared by top navigation and local route tests.
 * Navigation labels are UI structure, not a change to permissions.
 */
export const MANAGEMENT_SECTIONS = [
  {id:"overview",label:"Overview",href:"/management",description:"Fictional workload and operator activity at a glance."},
  {id:"incidents",label:"Incidents",href:"/management/incidents",description:"Review reports and manage fictional incident groups."},
  {id:"maps",label:"Maps & Simulation",href:"/management/maps",description:"Unverified OSM reference and separate schematic simulation."},
  {id:"evidence",label:"Evidence",href:"/management/evidence",description:"Private photo inventory and publication safeguards."},
  {id:"system",label:"System & Audit",href:"/management/system",description:"Source diagnostics, consistency and audit history."}
] as const;
export type ManagementSectionId=(typeof MANAGEMENT_SECTIONS)[number]["id"];

export function managementSectionFromPath(pathname:string):ManagementSectionId|null{
  const path=pathname.replace(/\/+$/,"")||"/";
  const item=MANAGEMENT_SECTIONS.find(s=>s.href===path);
  return item?.id??null;
}
