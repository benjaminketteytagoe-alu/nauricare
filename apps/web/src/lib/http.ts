/**
 * Client-side helper: the user-facing message from a failed API response.
 * Route handlers answer `{ error, code? }` (see lib/api.ts); plain-text bodies
 * from older or third-party endpoints are still shown as-is.
 */
export async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const raw = await res.text().catch(() => "");
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof (parsed as { error?: unknown }).error === "string") {
      return (parsed as { error: string }).error;
    }
    return fallback;
  } catch {
    return raw.length <= 300 ? raw : fallback;
  }
}
