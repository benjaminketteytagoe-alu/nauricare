import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INSURANCE_VALUES, KIGALI_DISTRICTS } from "@/lib/referrals/constants";
import { getUserIdWithRole } from "@/lib/auth-guards";

// GET /api/hospitals?insurance=RSSB_RAMA&district=Gasabo
// Both filters are optional and ignored when they are not recognised values.
export async function GET(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const insurance = url.searchParams.get("insurance");
  const district = url.searchParams.get("district");

  const where: Prisma.HospitalWhereInput = {};
  // Cash patients can attend any hospital, so only filter for insured patients.
  if (insurance && insurance !== "NONE_CASH" && (INSURANCE_VALUES as string[]).includes(insurance)) {
    where.supportedInsurances = { has: insurance as (typeof INSURANCE_VALUES)[number] };
  }
  if (district && (KIGALI_DISTRICTS as readonly string[]).includes(district)) {
    where.district = district;
  }

  const hospitals = await prisma.hospital.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, district: true, phone: true, supportedInsurances: true },
  });
  return NextResponse.json({ hospitals });
}
