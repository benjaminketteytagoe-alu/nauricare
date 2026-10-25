import { notFound, unauthorized } from "@/lib/api";
import { getUserIdWithRole } from "@/lib/auth-guards";
import { idSchema } from "@/lib/validation/common";
import { candidatePhoto } from "@/server/sourcing/sourcing.service";

// Admin-only proxy: the browser never contacts the third-party site, and the
// response is a re-validated image (magic-byte checked) served same-origin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUserIdWithRole("ADMIN"))) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound("No photo");
  const image = await candidatePhoto(id.data);
  if (!image) return notFound("No photo");
  return new Response(new Uint8Array(image.body), {
    headers: { "Content-Type": image.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
