import { requireRole } from "@/lib/auth-guards";
import { isApprovedProvider } from "@/server/providers/approval";
import ProviderLayoutClient from "./ProviderLayoutClient";
import { ProviderPending } from "./ProviderPending";

export const dynamic = "force-dynamic";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("PROVIDER");
  // Until an admin approves the account there is no portal (and the clinical
  // APIs refuse the session too, see requireApiUser).
  if (!(await isApprovedProvider(session.user.id))) return <ProviderPending />;
  return <ProviderLayoutClient>{children}</ProviderLayoutClient>;
}
