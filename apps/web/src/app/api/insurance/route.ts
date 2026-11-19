import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { INSURANCE_VALUES, insuranceLabel, matchListedInsurer } from "@/lib/referrals/constants";
import { sanitizePlainText } from "@/lib/sanitize";
import { recordActivity } from "@/server/activity/activity.service";
import { knownPrivateInsurers } from "@/server/insurance/insurers";

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
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const [insurance, knownInsurers] = await Promise.all([
      prisma.patientInsurance.findUnique({ where: { userId: auth.user.id } }),
      knownPrivateInsurers(),
    ]);
    return apiSuccess({ insurance, knownInsurers });
  });
}

export async function PUT(req: Request) {
  const auth = await requireApiUser("PATIENT");
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const limited = enforceRateLimit(`insurance:${userId}`);
  if (limited) return limited;
  const parsed = await parseJson(req, InsuranceInput);
  if (!parsed.ok) return parsed.response;
  const { policyNumber, principalMember, expiryDate } = parsed.data;
  let { provider } = parsed.data;
  let otherProviderName: string | null = null;
  if (provider === "OTHER_PRIVATE") {
    const name = sanitizePlainText(parsed.data.otherProviderName).replace(/\s+/g, " ").trim();
    if (name.length < 2) return apiError("Enter the name of your insurer.", 400);
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

  return handle(async () => {
    const insurance = await prisma.patientInsurance.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    await recordActivity({
      userId,
      type: "INSURANCE_UPDATED",
      title: `Updated insurance details (${insuranceLabel(provider, otherProviderName)})`,
      details: { provider },
    });
    return apiSuccess({ insurance });
  });
}
