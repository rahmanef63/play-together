import packageJson from "../package.json" with { type: "json" };

export default function health(_request, response) {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(
    JSON.stringify({
      ok: true,
      service: "play-together",
      version: packageJson.version,
      runtime: "vercel-managed",
    }),
  );
}
