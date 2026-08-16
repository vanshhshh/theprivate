import { NextRequest, NextResponse } from "next/server";
import { errorResponse, positiveInt, requiredString } from "@/lib/api";
import { quoteSearch } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const from = requiredString(q.get("from") || "Delhi", "from");
    const to = requiredString(q.get("to") || "Mumbai", "to");
    const passengers = positiveInt(q.get("pax") || 1, "passengers", 30);
    const rawDate = q.get("date");
    const emptyLegOnly = q.get("emptyLeg") === "1";
    const date = rawDate ? new Date(rawDate) : undefined;
    if (date && !Number.isFinite(date.getTime())) {
      return NextResponse.json({ error: "date is invalid" }, { status: 400 });
    }

    return NextResponse.json({
      results: await quoteSearch(from, to, passengers, date, { emptyLegOnly }),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
