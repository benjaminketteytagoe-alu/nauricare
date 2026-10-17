import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { INSURANCE_VALUES } from "@/lib/referrals/constants";
import { requirePatientId } from "@/lib/referrals/server";

const InsuranceInput = z
  .object({
    provider: z.enum(INSURANCE_VALUES),
    policyNumber: z.string().trim().max(64).optional().default(""),
    principalMember: z.string().trim().max(120).optional().default(""),
    expiryDate: z.string().optional().default(""),
  })
  .refine((v) => v.provider === "NONE_CASH" || v.policyNumber.length > 0, {
    message: "Enter your policy or membership number.",
    path: ["policyNumber"],
  })
  .refine((v) => !v.expiryDate || !Number.isNaN(Date.parse(v.expiryDate)), {
    message: "Enter a valid expiry date.",
    path: ["expiryDate"],
  });

export async function GET() {
  const userId = await requirePatientId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const insurance = await prisma.patientInsurance.findUnique({ where: { userId } });
  return NextResponse.json({ insurance });
}

export async function PUT(req: Request) {
  const userId = await requirePatientId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = InsuranceInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { provider, policyNumber, principalMember, expiryDate } = parsed.data;
  const cash = provider === "NONE_CASH";
  const data = {
    provider,
    policyNumber: cash ? null : policyNumber || null,
    principalMember: cash ? null : principalMember || null,
    expiryDate: cash || !expiryDate ? null : new Date(expiryDate),
  };

  try {
    const insurance = await prisma.patientInsurance.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return NextResponse.json({ insurance });
  } catch (error) {
    console.error("[INSURANCE_SAVE_ERROR]", error);
    return NextResponse.json({ error: "Could not save your insurance details." }, { status: 500 });
  }
}
