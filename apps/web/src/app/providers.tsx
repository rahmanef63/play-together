import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexHttpClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error("VITE_CONVEX_URL is required");

type UntypedAction = (reference: unknown, args?: unknown) => Promise<unknown>;

export function AppProviders({ children }: { children: ReactNode }) {
  const client = useMemo(() => createConvexClient(convexUrl), []);
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}

export function createConvexClient(url: string): ConvexReactClient {
  const client = new ConvexReactClient(url);
  const http = new ConvexHttpClient(url);
  const websocketAction = client.action.bind(client) as UntypedAction;
  const httpAction = http.action.bind(http) as UntypedAction;
  const routedAction: UntypedAction = (reference, args) => {
    const name = (reference as { _name?: unknown })?._name;
    return typeof name === "string" && name.startsWith("auth:")
      ? httpAction(reference, args)
      : websocketAction(reference, args);
  };
  (client as unknown as { action: UntypedAction }).action = routedAction;
  return client;
}
