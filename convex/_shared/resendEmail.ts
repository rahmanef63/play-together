interface PasswordResetEmailInput {
  identifier: string;
  token: string;
  expires: Date;
}

interface ResendEnvironment {
  RESEND_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_PROJECT_NAME?: string;
  EMAIL_PROJECT_TAG?: string;
  EMAIL_REPLY_TO?: string;
}

export interface PasswordResetEmailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  tags: Array<{ name: string; value: string }>;
  reply_to?: string;
}

const DEFAULT_FROM = "official@rahmanef.com";
const DEFAULT_PROJECT_NAME = "Play Together";
const DEFAULT_PROJECT_TAG = "play-together";

export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
  environment: ResendEnvironment = process.env,
): PasswordResetEmailMessage {
  const projectName = cleanHeaderValue(environment.EMAIL_PROJECT_NAME ?? DEFAULT_PROJECT_NAME, 80);
  const projectTag = cleanTag(environment.EMAIL_PROJECT_TAG ?? DEFAULT_PROJECT_TAG);
  const fromAddress = cleanEmail(environment.EMAIL_FROM_ADDRESS ?? DEFAULT_FROM);
  const minutes = Math.max(1, Math.ceil((input.expires.getTime() - Date.now()) / 60_000));
  const subject = `${projectName} password reset`;
  const text = [
    `Reset your ${projectName} password`,
    "",
    `Verification code: ${input.token}`,
    `This code expires in about ${minutes} minutes.`,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#17151f"><h2>${escapeHtml(projectName)} password reset</h2><p>Use this verification code:</p><p style="font:700 28px/1.2 ui-monospace,monospace;letter-spacing:.14em">${escapeHtml(input.token)}</p><p>This code expires in about ${minutes} minutes.</p><p>If you did not request a password reset, you can ignore this email.</p></body></html>`;
  const message: PasswordResetEmailMessage = {
    from: `${projectName} <${fromAddress}>`,
    to: [cleanEmail(input.identifier)],
    subject,
    text,
    html,
    tags: [
      { name: "project", value: projectTag },
      { name: "purpose", value: "password-reset" },
    ],
  };
  if (environment.EMAIL_REPLY_TO) message.reply_to = cleanEmail(environment.EMAIL_REPLY_TO);
  return message;
}

export async function sendPasswordResetEmail(
  input: PasswordResetEmailInput,
  environment: ResendEnvironment = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const apiKey = environment.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(buildPasswordResetEmail(input, environment)),
  });
  if (!response.ok) {
    throw new Error(`Resend password reset delivery failed (${response.status})`);
  }
}

function cleanEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Invalid email address");
  }
  return email;
}

function cleanHeaderValue(value: string, maxLength: number): string {
  return (
    value
      .replace(/[\r\n]/g, " ")
      .trim()
      .slice(0, maxLength) || DEFAULT_PROJECT_NAME
  );
}

function cleanTag(value: string): string {
  const tag = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-");
  return tag.slice(0, 64) || DEFAULT_PROJECT_TAG;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
