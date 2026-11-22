import {NextResponse} from "next/server";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {loadActiveRoads} from "@/lib/road-lines-server";
import {analyseRoadAccessTags} from "@/lib/v2-road-access-tags";

export const dynamic="force-dynamic";
export async function GET(request:Request){
  if(!canUseDemoOperatorApi(request)){
    return NextResponse.json({error:"Local demo operator access required"},{status:403,headers:{"Cache-Control":"no-store"}});
  }
  try{
    const roads=await loadActiveRoads();
    if(!roads.collection)return NextResponse.json({error:"Local road reference file invalid"},{status:422,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json({metrics:analyseRoadAccessTags(roads.collection),source:"unverified locally imported OSM tags",roadSource:roads.source},{headers:{"Cache-Control":"private, no-store"}});
  }catch{
    return NextResponse.json({error:"Unable to inspect local OSM tags"},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}
