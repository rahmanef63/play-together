import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers";
import { AuthCallbackBoundary } from "./features/auth/AuthCallbackBoundary";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <AuthCallbackBoundary>
        <App />
      </AuthCallbackBoundary>
    </AppProviders>
  </StrictMode>,
);
