import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./prisma";

const raw = process.env.AUTH_SECRET;
if (!raw && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
const secret = new TextEncoder().encode(raw || "dev-only-change-me");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function getSessionUser(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return db.user.findUnique({
      where: { id: String(payload.sub) },
      include: { operator: true },
    });
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get("session")?.value);
}

export function publicUser(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    operatorId: user.operatorId,
    operatorName: user.operator?.name || null,
    operatorVerified: user.operator?.verified || false,
    expiresAt: null,
    createdAt: user.createdAt,
  };
}
