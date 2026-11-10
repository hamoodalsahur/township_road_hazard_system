import type {RoadFeature} from "./bbr-roads";
import type {HazardImpact} from "./v2-hazard-validation";
import {DEFAULT_SERVICE_AREA,isInsideServiceArea,type ServiceArea} from "./service-area";

/** A fiction-only visual comparison, never a measured or verified road status. */
export type ReviewedDemoReport={
  id:string;longitude:number;latitude:number;impact:HazardImpact;reviewState:string;
};
export type CandidateVicinityStroke={
  reportId:string;wayId:string;impact:"caution"|"partial_obstruction"|"suspected_closure";
  points:[[number,number],[number,number]];
  approximateMetres:number;
};
const priorities={caution:1,partial_obstruction:2,suspected_closure:3};
const permitted=new Set(Object.keys(priorities));
const MAX_RADIUS=25;
const AMBIGUITY_GAP=6;
const halfLengthMetres=30;

/** A short near-point overlay, not coloring a whole street or declaring it obstructed. */
function projection(point:readonly [number,number],a:readonly [number,number],b:readonly [number,number]){
 const mid=point[1]*Math.PI/180;
 const scaleX=111320*Math.cos(mid),scaleY=110540;
 const ax=(a[0]-point[0])*scaleX,ay=(a[1]-point[1])*scaleY;
 const bx=(b[0]-point[0])*scaleX,by=(b[1]-point[1])*scaleY;
 const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
 const t=length===0?0:Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(length*length)));
 return {distance:Math.hypot(ax+t*dx,ay+t*dy),t,length};
}
function clippedSegment(a:[number,number],b:[number,number],t:number,length:number):[[number,number],[number,number]]{
 const before=length===0?0:Math.min(t,halfLengthMetres/length);
 const after=length===0?0:Math.min(1-t,halfLengthMetres/length);
 const interpolate=(f:number):[number,number]=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
 return [interpolate(t-before),interpolate(t+after)];
}
/** Only corroborated fictional reports with an explicit suspected impact are candidates.
 * Suppress ambiguous nearest road ways (including duplicated source way IDs).
 */
export function reviewedDemoVicinityStrokes(
 roads:readonly RoadFeature[],reports:readonly ReviewedDemoReport[],area:ServiceArea=DEFAULT_SERVICE_AREA
):CandidateVicinityStroke[]{
 const duplicates=new Set<string>(),seen=new Set<string>();
 for(const road of roads){
  if(seen.has(road.properties.id))duplicates.add(road.properties.id);
  seen.add(road.properties.id);
 }
 const result:CandidateVicinityStroke[]=[];
 for(const report of reports.slice(0,100)){
  if(report.reviewState!=="corroborated"||!permitted.has(report.impact)||
    !isInsideServiceArea(area,report.longitude,report.latitude))continue;
  const point=[report.longitude,report.latitude] as const;
  const candidates: {road:RoadFeature;distance:number;t:number;length:number;segment:number}[]=[];
  for(const road of roads){
   if(duplicates.has(road.properties.id))continue;
   // Grade-separated OSM geometry can appear to cross visually but need not connect.
   if((road.properties.bridge&&road.properties.bridge!=="no")||
      (road.properties.tunnel&&road.properties.tunnel!=="no"))continue;
   let best={distance:Infinity,t:0,length:0,segment:0};
   for(let i=1;i<road.geometry.coordinates.length;i++){
    const p=projection(point,road.geometry.coordinates[i-1],road.geometry.coordinates[i]);
    if(p.distance<best.distance)best={...p,segment:i};
   }
   if(best.distance<=MAX_RADIUS+AMBIGUITY_GAP)candidates.push({road,...best});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const best=candidates[0],next=candidates[1];
  if(!best||best.distance>MAX_RADIUS||(next&&next.distance-best.distance<AMBIGUITY_GAP))continue;
  const coords=best.road.geometry.coordinates;
  if(best.length<0.5)continue;
  result.push({
   reportId:report.id,wayId:best.road.properties.id,
   impact:report.impact as CandidateVicinityStroke["impact"],
   points:clippedSegment(coords[best.segment-1],coords[best.segment],best.t,best.length),
   approximateMetres:Math.round(best.distance)
  });
 }
 // Low suspected severity is drawn below higher levels if multiple demonstration strokes overlap.
 return result.sort((a,b)=>priorities[a.impact]-priorities[b.impact]||a.reportId.localeCompare(b.reportId));
}
export const DEMO_IMPACT_LEGEND=[
 {impact:"caution",label:"Caution vicinity",color:"#eab308"},
 {impact:"partial_obstruction",label:"Partial obstruction vicinity",color:"#f97316"},
 {impact:"suspected_closure",label:"Suspected closure vicinity",color:"#dc2626"}
] as const;
export function candidateVicinityColor(impact:CandidateVicinityStroke["impact"]){
 return DEMO_IMPACT_LEGEND.find(x=>x.impact===impact)?.color??"#64748b";
}
