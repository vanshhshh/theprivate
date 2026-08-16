import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get("session")?.value);
  return NextResponse.json({ user: publicUser(user) });
}
