import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import ProviderLayoutClient from "./ProviderLayoutClient";

export const dynamic = "force-dynamic";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  await cookies(); // forces dynamic rendering — prevents cross-user cache leak
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROVIDER") {
    if (session.user.role === "ADMIN") redirect("/admin");
    redirect("/dashboard");
  }

  return <ProviderLayoutClient>{children}</ProviderLayoutClient>;
}
