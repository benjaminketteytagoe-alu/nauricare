"use client"

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProviderProfile } from "../../actions";

export function DeleteProviderButton({
  providerId,
  providerName,
}: {
  providerId: string;
  providerName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete ${providerName}? This action cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProviderProfile(providerId);

      if (result.success) {
        alert("Provider successfully deleted");
        router.refresh();
      } else {
        alert(`Failed to delete provider: ${result.error}`);
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:bg-slate-400"
    >
      {isPending ? "Deleting..." : "Delete Provider"}
    </button>
  );
}
