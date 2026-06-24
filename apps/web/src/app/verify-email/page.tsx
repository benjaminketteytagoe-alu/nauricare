import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/login?verified=error");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verificationToken) {
    redirect("/login?verified=error");
  }

  if (verificationToken.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    redirect("/login?verified=expired");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { isEmailVerified: true },
    }),
    prisma.emailVerificationToken.delete({ where: { tokenHash } }),
  ]);

  redirect("/login?verified=true");
}
