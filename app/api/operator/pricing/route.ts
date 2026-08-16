import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { errorResponse, nonNegativeNumber, readJson, requireOperator } from "@/lib/api";

function pricingData(body: any) {
  return {
    defaultHourlyRate: Math.round(nonNegativeNumber(body.defaultHourlyRate, "defaultHourlyRate")),
    defaultMinHours: nonNegativeNumber(body.defaultMinHours, "defaultMinHours", 2),
    domesticHandling: Math.round(nonNegativeNumber(body.domesticHandling, "domesticHandling")),
    internationalHandling: Math.round(nonNegativeNumber(body.internationalHandling, "internationalHandling")),
    crewDaily: Math.round(nonNegativeNumber(body.crewDaily, "crewDaily")),
    fuelSurchargePercent: nonNegativeNumber(body.fuelSurchargePercent, "fuelSurchargePercent"),
    operatorBuffer: Math.round(nonNegativeNumber(body.operatorBuffer, "operatorBuffer")),
    platformMarkupPercent: nonNegativeNumber(body.platformMarkupPercent, "platformMarkupPercent", 8),
    minQuote: Math.round(nonNegativeNumber(body.minQuote, "minQuote")),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    return NextResponse.json({ pricing: await db.operatorPricing.findUnique({ where: { operatorId: user.operatorId! } }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireOperator(req);
    const body = await readJson(req);
    const data = pricingData(body);
    const pricing = await db.operatorPricing.upsert({
      where: { operatorId: user.operatorId! },
      update: data,
      create: { operatorId: user.operatorId!, ...data },
    });
    return NextResponse.json({ pricing });
  } catch (error) {
    return errorResponse(error);
  }
}
