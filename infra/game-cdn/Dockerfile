FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm game:publish

FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
ENV GAME_CDN_ROOT=/srv/games
WORKDIR /app
COPY --from=build --chown=node:node /workspace/releases/game-cdn /srv/games
COPY --chown=node:node scripts/serve-game-cdn.mjs ./serve-game-cdn.mjs
USER node
EXPOSE 8080
CMD ["node", "serve-game-cdn.mjs"]
