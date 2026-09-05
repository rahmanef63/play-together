import "./shared/browserPolyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers";
import { AuthCallbackBoundary } from "./features/auth/AuthCallbackBoundary";
import { ToastProvider } from "./shared/ToastProvider";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");

window.__PT_BOOTED__ = true;
createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <AppProviders>
        <AuthCallbackBoundary>
          <App />
        </AuthCallbackBoundary>
      </AppProviders>
    </ToastProvider>
  </StrictMode>,
);
