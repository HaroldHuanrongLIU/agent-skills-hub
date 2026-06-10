import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "@fontsource-variable/inter/index.css"; // self-hosted Inter (bundled; works in CN)
import "./index.css";
import App from "./App.tsx";

// Don't hydrate on static-only pages (pre-rendered at build time)
// These pages have their own HTML and don't need React
const isStaticOnlyPage = window.location.pathname.startsWith("/best/");

if (!isStaticOnlyPage) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </StrictMode>,
  );
}
