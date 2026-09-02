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
    id: "vercel-production",
    file: ".env.vercel.production.example",
    label: "Vercel production project",
    destination: "Vercel → play-together → Settings → Environment Variables → Production",
    names: [
      "VITE_CONVEX_URL",
      "VITE_REALTIME_URL",
      "GAME_CDN_PUBLIC_ORIGIN",
      "ALLOWED_ORIGINS",
      "GAME_MODULE_ORIGINS",
      "GAME_MODULE_FETCH_ORIGIN_MAP",
      "ALLOW_INSECURE_GAME_ORIGINS",
      "JOIN_TICKET_SECRET",
      "TEMPLATE_DOWNLOAD_SECRET",
      "CONTENT_SECURITY_POLICY",
      "REDIS_URL",
      "BLOB_READ_WRITE_TOKEN",
      "REQUIRE_DISTRIBUTED_COORDINATION",
      "RELEASE_CONTROL_REQUIRED",
      "ALLOW_MISSING_ORIGIN",
      "ROOM_IDLE_TIMEOUT_MS",
      "MAX_PAYLOAD_BYTES",
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
