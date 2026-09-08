import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
export async function sendMediaFile(request, response, path) {
  const { size } = await stat(path);
  response.setHeader("accept-ranges", "bytes");
  let start = 0,
    end = size - 1,
    status = 200;
  if (request.headers.range && request.method !== "HEAD") {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (!match || (!match[1] && !match[2])) return unsatisfied(response, size);
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return unsatisfied(response, size);
      start = Math.max(0, size - suffix);
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
    }
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start >= size ||
      start < 0 ||
      end < start
    )
      return unsatisfied(response, size);
    status = 206;
    response.setHeader("content-range", `bytes ${start}-${end}/${size}`);
  }
  response.setHeader("content-length", String(Math.max(0, end - start + 1)));
  response.writeHead(status);
  if (request.method === "HEAD" || !size) return response.end();
  const stream = createReadStream(path, { start, end });
  stream.on("error", () => response.destroy()).pipe(response);
  response.on("close", () => stream.destroy());
}
function unsatisfied(response, size) {
  response.writeHead(416, { "content-range": `bytes */${size}`, "content-length": "0" });
  response.end();
}
