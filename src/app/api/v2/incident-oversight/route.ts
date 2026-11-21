import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {deriveOversight} from "@/lib/v2-oversight-metrics";
import {parseSince} from "@/lib/overview-today";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Local demo operator access required"},{status:403});
 try {
  const [reports,incidents]=await Promise.all([
   prisma.hazardReport.findMany({where:{sourceMode:"simulation"},select:{id:true,category:true,impact:true,reviewState:true,createdAt:true,incidentLink:{select:{incidentId:true}}}}),
   prisma.demoIncident.findMany({where:{sourceMode:"simulation"},select:{id:true,status:true,createdAt:true,possibleRoad:true,reports:{select:{reportId:true}}}})
  ]);
  const since=parseSince(new URL(request.url).searchParams.get("since"));
  const todays=since?reports.filter(r=>r.createdAt>=since).sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime()):[];
  const today=since?{since:since.toISOString(),received:todays.length,
   reports:todays.slice(0,60).map(r=>({id:r.id,category:r.category,impact:r.impact,reviewState:r.reviewState,createdAt:r.createdAt.toISOString()}))}:null;
  return NextResponse.json({metrics:deriveOversight(reports,incidents),today,generatedAt:new Date().toISOString(),
   disclaimer:"Demo-only descriptive oversight. Ageing is measured against the local server clock; no dispatch service or verified road impacts."},{headers:{"Cache-Control":"private, no-store"}});
 } catch {return NextResponse.json({error:"Oversight information unavailable"},{status:500});}
}
