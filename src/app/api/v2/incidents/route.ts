import {NextResponse} from "next/server";
import {prisma} from "@/lib/db";
import {canUseDemoOperatorApi} from "@/lib/demo-access";
import {validateIncidentCreate} from "@/lib/v2-incident-rules";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Development operator access required"},{status:403});
 const incidents=await prisma.demoIncident.findMany({where:{sourceMode:"simulation"},orderBy:{createdAt:"desc"},take:70,
  include:{reports:{select:{reportId:true,linkedAt:true,report:{select:{category:true,description:true,reviewState:true,createdAt:true,impact:true}}}}}});
 return NextResponse.json({incidents,disclaimer:"Fictional incident groups only. No verified road impacts."},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
 if(!canUseDemoOperatorApi(request))return NextResponse.json({error:"Development operator access required"},{status:403});
 try{
  const data=validateIncidentCreate(await request.json());
  const outcome=await prisma.$transaction(async tx=>{
   const report=await tx.hazardReport.findUnique({where:{id:data.reportId},include:{incidentLink:true}});
   if(!report||report.sourceMode!=="simulation")return {error:"Report not found",status:404};
   if(report.reviewState==="rejected")return {error:"Rejected reports cannot start incident groups",status:409};
   if(report.incidentLink)return {error:"Report already linked to an incident",status:409};
   const incident=await tx.demoIncident.create({data:{title:data.title,category:report.category,reviewNote:data.note,
    reports:{create:{reportId:report.id}}}});
   await tx.auditEntry.create({data:{action:"v2_demo_incident_created",subjectId:incident.id,actor:"LOCAL_DEMO_OPERATOR",
    detail:"Grouped report "+report.id+"; operator reason: "+data.note,sourceMode:"simulation"}});
   return {incident};
  });
  if("error" in outcome)return NextResponse.json({error:outcome.error},{status:outcome.status});
  return NextResponse.json({...outcome,disclaimer:"Illustrative management record only; road conditions unchanged."},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error&&/Invalid|Title|Operator/.test(e.message)?e.message:"Could not create incident"},{status:400});}
}
