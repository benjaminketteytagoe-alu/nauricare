import { apiSuccess, handle, unauthorized } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rateLimit";
import { backfillCoordinates } from "@/server/geo/geocode";

// Geocodes providers/hospitals missing coordinates (for the patient map).
// Rate-limited by Nominatim's 1 req/s policy, so it processes a batch per call.
export async function POST() {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const limited = enforceRateLimit(`admin-geo-backfill:${adminId}`, 5, 60 * 60_000);
  if (limited) return limited;
  return handle(async () => {
    const result = await backfillCoordinates();
    await logAdministrativeAction({
      action: "ADMIN_SETTINGS_UPDATE",
      actorId: adminId,
      details: { op: "geo-backfill", ...result },
    });
    return apiSuccess(result);
  });
}
