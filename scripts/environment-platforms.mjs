export const environmentProfiles = [
  {
    id: "convex-google-production",
    file: ".env.convex.google.example",
    label: "Convex Google OAuth production",
    destination: "Convex Dashboard → Production Deployment → Settings → Environment Variables",
    names: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  },
  {
    id: "convex-production",
    file: ".env.convex.production.example",
    label: "Convex production deployment",
    destination: "Convex Dashboard → Production Deployment → Settings → Environment Variables",
    names: [
      "SITE_URL",
      "JWT_PRIVATE_KEY",
      "JWKS",
      "AUTH_GOOGLE_ID",
      "AUTH_GOOGLE_SECRET",
      "JOIN_TICKET_SECRET",
      "GAME_PUBLISH_TOKEN",
      "GAME_MODULE_ORIGINS",
      "GAME_MODULE_FETCH_ORIGIN_MAP",
      "ALLOW_INSECURE_GAME_ORIGINS",
      "TEMPLATE_DOWNLOAD_SECRET",
      "TEMPLATE_PUBLISH_TOKEN",
      "TEMPLATE_SALES_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "EMAIL_FROM_ADDRESS",
      "EMAIL_PROJECT_NAME",
      "EMAIL_PROJECT_TAG",
      "EMAIL_REPLY_TO",
      "EMAIL_SITE_URL",
    ],
  },
  {
    id: "vps-production",
    file: ".env.vps.production.example",
    label: "VPS production runtime",
    destination: "Private owner-only env file on the Play Together VPS checkout",
    values: {
      VPS_HOST: "game.rahmanef.com",
      VITE_CONVEX_URL: "https://upbeat-dog-398.convex.cloud",
      TICKET_VERIFIER_CONVEX_URL: "https://upbeat-dog-398.convex.cloud",
      TICKET_VERIFIER_TIMEOUT_MS: "5000",
      VITE_REALTIME_URL: "",
      GAME_CDN_PUBLIC_ORIGIN: "https://game.rahmanef.com",
      ALLOWED_ORIGINS: "https://game.rahmanef.com",
      GAME_MODULE_ORIGINS: "https://games-game.rahmanef.com,https://game.rahmanef.com",
      GAME_MODULE_FETCH_ORIGIN_MAP: '{"https://game.rahmanef.com":"http://web:8080"}',
      ALLOW_INSECURE_GAME_ORIGINS: "false",
      REQUIRE_DISTRIBUTED_COORDINATION: "true",
      RELEASE_CONTROL_REQUIRED: "true",
      ALLOW_MISSING_ORIGIN: "false",
      ROOM_IDLE_TIMEOUT_MS: "30000",
      MAX_PAYLOAD_BYTES: "65536",
      MODULE_CACHE_DIR: "/tmp/play-together/game-modules",
    },
    names: [
      "VPS_HOST",
      "VITE_CONVEX_URL",
      "TICKET_VERIFIER_CONVEX_URL",
      "TICKET_VERIFIER_TIMEOUT_MS",
      "VITE_REALTIME_URL",
      "GAME_CDN_PUBLIC_ORIGIN",
      "ALLOWED_ORIGINS",
      "GAME_MODULE_ORIGINS",
      "GAME_MODULE_FETCH_ORIGIN_MAP",
      "ALLOW_INSECURE_GAME_ORIGINS",
      "BLOB_READ_WRITE_TOKEN",
      "REDIS_URL",
      "CONTENT_SECURITY_POLICY",
      "REQUIRE_DISTRIBUTED_COORDINATION",
      "RELEASE_CONTROL_REQUIRED",
      "ALLOW_MISSING_ORIGIN",
      "ROOM_IDLE_TIMEOUT_MS",
      "MAX_PAYLOAD_BYTES",
      "MODULE_CACHE_DIR",
    ],
  },
];

export function profileForId(id) {
  const profile = environmentProfiles.find((item) => item.id === id);
  if (!profile) throw new Error(`Unknown environment profile: ${id}`);
  return profile;
}

export function profileLabelsForName(name) {
  return environmentProfiles
    .filter((profile) => profile.names.includes(name))
    .map((item) => item.label);
}
