FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
ARG VITE_CONVEX_URL
ARG VITE_REALTIME_URL
ARG APP_REVISION
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
ENV VITE_REALTIME_URL=$VITE_REALTIME_URL
ENV APP_REVISION=$APP_REVISION
# This is platform-neutral: it produces the same web, realtime, release and env output for VPS or rollback builds.
RUN pnpm production:web:build
RUN pnpm --filter @play-together/web deploy --prod --legacy /runtime

FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/dist ./dist
COPY --from=build --chown=node:node /workspace/package.json ./package.json
COPY --from=build --chown=node:node /runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/web/server.mjs /workspace/apps/web/embed-policy.mjs /workspace/apps/web/runtime-api.mjs /workspace/apps/web/template-download.mjs /workspace/apps/web/media-response.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
