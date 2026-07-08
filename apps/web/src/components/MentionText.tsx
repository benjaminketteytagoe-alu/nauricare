"use client";

import Link from "next/link";

// Splits text on @handle tokens and renders each as a Link.
// The same regex used server-side in lib/mentions.ts — \w{1,30} only,
// so there is no catastrophic backtracking risk and no XSS surface.
const MENTION_RE = /(\@\w{1,30})/g;

export function MentionText({ text }: { text: string }) {
  const parts = text.split(MENTION_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (/^\@\w{1,30}$/.test(part)) {
          const handle = part.slice(1);
          return (
            <Link
              key={i}
              href={`/user/${handle}`}
              className="text-teal-600 font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
