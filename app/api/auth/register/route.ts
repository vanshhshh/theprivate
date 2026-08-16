import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { errorResponse, readJson, requiredString } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const email = requiredString(body.email, "email").toLowerCase();
    const password = requiredString(body.password, "password");
    const name = requiredString(body.name, "name");
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name,
        phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      },
    });
    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
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
