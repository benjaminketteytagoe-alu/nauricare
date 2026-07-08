import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function UserHandlePage({ params }: Props) {
  const { handle } = await params;

  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      handle: true,
      patientProfile: { select: { country: true } },
      practitionerProfile: { select: { specialty: true } },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) notFound();

  const subtitle = user.practitionerProfile?.specialty
    ?? user.patientProfile?.country
    ?? null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <Avatar name={user.name ?? "?"} avatarUrl={user.avatarUrl} size="lg" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">{user.name}</h1>
        {user.handle && (
          <p className="text-sm text-teal-600 font-medium">@{user.handle}</p>
        )}
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {user.role === "PROVIDER" && (
          <span className="inline-block mt-2 text-[11px] font-extrabold tracking-wide px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
            Specialist
          </span>
        )}
        <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-gray-50">
          <div>
            <p className="text-lg font-bold text-gray-900">{user._count.followers}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user._count.following}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Following</p>
          </div>
        </div>
      </div>
    </div>
  );
}
