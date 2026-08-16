import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { errorResponse, readJson, requiredString } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const email = requiredString(body.email, "email").toLowerCase();
    const password = requiredString(body.password, "password");
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
