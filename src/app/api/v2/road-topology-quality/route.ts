import {readFile} from "node:fs/promises";
import {NextResponse} from "next/server";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {validRoadCollection} from "@/lib/bbr-roads";
import {activeRoadsPath} from "@/lib/service-area-server";
import {analyseRoadTopologyQuality} from "@/lib/v2-road-topology-quality";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Local demo operator access required"},{status:403});
 try{
  const file=await readFile(activeRoadsPath(),"utf8");
  const data:unknown=JSON.parse(file);
  if(!validRoadCollection(data))return NextResponse.json({error:"Road reference file is missing or invalid"},{status:422});
  return NextResponse.json({metrics:analyseRoadTopologyQuality(data),source:"locally imported OSM-unverified lines"},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Unable to inspect local road reference file"},{status:500});}
}
