import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: NextRequest) {
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
