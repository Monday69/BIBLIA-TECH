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
import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { SplashScreen } from "./components/SplashScreen";
import "./styles.css";

// ─── Initialisation du router ─────────────────────────────────────────────────
// getRouter() crée un QueryClient + charge le routeTree généré automatiquement
// par TanStack Router (src/routeTree.gen.ts — même fichier que le build web).
const router = getRouter();

// ─── Wrapper App avec SplashScreen ────────────────────────────────────────────

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Vérifier si le splash a déjà été vu cette session
    return sessionStorage.getItem("splash-seen") !== "true";
  });

  const handleSplashComplete = () => {
    // Marquer le splash comme vu
    sessionStorage.setItem("splash-seen", "true");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <RouterProvider router={router} />
  );
}

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
      App wrapper gère l'affichage du SplashScreen initial.
      Une fois le splash terminé, affiche le RouterProvider normal.
    */}
    <App />
  </StrictMode>,
);
