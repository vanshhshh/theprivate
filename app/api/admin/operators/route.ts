import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, pageParams, readJson, requiredString, requireAdmin } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { skip, take, page } = pageParams(req);
    const where = req.nextUrl.searchParams.get("q")
      ? { name: { contains: req.nextUrl.searchParams.get("q")!, mode: "insensitive" as const } }
      : {};
    const [operators, total] = await db.$transaction([
      db.operator.findMany({
        where,
        select: {
          id: true,
          name: true,
          priority: true,
          claimed: true,
          verified: true,
          active: true,
          aircraft: { select: { id: true, registration: true, model: true, seats: true, active: true, verified: true } },
          claims: { where: { status: "PENDING" }, select: { id: true, userId: true, createdAt: true } },
          pricing: true,
        },
        orderBy: [{ priority: "asc" }, { name: "asc" }],
        skip,
        take,
      }),
      db.operator.count({ where }),
    ]);
    return NextResponse.json({ operators, page, total });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await readJson(req);
    const operatorId = requiredString(body.operatorId, "operatorId");
    const operator = await db.operator.findUnique({ where: { id: operatorId } });
    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    if (body.approveClaim) {
      const claim = await db.claim.findFirst({ where: { operatorId: operator.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
      if (!claim?.userId) return NextResponse.json({ error: "No pending claimant" }, { status: 404 });
      await db.$transaction([
        db.claim.update({ where: { id: claim.id }, data: { status: "APPROVED" } }),
        db.operator.update({ where: { id: operator.id }, data: { claimed: true, verified: true, active: true } }),
        db.user.update({ where: { id: claim.userId }, data: { role: "OPERATOR", operatorId: operator.id } }),
        db.notification.create({
          data: {
            userId: claim.userId,
            type: "CLAIM",
            title: "Operator profile approved",
            body: `${operator.name} is now verified.`,
          },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }

    const updated = await db.operator.update({
      where: { id: operator.id },
      data: {
        verified: typeof body.verified === "boolean" ? body.verified : operator.verified,
        active: typeof body.active === "boolean" ? body.active : operator.active,
      },
    });
    return NextResponse.json({ operator: updated, actor: user.id });
  } catch (error) {
    return errorResponse(error);
  }
}
