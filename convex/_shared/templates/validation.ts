import { ConvexError } from "convex/values";

export function validateTemplateIdentity(
  slugValue: string,
  versionValue: string,
): { slug: string; version: string } {
  const slug = slugValue.trim().toLowerCase();
  const version = versionValue.trim();
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug))
    throw new ConvexError({ code: "INVALID_TEMPLATE", message: "Invalid template slug" });
  if (!version || version.length > 64)
    throw new ConvexError({ code: "INVALID_TEMPLATE", message: "Invalid template version" });
  return { slug, version };
}
export function validateTemplateSource(path: string, sha256: string, bytes: number): void {
  if (!/^templates\/[a-z0-9/_+.-]+$/i.test(path) || path.includes(".."))
    throw new ConvexError({ code: "INVALID_BLOB_PATH", message: "Invalid private template path" });
  if (!/^[a-f0-9]{64}$/i.test(sha256))
    throw new ConvexError({
      code: "INVALID_DIGEST",
      message: "Template source digest must be SHA-256",
    });
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 512 * 1024 * 1024)
    throw new ConvexError({ code: "INVALID_SIZE", message: "Template source size is invalid" });
}
export function validateCommercialFields(args: {
  priceMinor?: number;
  currency?: string;
  licenseId?: string;
}): void {
  if (!Number.isInteger(args.priceMinor) || (args.priceMinor ?? -1) < 0)
    throw new ConvexError({ code: "INVALID_PRICE", message: "Published templates need a price" });
  if (!/^[A-Z]{3}$/i.test(args.currency?.trim() ?? ""))
    throw new ConvexError({ code: "INVALID_CURRENCY", message: "Currency must use ISO-4217 code" });
  if (!args.licenseId?.trim())
    throw new ConvexError({
      code: "INVALID_LICENSE",
      message: "Published templates need a license",
    });
}
export function normalizePurchaseUrl(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  if (!cleaned) return undefined;
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new ConvexError({
      code: "INVALID_PURCHASE_URL",
      message: "Purchase URL must use valid HTTPS",
    });
  }
}
export function cleanText(value: string, max: number, field: string): string {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > max)
    throw new ConvexError({ code: "INVALID_TEMPLATE", message: `Template ${field} is invalid` });
  return text;
}
