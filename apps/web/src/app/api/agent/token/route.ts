import { createTokenHandler } from "@/lib/agent";
import { nauriAgent } from "@/agents/nauri-agent";

// Tokens are generated fresh per-request — CDN caching must never apply.
export const dynamic = "force-dynamic";

export const GET = createTokenHandler(nauriAgent);
