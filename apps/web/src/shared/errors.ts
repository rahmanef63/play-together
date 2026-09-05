export function errorMessage(
  reason: unknown,
  fallback = "The request could not be completed",
): string {
  return reason instanceof Error ? reason.message : fallback;
}
