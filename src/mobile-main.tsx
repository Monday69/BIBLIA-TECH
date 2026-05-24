/**
 * mobile-main.tsx
 * ────────────────────────────────────────────────────────────────────────────
 * Point d'entrée Capacitor (Android / iOS).
 *
 * DIFFÉRENCES avec le build web TanStack Start :
 *  · Pas de SSR        : rendu purement côté client (SPA).
 *  · Pas de shellComponent (RootShell) : le <html>/<head>/<body> est dans
 *    index-mobile.html — TanStack Start n'est pas utilisé ici.
 *  · RouterProvider    : rend directement RootComponent (via routeTree).
 *    En mode client, TanStack Router ignore shellComponent et rend uniquement
 *    le `component:` de chaque route → QueryClientProvider + Sidebar + Nav.
 *
 * Ce fichier ne modifie AUCUN fichier existant.
 * Le build web principal continue d'utiliser son propre point d'entrée
 * géré par @lovable.dev/vite-tanstack-config.
 * ────────────────────────────────────────────────────────────────────────────
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

// ─── Initialisation du router ─────────────────────────────────────────────────
// getRouter() crée un QueryClient + charge le routeTree généré automatiquement
// par TanStack Router (src/routeTree.gen.ts — même fichier que le build web).
const router = getRouter();

// ─── Montage React ────────────────────────────────────────────────────────────
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "[mobile-main] Élément #root introuvable dans index-mobile.html. " +
      "Vérifiez que <div id='root'></div> est bien présent.",
  );
}

createRoot(rootElement).render(
  <StrictMode>
    {/*
      RouterProvider en mode client-side uniquement :
      · Gère la navigation (hash / history selon la config du router)
      · Passe le QueryClient via context (pour @tanstack/react-query)
      · Rend RootComponent → Sidebar + MobileHeader + BottomNav + <Outlet>
      · head() des routes met à jour document.title côté client
    */}
    <RouterProvider router={router} />
  </StrictMode>,
);
