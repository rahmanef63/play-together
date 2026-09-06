import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { verifyTemplateDownloadTicket } from "./_shared/templateDownloadTicket";
import { verifyTicket } from "./_shared/ticketCrypto";

const MAX_TICKET_LENGTH = 8_192;

export const verifyRealtime = action({
  args: { ticket: v.string() },
  handler: async (_ctx, { ticket }) => {
    if (ticket.length < 32 || ticket.length > MAX_TICKET_LENGTH) throw invalidTicket();
    const secret = process.env.JOIN_TICKET_SECRET;
    if (!secret) throw misconfigured("Realtime tickets are not configured");
    try {
      return await verifyTicket(ticket, secret);
    } catch {
      throw invalidTicket();
    }
  },
});

export const verifyTemplateDownload = action({
  args: { ticket: v.string() },
  handler: async (_ctx, { ticket }) => {
    if (ticket.length < 32 || ticket.length > MAX_TICKET_LENGTH) throw invalidTicket();
    const secret = process.env.TEMPLATE_DOWNLOAD_SECRET;
    if (!secret) throw misconfigured("Template download tickets are not configured");
    try {
      return await verifyTemplateDownloadTicket(ticket, secret);
    } catch {
      throw invalidTicket();
    }
  },
});

function invalidTicket() {
  return new ConvexError({ code: "INVALID_TICKET", message: "Ticket is invalid or expired" });
}

function misconfigured(message: string) {
  return new ConvexError({ code: "SERVER_MISCONFIGURED", message });
}
