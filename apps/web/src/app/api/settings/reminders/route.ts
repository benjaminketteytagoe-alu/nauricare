import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rateLimit";
import { recordActivity } from "@/server/activity/activity.service";
import { getReminderPrefs, ReminderPrefsPatch, updateReminderPrefs } from "@/server/reminders/preferences";

// The signed-in patient's reminder settings (Settings > Reminders).

export async function GET() {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  return handle(async () => apiSuccess(await getReminderPrefs(userId), 200, { "Cache-Control": "private, no-store" }));
}

export async function PATCH(req: Request) {
  const userId = await getUserIdWithRole("PATIENT");
  if (!userId) return unauthorized();
  const limited = enforceRateLimit(`reminder-settings:${userId}`);
  if (limited) return limited;
  const body = await parseJson(req, ReminderPrefsPatch);
  if (!body.ok) return body.response;
  return handle(async () => {
    const prefs = await updateReminderPrefs(userId, body.data);
    await recordActivity({ userId, type: "PROFILE_UPDATED", title: "Updated reminder settings", details: body.data });
    return apiSuccess(prefs);
  });
}
