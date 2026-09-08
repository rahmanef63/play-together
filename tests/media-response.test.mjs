import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createWebServer } from "../apps/web/server.mjs";

it("serves video MIME, bounded ranges and rejects malformed ranges", async () => {
  const root = await mkdtemp(join(tmpdir(), "pt-media-"));
  await writeFile(join(root, "preview.mp4"), "0123456789");
  const server = createWebServer({ root });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/preview.mp4`;
  try {
    const head = await fetch(url, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("video/mp4");
    expect(head.headers.get("content-length")).toBe("10");
    const range = await fetch(url, { headers: { range: "bytes=2-5" } });
    expect(range.status).toBe(206);
    expect(range.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(await range.text()).toBe("2345");
    const suffix = await fetch(url, { headers: { range: "bytes=-3" } });
    expect(await suffix.text()).toBe("789");
    for (const range of ["bytes=20-", "bytes=7-2", "bytes=0-1,4-5", "bytes=-0"])
      expect((await fetch(url, { headers: { range } })).status).toBe(416);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
