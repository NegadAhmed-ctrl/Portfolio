import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { LocalApi } from "./data/localApi";
import type { AdminApi } from "./data/api";
import { AppProvider } from "./state/app";
import { ToastProvider } from "./ui/Toast";

// Demo backend. For a real client swap this line for:
//   new SupabaseApi(createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY))
// (see README → "Connect a real backend").
const url = new URL(location.href);
const api: AdminApi = new LocalApi({
  store: window.localStorage,
  latency: 320,
  failing: url.searchParams.has("demo-error"), // ?demo-error shows the error states
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider api={api}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
);
