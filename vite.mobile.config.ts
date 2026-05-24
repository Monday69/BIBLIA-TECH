/**
 * vite.mobile.config.ts
 * Configuration Vite pour le build mobile (SPA statique, sans SSR).
 *
 * Capacitor lit le résultat de ce build (App/www/) pour l'embarquer
 * dans le WebView Android/iOS. Chaque modification React est prise en compte
 * en relançant "npm run build:mobile" puis "npm run cap:sync".
 *
 * Le build web principal (TanStack Start SSR + Cloudflare) utilise
 * vite.config.ts — celui-ci est STRICTEMENT INCHANGÉ.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Scripts disponibles (définis dans package.json) :
 *   npm run build:mobile   → build SPA → App/www/  (pour générer l'APK)
 *   npm run dev:mobile     → serveur dev SPA :5173  (pour live reload Android)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, renameSync } from "fs";

export default defineConfig({
  plugins: [
    // Génère / utilise src/routeTree.gen.ts
    // Même fichier que le build web → source unique, aucune duplication.
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),

    // ── Plugin : renomme index-mobile.html → index.html ─────────────────────
    // Capacitor exige "index.html" comme point d'entrée dans webDir.
    // Vite garde le nom du fichier source — on le corrige ici.
    {
      name: "rename-index-html",
      closeBundle() {
        const src = resolve(__dirname, "App/www/index-mobile.html");
        const dest = resolve(__dirname, "App/www/index.html");
        if (existsSync(src)) {
          renameSync(src, dest);
          console.log("✓ [build:mobile] index-mobile.html → index.html");
        }
      },
    },

    // ── Plugin : copie sql-asm.js dans App/www/ après le build ───────────────
    // Permet à l'app Android de charger sql.js HORS LIGNE (sans CDN).
    //
    // ⚠️  IMPORTANT — sql-asm.js vs sql-wasm :
    //   · sql-asm.js   = pure JavaScript (ASM.js) → 1 SEUL fichier (~9 Mo)
    //                    AUCUN fichier .wasm associé.
    //   · sql-wasm.js  = version WebAssembly → nécessite sql-wasm.wasm EN PLUS.
    //   On utilise la version asm.js → 1 seul fichier à copier.
    //
    // Emplacement final : App/www/sql-asm.js
    // Chargé par ConnecBase.ts via l'URL "/sql-asm.js" quand isNative() = true.
    {
      name: "copy-sqljs-for-android",
      closeBundle() {
        const src = resolve(__dirname, "node_modules/sql.js/dist/sql-asm.js");
        const destDir = resolve(__dirname, "App/www");
        const dest = resolve(destDir, "sql-asm.js");

        if (!existsSync(src)) {
          console.warn(
            "\n⚠  [build:mobile] sql-asm.js introuvable dans node_modules/sql.js/dist/\n" +
              "   → L'app Android ne pourra pas utiliser sql.js hors ligne.\n" +
              "   Corrigez avec : npm install sql.js\n" +
              "   Puis relancez : npm run build:mobile\n",
          );
          return;
        }

        mkdirSync(destDir, { recursive: true });
        copyFileSync(src, dest);
        console.log(`✓ [build:mobile] sql-asm.js copié → App/www/sql-asm.js`);
      },
    },
  ],

  // Point d'entrée mobile — template HTML sans shell SSR TanStack Start
  root: ".",
  build: {
    outDir: "App/www",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index-mobile.html"),
    },
    // Chunking raisonnable pour un WebView
    chunkSizeWarningLimit: 2000,
  },

  // Serveur de développement pour le live reload Android (WiFi)
  // ─────────────────────────────────────────────────────────────
  // 1. Lancer : npm run dev:mobile  (affiche "Network: http://TON_IP:5173")
  // 2. Dans App/capacitor.config.ts, décommenter :
  //      server: { url: "http://TON_IP:5173", cleartext: true }
  // 3. Lancer : cd App && npx cap run android
  // → Chaque sauvegarde React se reflète instantanément sur le téléphone.
  // → Avant de générer l'APK final, recommenter server.url !
  server: {
    port: 5173,
    host: "0.0.0.0", // expose sur le réseau local (nécessaire pour le téléphone)
    strictPort: true,
  },
});
