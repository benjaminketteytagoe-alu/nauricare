"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { updateAvatar } from "@/app/(patient)/dashboard/settings/actions";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB, matches the image cap on /api/upload/presigned-url

export function AvatarUploader({
  name,
  avatarUrl,
  onUploaded,
}: {
  name: string;
  avatarUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const { update } = useSession();

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image exceeds the 5MB limit.");
      return;
    }

    setIsUploading(true);
    try {
      const presignRes = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          context: "avatar",
        }),
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to prepare upload.");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      const result = await updateAvatar(publicUrl);
      if (!result.success) throw new Error(result.error || "Failed to save profile picture.");

      await update(); // refresh the JWT session so avatarUrl is current everywhere immediately
      onUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} avatarUrl={avatarUrl} size="xl" />
      <div>
        <input
          id="avatar-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          className="hidden"
          disabled={isUploading}
        />
        <label
          htmlFor="avatar-file-input"
          className="inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-800 cursor-pointer px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-50 transition-colors"
        >
          {isUploading ? "Uploading…" : "Change profile picture"}
        </label>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, or GIF — up to 5MB.</p>
        {error && <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>}
      </div>
    </div>
  );
}

export default AvatarUploader;
