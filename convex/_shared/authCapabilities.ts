export interface AuthCapabilityEnvironment {
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
}

export function authCapabilities(environment: AuthCapabilityEnvironment = process.env) {
  const google = Boolean(
    environment.AUTH_GOOGLE_ID?.trim() && environment.AUTH_GOOGLE_SECRET?.trim(),
  );
  return { google } as const;
}
