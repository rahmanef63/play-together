export function requiresConvexNetworkRefresh(before, after) {
  return Boolean(
    before.gameCdn &&
      before.convexBackend &&
      before.gameCdn !== after.gameCdn &&
      before.convexBackend === after.convexBackend,
  );
}
