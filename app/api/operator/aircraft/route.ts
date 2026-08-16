import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, readJson, requiredString, requireOperator } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    const body = await readJson(req);
    const id = requiredString(body.id, "id");
    const aircraft = await db.aircraft.findFirst({ where: { id, operatorId: user.operatorId! } });
    if (!aircraft) return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });

    return NextResponse.json({
      aircraft: await db.aircraft.update({
        where: { id: aircraft.id },
        data: {
          verified: typeof body.verified === "boolean" ? body.verified : aircraft.verified,
          active: typeof body.active === "boolean" ? body.active : aircraft.active,
        },
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
