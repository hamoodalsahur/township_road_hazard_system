import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {loadActiveRoads} from "@/lib/road-lines-server";
import {candidateRoads,type RoadCandidate} from "@/lib/v2-road-candidates";
import {summarizeRoadObservations} from "@/lib/v2-road-observation-summary";
export const dynamic="force-dynamic";
/** Read-only spatial comparison. It does not associate or close a road in the database. */
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Local operator access required"},{status:403});
 try{
  const {id}=await context.params;
  const incident=await prisma.demoIncident.findUnique({where:{id},select:{id:true,sourceMode:true,reports:{select:{report:{select:{sourceMode:true,longitude:true,latitude:true,reviewState:true}}}}}});
  if(!incident||incident.sourceMode!=="simulation")return NextResponse.json({error:"Fictional incident not found"},{status:404});
  const locations=incident.reports.map(x=>x.report).filter(x=>x.sourceMode==="simulation"&&x.reviewState!=="rejected");
  if(locations.length===0)return NextResponse.json({candidates:[],reportLocations:0,disclaimer:"No eligible fictional report locations."});
  const raw=(await loadActiveRoads()).collection;
  if(!raw)return NextResponse.json({error:"Local OSM road file is missing or invalid"},{status:422});
  const map=new Map<string,RoadCandidate>();
  for(const location of locations){
   for(const candidate of candidateRoads([location.longitude,location.latitude],raw.features)){
    const prior=map.get(candidate.id);
    if(!prior||candidate.distanceMetres<prior.distanceMetres)map.set(candidate.id,candidate);
   }
  }
  const points=locations.map(location=>[location.longitude,location.latitude] as const);
  const candidates=[...map.values()]
    .sort((a,b)=>a.distanceMetres-b.distanceMetres||a.id.localeCompare(b.id))
    .slice(0,8)
    .map(candidate=>({
      ...candidate,
      observationSummary:summarizeRoadObservations(points,raw.features,candidate.id)
    }));
  return NextResponse.json({candidates,
    reportLocations:locations.length,roadFeaturesScanned:raw.features.length,
    disclaimer:"Proximity to an unverified OSM road line is NOT an incident-to-road confirmation, navigable connection, road closure or travel safety instruction. Review by an authorised operator is required."},
    {headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to inspect locally imported roads or incident records"},{status:500});}
}
