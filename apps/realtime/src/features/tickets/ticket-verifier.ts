import { type TicketClaims, ticketClaimsSchema } from "@play-together/contracts";
import { verifyTicket } from "@play-together/security";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { GatewayConfig } from "../../config.js";

const remoteVerifyRealtime = makeFunctionReference<"action", { ticket: string }, TicketClaims>(
  "gatewayTickets:verifyRealtime",
);

export interface TicketVerifier {
  verify(ticket: string): Promise<TicketClaims>;
}

export function createTicketVerifier(config: GatewayConfig): TicketVerifier {
  if (config.ticketVerifierConvexUrl) {
    const client = new ConvexHttpClient(config.ticketVerifierConvexUrl, {
      logger: false,
      fetch: timeoutFetch(config.ticketVerifierTimeoutMs),
    });
    return {
      async verify(ticket) {
        const claims = await client.action(remoteVerifyRealtime, { ticket });
        return ticketClaimsSchema.parse(claims);
      },
    };
  }
  const localSecrets =
    config.ticketSecrets?.length > 0
      ? config.ticketSecrets
      : config.ticketSecret
        ? [config.ticketSecret]
        : [];
  return {
    async verify(ticket) {
      return verifyTicketWithRotation(ticket, localSecrets);
    },
  };
}

function verifyTicketWithRotation(ticket: string, secrets: readonly string[]): TicketClaims {
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return verifyTicket(ticket, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Ticket signature invalid");
}

function timeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init = {}) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}
