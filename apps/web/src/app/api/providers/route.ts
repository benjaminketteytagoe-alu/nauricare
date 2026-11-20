import { apiSuccess, handle } from "@/lib/api";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isOnline } from "@/server/messaging/policy";

// The provider directory: verified, active practitioners only.
export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  return handle(async () => {
    const providers = await prisma.practitionerProfile.findMany({
      where: { isVerified: true, isActive: true },
      // Explicit fields only: the directory never needs contact emails or audit data.
      select: {
        id: true,
        specialty: true,
        clinicName: true,
        location: true,
        bio: true,
        yearsExperience: true,
        latitude: true,
        longitude: true,
        user: { select: { id: true, name: true, avatarUrl: true, lastSeenAt: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return apiSuccess(
      providers.map(({ user: { lastSeenAt, ...user }, ...p }) => ({ ...p, user, online: isOnline(lastSeenAt) })),
    );
  });
}
