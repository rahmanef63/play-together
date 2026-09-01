import { renderTransactionalEmail } from "./emailShell";

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
  EMAIL_SITE_URL?: string;
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
const DEFAULT_SITE_URL = "https://game.rahmanef.com";

export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
  environment: ResendEnvironment = process.env,
): PasswordResetEmailMessage {
  const projectName = cleanHeaderValue(environment.EMAIL_PROJECT_NAME ?? DEFAULT_PROJECT_NAME, 80);
  const projectTag = cleanTag(environment.EMAIL_PROJECT_TAG ?? DEFAULT_PROJECT_TAG);
  const fromAddress = cleanEmail(environment.EMAIL_FROM_ADDRESS ?? DEFAULT_FROM);
  const minutes = Math.max(1, Math.ceil((input.expires.getTime() - Date.now()) / 60_000));
  const subject = `${projectName} password reset`;
  const siteUrl = cleanSiteUrl(environment.EMAIL_SITE_URL ?? DEFAULT_SITE_URL);
  const content = renderTransactionalEmail({
    projectName,
    preheader: `Your ${projectName} password reset code`,
    title: "Reset your password",
    paragraphs: [
      "Use the verification code below to set a new password.",
      `This code expires in about ${minutes} minutes.`,
    ],
    code: input.token,
    footerNote: "If you did not request this password reset, you can safely ignore this email.",
    siteUrl,
  });
  const message: PasswordResetEmailMessage = {
    from: `${projectName} <${fromAddress}>`,
    to: [cleanEmail(input.identifier)],
    subject,
    text: content.text,
    html: content.html,
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

function cleanSiteUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Invalid email site URL");
  }
  return url.toString().replace(/\/$/, "");
}
