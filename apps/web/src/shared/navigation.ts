const EMBED_PREFIX = "/embed";

export function appPathFromBrowserPath(pathname: string): string {
  if (pathname === EMBED_PREFIX || pathname === `${EMBED_PREFIX}/`) return "/";
  if (pathname.startsWith(`${EMBED_PREFIX}/`)) return pathname.slice(EMBED_PREFIX.length) || "/";
  return pathname;
}

export function browserPathForNavigation(path: string, currentPathname: string): string {
  if (currentPathname === EMBED_PREFIX || currentPathname.startsWith(`${EMBED_PREFIX}/`)) {
    return path === "/" ? EMBED_PREFIX : `${EMBED_PREFIX}${path}`;
  }
  return path;
}

export function navigate(path: string): void {
  history.pushState({}, "", browserPathForNavigation(path, window.location.pathname));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function currentPath(): string {
  return appPathFromBrowserPath(window.location.pathname);
}
