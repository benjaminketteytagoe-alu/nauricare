"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Callout } from "@/components/ui/callout";
import { AVATAR_PRESETS, presetIdOf, presetSrc, type AvatarPresetId } from "@/lib/avatars";
import { chooseAvatar } from "@/app/(patient)/dashboard/settings/actions";

/** Pick a predefined avatar (or your synced Google photo). No uploads. */
export function AvatarPicker({
  name,
  avatarUrl,
  googlePhotoUrl,
  onChange,
  heading = "Your avatar",
  description = "Choose how you appear across NauriCare.",
}: {
  name: string;
  avatarUrl: string | null;
  googlePhotoUrl?: string | null;
  onChange?: (url: string) => void;
  heading?: string;
  description?: string;
}) {
  const { update } = useSession();
  const [current, setCurrent] = useState(avatarUrl);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const selectedPreset = presetIdOf(current);

  function pick(choice: { preset: AvatarPresetId } | { google: true }) {
    const id = "preset" in choice ? choice.preset : "google";
    setError("");
    setBusyId(id);
    startTransition(async () => {
      const res = await chooseAvatar(choice);
      setBusyId(null);
      if (!res.success) return setError(res.error);
      setCurrent(res.avatarUrl);
      onChange?.(res.avatarUrl);
      await update(); // refresh the session so the new avatar shows everywhere
    });
  }

  const tile = (selected: boolean) =>
    `relative rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nc-primary ${selected ? "ring-4 ring-nc-primary" : "hover:ring-2 hover:ring-slate-300"}`;

  return (
    <section aria-labelledby="avatar-heading">
      <div className="flex items-center gap-4">
        <Avatar name={name} avatarUrl={current} size="xl" />
        <div>
          <h3 id="avatar-heading" className="font-semibold text-nc-ink">{heading}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {error && <Callout tone="danger" role="alert" className="mt-3">{error}</Callout>}
      <div role="radiogroup" aria-label="Avatars" className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {googlePhotoUrl && (
          <button type="button" role="radio" aria-checked={current === googlePhotoUrl} aria-label="Use my Google photo" title="My Google photo" disabled={pending} onClick={() => pick({ google: true })} className={tile(current === googlePhotoUrl)}>
            <Avatar name={name} avatarUrl={googlePhotoUrl} size="xl" className="!h-full !w-full" />
            {busyId === "google" && <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white" aria-hidden />}
          </button>
        )}
        {AVATAR_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={selectedPreset === p.id} aria-label={p.label} title={p.label} disabled={pending} onClick={() => pick({ preset: p.id })} className={tile(selectedPreset === p.id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={presetSrc(p.id)} alt="" className="aspect-square w-full rounded-full" />
            {selectedPreset === p.id && <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-nc-primary text-white shadow"><Check className="h-4 w-4" aria-hidden /></span>}
            {busyId === p.id && <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-white drop-shadow" aria-hidden />}
          </button>
        ))}
      </div>
    </section>
  );
}
