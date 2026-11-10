import {mayAcceptDemoSubmission,checkDemoJsonSize,readBoundedDemoJson,DemoBodyTooLargeError} from "@/lib/v2-demo-write-guard";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateHazardSubmission } from "@/lib/v2-hazard-validation";
import { loadServiceArea } from "@/lib/service-area-server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const records = await prisma.hazardReport.findMany({ orderBy:{createdAt:"desc"}, take:100,
      select:{id:true,category:true,description:true,longitude:true,latitude:true,impact:true,reviewState:true,createdAt:true,sourceMode:true,evidence:{select:{status:true}}} });
    return NextResponse.json({mode:"simulation", reports:records.filter(x=>x.sourceMode==="simulation"&&x.reviewState!=="rejected").map(({evidence,...report})=>({...report,hasApprovedPhoto:report.reviewState==="corroborated"&&evidence?.status==="approved_public_demo"})), disclaimer:"FICTIONAL geographic report examples. Not verified road conditions or real travel advice."});
  } catch {
    return NextResponse.json({error:"Demo hazard database unavailable. Run npm run db:push."},{status:500});
  }
}
export async function POST(request:Request) {
  if(!mayAcceptDemoSubmission(process.env.NODE_ENV))return NextResponse.json({error:"Public demo submissions are disabled outside local development"},{status:403});
  if(!checkDemoJsonSize(request,8192))return NextResponse.json({error:"Demo report payload is too large"},{status:413});
  try {
    const body: unknown = await readBoundedDemoJson(request,8192);
    const data=validateHazardSubmission(body,loadServiceArea().area);
    const record=await prisma.hazardReport.create({data:{category:data.category,description:data.description,longitude:data.coordinates[0],latitude:data.coordinates[1],impact:data.impact,sourceMode:"simulation",reviewState:"unverified"}});
    return NextResponse.json({report:record,disclaimer:"Fictional report recorded. It does not change any road status."},{status:201});
  } catch(error) {
    if(error instanceof DemoBodyTooLargeError)return NextResponse.json({error:"Demo JSON payload is too large"},{status:413});
    if(error instanceof SyntaxError || error instanceof Error&&/Invalid|Choose|Description|Select/.test(error.message))
      return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({error:"Could not save demo hazard report."},{status:500});
  }
}
