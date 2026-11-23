import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canUseDemoOperatorApi } from "@/lib/demo-access";
import { validateClosureChange } from "@/lib/road-closures";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

/** Operators: end a closure now, or move its end time. Both need a reason and are audited. */
export async function PATCH(request: Request, context: Context) {
  if (!canUseDemoOperatorApi(request)) return NextResponse.json({ error: "Development operator access required" }, { status: 403 });
  try {
    const { id } = await context.params;
    const body: unknown = await request.json().catch(() => null);
    const result = await prisma.$transaction(async tx => {
      const closure = await tx.roadClosure.findUnique({ where: { id } });
      if (!closure || closure.sourceMode !== "simulation") return { status: 404, error: "Closure not found" };
      if (closure.endedAt) return { status: 409, error: "This closure has already ended" };
      let change;
      try { change = validateClosureChange(body, closure); } catch (error) { return { status: 400, error: error instanceof Error ? error.message : "Invalid change" }; }
      const now = new Date();
      const saved = change.action === "end"
        ? await tx.roadClosure.update({ where: { id }, data: { endedAt: now, endReason: change.reason } })
        : await tx.roadClosure.update({ where: { id }, data: { endsAt: change.endsAt } });
      await tx.auditEntry.create({ data: { subjectId: id, actor: "LOCAL_DEMO_OPERATOR", sourceMode: "simulation",
        action: change.action === "end" ? "v2_road_closure_ended" : "v2_road_closure_extended",
        detail: change.action === "end" ? `Ended; reason: ${change.reason}` : `End time ${closure.endsAt.toISOString()} -> ${change.endsAt.toISOString()}; reason: ${change.reason}` } });
      return { status: 200, closure: saved };
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ closure: result.closure });
  } catch {
    return NextResponse.json({ error: "Could not update the closure" }, { status: 500 });
  }
}
