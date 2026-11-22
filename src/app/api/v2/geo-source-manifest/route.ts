import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {validRoadCollection} from "@/lib/bbr-roads";
import {activeRoadsPath} from "@/lib/service-area-server";
import {summarizeLocalGeoSource} from "@/lib/v2-geo-source-manifest";
export const dynamic="force-dynamic";

/** Server-side fingerprint of the LOCAL demo file. Does not publish the raw file. */
export async function GET(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json(
  {error:"Local demo operator access required"},
  {status:403,headers:{"Cache-Control":"private, no-store"}}
 );
 try{
  const bytes=await readFile(activeRoadsPath());
  const raw:unknown=JSON.parse(bytes.toString("utf8"));
  if(!validRoadCollection(raw))return NextResponse.json(
    {error:"Local GeoJSON is missing or invalid"},
    {status:422,headers:{"Cache-Control":"private, no-store"}}
  );
  const sha256=createHash("sha256").update(bytes).digest("hex");
  return NextResponse.json({manifest:summarizeLocalGeoSource(raw,sha256,bytes.byteLength)},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch{
  return NextResponse.json({error:"Unable to inspect local geographic reference copy"},
   {status:500,headers:{"Cache-Control":"private, no-store"}});
 }
}
