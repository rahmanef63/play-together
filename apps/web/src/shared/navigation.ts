export function navigate(path: string): void {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function currentPath(): string {
  return window.location.pathname;
}
