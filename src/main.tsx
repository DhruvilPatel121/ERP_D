import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { AuthProvider } from "./contexts/ERPAuthContext.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import "./index.css";

Sentry.init({
  dsn: import.meta.env["VITE_SENTRY_DSN"] as string | undefined,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={<p>An error occurred. Please refresh the page.</p>}
  >
    <BrowserRouter>
      <AuthProvider>
        <AppWrapper>
          <App />
        </AppWrapper>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  </Sentry.ErrorBoundary>,
);
