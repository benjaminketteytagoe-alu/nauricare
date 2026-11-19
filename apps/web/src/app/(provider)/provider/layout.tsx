import { requireRole } from "@/lib/auth-guards";
import ProviderLayoutClient from "./ProviderLayoutClient";

export const dynamic = "force-dynamic";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  await requireRole("PROVIDER");
  return <ProviderLayoutClient>{children}</ProviderLayoutClient>;
}
