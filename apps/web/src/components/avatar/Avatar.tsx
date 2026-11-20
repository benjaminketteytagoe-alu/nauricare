"use client";

import { createAvatar } from "@dicebear/core";
import * as loreleiNeutral from "@dicebear/lorelei-neutral";
import { useMemo } from "react";

// Without a chosen picture we draw a DiceBear "Lorelei Neutral" face (design
// CC0, code MIT, see THIRD_PARTY_NOTICES.txt). It is generated here in the
// browser from the name, so no name ever leaves the device and the same
// person always gets the same face. Backgrounds are the tokens' light "-line"
// tints and the features use ink, so it sits in the palette in both themes.
const BACKGROUNDS = ["eec5cf", "ddd3ee", "c7d7fe", "c4dfcf", "f3d3b5"];
const INK = ["2a1631"];
// Only calm, friendly expressions: no frowns, sneers, winks or tongues on a
// health app (checked against a render of every variant).
const v = (prefix: string, ns: number[]) => ns.map((n) => `${prefix}${String(n).padStart(2, "0")}`);
const MOUTH = v("happy", [1, 2, 3, 4, 5, 6, 8, 10, 13, 14]);
const EYEBROWS = v("variant", [1, 2, 5, 6, 7, 9]);
const EYES = v("variant", [2, 4, 6, 7, 8, 9, 12, 13, 14, 16, 17, 18, 19, 20, 24]);

const SIZES = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-16 h-16",
};

export function generatedAvatar(seed: string): string {
  return createAvatar(loreleiNeutral, {
    seed: seed.trim().toLowerCase() || "nauricare",
    backgroundColor: BACKGROUNDS,
    mouth: MOUTH as loreleiNeutral.Options["mouth"],
    eyebrows: EYEBROWS as loreleiNeutral.Options["eyebrows"],
    eyes: EYES as loreleiNeutral.Options["eyes"],
    eyebrowsColor: INK,
    eyesColor: INK,
    mouthColor: INK,
    noseColor: INK,
    glassesColor: INK,
    frecklesColor: ["b23a5b"],
  }).toDataUri();
}

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const fallback = useMemo(() => (avatarUrl ? null : generatedAvatar(name)), [avatarUrl, name]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl || fallback!}
      alt={name}
      className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-1 ring-hairline ${className}`}
    />
  );
}
