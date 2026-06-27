"use client";

const PALETTE = [
  "bg-teal-500",    "bg-violet-500", "bg-rose-500",
  "bg-amber-500",   "bg-sky-500",    "bg-pink-500",
  "bg-emerald-500", "bg-indigo-500",
];

function avatarColor(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const SIZES = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-16 h-16 text-lg",
};

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
  const sz = SIZES[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sz} ${avatarColor(name)} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}>
      {initials(name)}
    </div>
  );
}

export default Avatar;
