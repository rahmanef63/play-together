export function errorMessage(
  reason: unknown,
  fallback = "The request could not be completed",
): string {
  return reason instanceof Error ? reason.message : fallback;
}

export function authErrorMessage(reason: unknown): string {
  return errorMessage(reason, "Could not complete authentication").replace(
    /^\[CONVEX[^\]]*\]\s*/i,
    "",
  );
}
