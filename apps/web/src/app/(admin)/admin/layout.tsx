import { requireRole } from "@/lib/auth-guards";
import AdminLayoutClient from "./AdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
