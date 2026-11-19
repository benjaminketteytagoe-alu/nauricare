import { apiSuccess, handle, notFound, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { idSchema } from "@/lib/validation/common";
import { getRun } from "@/server/sourcing/sourcing.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUserIdWithRole("ADMIN"))) return unauthorized();
  return handle(async () => {
    const id = idSchema.parse((await params).id);
    const run = await getRun(id);
    return run ? apiSuccess({ run }) : notFound("Run not found");
  });
}
