import { z } from "zod";
import { apiSuccess, handle, parseJson, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { sanitizePlainText } from "@/lib/sanitize";
import { createSource, listSources } from "@/server/sourcing/sourcing.service";

const SourceInput = z.object({
  name: z.string().trim().min(2, "Give the source a name.").max(120),
  url: z.string().trim().max(2048),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  if (!(await getUserIdWithRole("ADMIN"))) return unauthorized();
  return handle(async () => apiSuccess({ sources: await listSources() }));
}

export async function POST(req: Request) {
  const adminId = await getUserIdWithRole("ADMIN");
  if (!adminId) return unauthorized();
  const parsed = await parseJson(req, SourceInput);
  if (!parsed.ok) return parsed.response;
  return handle(async () => {
    const source = await createSource(adminId, {
      name: sanitizePlainText(parsed.data.name),
      url: parsed.data.url,
      notes: parsed.data.notes ? sanitizePlainText(parsed.data.notes) : undefined,
    });
    return apiSuccess({ source }, 201);
  });
}
