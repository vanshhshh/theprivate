import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, readJson, requireAdmin } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const { status } = await readJson(req);
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const claim = await db.claim.findUnique({ where: { id }, include: { operator: true } });
    if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    if (status === "APPROVED" && !claim.userId) {
      return NextResponse.json({ error: "Claim has no claimant" }, { status: 409 });
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.claim.update({ where: { id }, data: { status } });
      if (status === "APPROVED" && claim.userId) {
        await tx.operator.update({ where: { id: claim.operatorId }, data: { claimed: true, verified: true, active: true } });
        await tx.user.update({ where: { id: claim.userId }, data: { role: "OPERATOR", operatorId: claim.operatorId } });
        await tx.notification.create({
          data: {
            userId: claim.userId,
            type: "CLAIM",
            title: "Operator profile approved",
            body: `${claim.operator.name} is now verified.`,
          },
        });
      }
      return result;
    });

    return NextResponse.json({ claim: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
