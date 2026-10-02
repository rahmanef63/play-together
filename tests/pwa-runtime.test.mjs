import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const source = await readFile("apps/web/public/sw.template.js", "utf8");

function worker({ fetch, caches }) {
  const listeners = {};
  runInNewContext(source, {
    URL,
    Response,
    fetch,
    caches,
    self: {
      location: { origin: "https://game.test" },
      addEventListener: (type, listener) => {
        listeners[type] = listener;
      },
    },
  });
  return (path, mode = "cors", destination = "") => {
    let result;
    listeners.fetch({
      request: { url: `https://game.test${path}`, method: "GET", mode, destination },
      respondWith: (response) => {
        result = response;
      },
    });
    return result;
  };
}

it.each([
  ["/room/ABC123", "navigate", ""],
  ["/version.json", "cors", ""],
  ["/assets/app.js", "cors", "script"],
])(
  "serves a successful network response when cache storage fails: %s",
  async (path, mode, destination) => {
    const response = new Response("current app");
    Object.defineProperty(response, "type", { value: "basic" });
    const fetch = vi.fn().mockResolvedValue(response);
    const unavailable = vi.fn().mockRejectedValue(new Error("Storage unavailable"));
    const request = worker({ fetch, caches: { match: unavailable, open: unavailable } });
    expect(await request(path, mode, destination)).toBe(response);
    expect(fetch).toHaveBeenCalledOnce();
  },
);

it.each([
  ["/", "navigate", ""],
  ["/assets/app.js", "cors", "script"],
])(
  "keeps a network response usable when a cache write exceeds quota: %s",
  async (path, mode, destination) => {
    const response = new Response("current app");
    Object.defineProperty(response, "type", { value: "basic" });
    const request = worker({
      fetch: vi.fn().mockResolvedValue(response),
      caches: {
        match: vi.fn().mockResolvedValue(mode === "navigate" ? new Response("old app") : undefined),
        open: vi.fn().mockResolvedValue({ put: vi.fn().mockRejectedValue(new Error("Quota")) }),
      },
    });
    expect(await request(path, mode, destination)).toBe(response);
  },
);

it("keeps cached assets and offline navigation available without network", async () => {
  const cached = new Response("offline app");
  const fetch = vi.fn().mockRejectedValue(new Error("Offline"));
  const request = worker({ fetch, caches: { match: vi.fn().mockResolvedValue(cached) } });
  expect(await request("/assets/app.js", "cors", "script")).toBe(cached);
  expect(fetch).not.toHaveBeenCalled();
  expect(await request("/", "navigate")).toBe(cached);
});
