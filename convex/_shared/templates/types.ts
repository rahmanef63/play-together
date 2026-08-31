import type { Id } from "../../_generated/dataModel";

export type TemplateStatus = "draft" | "published" | "retired";

export interface TemplatePublicationArgs {
  slug: string;
  version: string;
  title: string;
  summary: string;
  previewGameId: string;
  previewGameVersion: string;
  sourceBlobPath: string;
  sourceSha256: string;
  sourceBytes: number;
  priceMinor?: number;
  currency?: string;
  licenseId?: string;
  purchaseUrl?: string;
  status: TemplateStatus;
  publishToken: string;
}

export interface TemplateRecordArgs {
  slug: string;
  version: string;
  title: string;
  summary: string;
  previewGameId: string;
  previewGameVersion: string;
  sourceBlobPath: string;
  sourceSha256: string;
  sourceBytes: number;
  priceMinor?: number;
  currency?: string;
  licenseId?: string;
  purchaseUrl?: string;
  status: TemplateStatus;
}

export interface DownloadableTemplate {
  slug: string;
  version: string;
  sourceBlobPath: string;
  sourceSha256: string;
  sourceBytes: number;
}

export interface EntitlementArgs {
  templateId: Id<"gameTemplates">;
  userId: Id<"users">;
  source: "admin" | "purchase";
  orderRef?: string;
  expiresAt?: number;
}
