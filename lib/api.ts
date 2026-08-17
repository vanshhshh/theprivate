import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;

function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return false;
  return true;
}

export function validateCsrf(req: NextRequest) {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";
  const appUrl = process.env.APP_URL || "";
  if (!origin && !appUrl) return true;
  const expectedOrigin = appUrl ? new URL(appUrl).origin : `https://${host}`;
  if (origin && origin !== expectedOrigin) {
    throw new ApiError(403, "Invalid origin");
  }
}

export async function requireUser(req: NextRequest) {
  validateCsrf(req);
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const key = forwarded.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`auth:${key}`)) {
    throw new ApiError(429, "Too many requests");
  }
  const token = req.cookies.get("session")?.value;
  const user = await getSessionUser(token);
  if (!user) throw new ApiError(401, "UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw new ApiError(403, "Forbidden");
  return user;
}

export async function requireOperator(req: NextRequest) {
  const user = await requireUser(req);
  if (!user.operatorId) throw new ApiError(403, "Operator account required");
  return user;
}

export async function readJson(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(400, "Content-Type must be application/json");
  }
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

export function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${name} is required`);
  }
  return value.trim();
}

export function positiveInt(value: unknown, name: string, max = 99) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > max) {
    throw new ApiError(400, `${name} must be between 1 and ${max}`);
  }
  return num;
}

export function nonNegativeNumber(value: unknown, name: string, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new ApiError(400, `${name} must be a non-negative number`);
  }
  return num;
}

export function validDate(value: unknown, name: string) {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new ApiError(400, `${name} is invalid`);
  return date;
}

export function pageParams(req: NextRequest, maxTake = 50) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  const take = Math.min(maxTake, Math.max(1, Number(req.nextUrl.searchParams.get("take") || 20)));
  return { skip: (page - 1) * take, take, page };
}

export function errorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Server error";
  return NextResponse.json({ error: message }, { status });
}
