FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
WORKDIR /app
COPY --chown=node:node infra/convex-site-loopback/server.mjs ./server.mjs
USER node
ENV NODE_ENV=production HOST=:: PORT=43211 UPSTREAM_ORIGIN=http://127.0.0.1:3211
CMD ["node", "server.mjs"]
