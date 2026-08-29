import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/healthz",
  method: "GET",
  handler: httpAction(
    async () =>
      new Response(JSON.stringify({ ok: true, service: "play-together-convex" }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      }),
  ),
});
export default http;
