import type { ApiError, ApiSuccess } from "@/types";

// The estate's standard response envelope, for this app's /api routes.

export const ok = <T>(data: T, status = 200): Response =>
  Response.json(
    { success: true, status, message: "OK", data } satisfies ApiSuccess<T>,
    { status },
  );

export const fail = (
  status: number,
  error: string,
  errorMessage = error,
): Response =>
  Response.json(
    {
      success: false,
      status,
      error,
      error_message: errorMessage,
      error_code: status,
    } satisfies ApiError,
    { status },
  );

/** A tag or ID from a scanner: trimmed, bounded, no path characters. */
export const cleanTag = (raw: string): string | null => {
  const tag = raw.trim();
  if (tag === "" || tag.length > 64 || /[/?#\\]/.test(tag)) return null;
  return tag;
};
