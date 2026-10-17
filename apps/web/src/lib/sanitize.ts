import sanitizeHtml from "sanitize-html";

// User-generated text is stored and rendered as plain text (React escapes it
// on output). Stripping every tag on the way in is defence in depth: no
// markup can reach the database, emails, CSV exports or a future renderer
// that is less careful than React.

const STRIP_ALL: sanitizeHtml.IOptions = { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: "discard" };

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export function sanitizePlainText(input: string): string {
  // sanitize-html entity-encodes &, < and >. We store readable characters
  // (React re-escapes them), so decode and strip again until stable: this
  // stops entity-smuggled markup such as "&lt;script&gt;" surviving a pass.
  let current = input;
  for (let i = 0; i < 5; i++) {
    const next = decode(sanitizeHtml(current, STRIP_ALL));
    if (next === current) break;
    current = next;
  }
  return current.trim();
}
