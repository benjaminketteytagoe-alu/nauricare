// Liveness probe for load balancers, ECS and `docker run` health checks.
// Deliberately does not touch the database: a transient DB outage should not
// make the orchestrator kill and replace otherwise healthy app containers.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", version: process.env.APP_VERSION ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
