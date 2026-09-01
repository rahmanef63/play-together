export interface TransactionalEmailShellInput {
  projectName: string;
  preheader: string;
  title: string;
  paragraphs: string[];
  code?: string;
  footerNote: string;
  siteUrl: string;
}

export function renderTransactionalEmail(input: TransactionalEmailShellInput) {
  const text = [
    input.projectName,
    input.title,
    "",
    ...input.paragraphs,
    ...(input.code ? ["", `Code: ${input.code}`] : []),
    "",
    input.footerNote,
    input.siteUrl,
  ].join("\n");
  const paragraphHtml = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;color:#3f4147;font-size:15px;line-height:1.6">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const codeHtml = input.code
    ? `<div style="margin:20px 0;padding:18px;border:1px solid #e6dfd1;border-radius:14px;background:#f7f4ed;text-align:center;font:800 30px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:#17181b">${escapeHtml(input.code)}</div>`
    : "";
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;background:#f4f2ec;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#17181b"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ec;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e7e2d8;border-radius:20px;overflow:hidden"><tr><td style="padding:20px 24px;border-bottom:1px solid #eee9df"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="width:38px;height:38px;border-radius:12px;background:#d39a32;color:#16130b;text-align:center;font-weight:900">PT</td><td style="padding-left:12px;font-size:16px;font-weight:800">${escapeHtml(input.projectName)}</td></tr></table></td></tr><tr><td style="padding:28px 24px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.2">${escapeHtml(input.title)}</h1>${paragraphHtml}${codeHtml}</td></tr><tr><td style="padding:18px 24px;border-top:1px solid #eee9df;background:#faf9f6;color:#77736b;font-size:12px;line-height:1.55"><p style="margin:0 0 5px">${escapeHtml(input.footerNote)}</p><p style="margin:0">${escapeHtml(input.siteUrl)}</p></td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
