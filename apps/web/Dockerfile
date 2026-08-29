FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_CONVEX_URL
ARG VITE_REALTIME_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_REALTIME_URL=$VITE_REALTIME_URL
RUN pnpm turbo run build --filter=@play-together/web

FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/dist ./dist
COPY --chown=node:node apps/web/server.mjs ./server.mjs
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
