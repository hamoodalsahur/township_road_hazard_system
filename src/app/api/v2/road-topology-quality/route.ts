import {NextResponse} from "next/server";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {loadActiveRoads} from "@/lib/road-lines-server";
import {analyseRoadTopologyQuality} from "@/lib/v2-road-topology-quality";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Local demo operator access required"},{status:403});
 try{
  const roads=await loadActiveRoads();
  if(!roads.collection)return NextResponse.json({error:"Road reference file is missing or invalid"},{status:422});
  return NextResponse.json({metrics:analyseRoadTopologyQuality(roads.collection),source:"locally imported OSM-unverified lines",roadSource:roads.source},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to inspect local road reference file"},{status:500});}
}
