import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { INSURANCE_VALUES, insuranceLabel, matchListedInsurer } from "@/lib/referrals/constants";
import { sanitizePlainText } from "@/lib/sanitize";
import { knownPrivateInsurers } from "@/server/insurance/insurers";
import { recordActivity } from "@/server/activity/activity.service";
import { getUserIdWithRole } from "@/lib/auth-guards";

const InsuranceInput = z
  .object({
    provider: z.enum(INSURANCE_VALUES),
    otherProviderName: z.string().trim().max(80, "Insurer name must be under 80 characters.").optional().default(""),
    policyNumber: z.string().trim().max(64).optional().default(""),
    principalMember: z.string().trim().max(120).optional().default(""),
    expiryDate: z.string().optional().default(""),
  })
  .refine((v) => v.provider !== "OTHER_PRIVATE" || v.otherProviderName.length >= 2, {
    message: "Enter the name of your insurer.",
    path: ["otherProviderName"],
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
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [insurance, knownInsurers] = await Promise.all([
    prisma.patientInsurance.findUnique({ where: { userId } }),
    knownPrivateInsurers(),
  ]);
  return NextResponse.json({ insurance, knownInsurers });
}

export async function PUT(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = InsuranceInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { policyNumber, principalMember, expiryDate } = parsed.data;
  let { provider } = parsed.data;
  let otherProviderName: string | null = null;
  if (provider === "OTHER_PRIVATE") {
    const name = sanitizePlainText(parsed.data.otherProviderName).replace(/\s+/g, " ").trim();
    if (name.length < 2) return NextResponse.json({ error: "Enter the name of your insurer." }, { status: 400 });
    // "Britam" typed under Other is really the listed Britam option.
    const listed = matchListedInsurer(name);
    if (listed) provider = listed;
    else otherProviderName = name;
  }
  const cash = provider === "NONE_CASH";
  const data = {
    provider,
    otherProviderName,
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
    await recordActivity({ userId, type: "INSURANCE_UPDATED", title: `Updated insurance details (${insuranceLabel(provider, otherProviderName)})`, details: { provider } });
    return NextResponse.json({ insurance });
  } catch (error) {
    console.error("[INSURANCE_SAVE_ERROR]", error);
    return NextResponse.json({ error: "Could not save your insurance details." }, { status: 500 });
  }
}
