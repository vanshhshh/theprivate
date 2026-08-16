import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/api";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { operatorId } = await req.json();
    const operator = await db.operator.findUnique({ where: { id: operatorId } });
    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    const token = crypto.randomBytes(32).toString("hex");
    await db.claim.create({ data: { operatorId: operator.id, token, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    const origin = process.env.APP_URL || req.nextUrl.origin;
    return NextResponse.json({ url: `${origin}/operator/claim?token=${token}` });
  } catch (error) {
    return errorResponse(error);
  }
}
