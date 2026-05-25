/**
 * capacitor.config.ts
 * Configuration Capacitor pour BIBLIA-TECH Android.
 *
 * Commandes à lancer depuis le dossier App/ :
 * npm install            → installe les dépendances Capacitor
 * npm run add:android    → génère App/android/ (une seule fois)
 * npm run sync           → synchronise App/www/ → App/android/
 * npm run open           → ouvre Android Studio
 * npm run assets         → génère toutes les tailles d'icônes/splash
 */
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bibliatech.app",
  appName: "BIBLIA-TECH",

  // Dossier contenant le build React SPA généré par "npm run build:mobile"
  // (chemin relatif à ce fichier → App/www/)
  webDir: "www",

  // ─── Plugins ───────────────────────────────────────────────────────────────

  plugins: {
    SplashScreen: {
      // Durée d'affichage du splash avant que React soit monté
      launchShowDuration: 0,
      launchAutoHide: true,
      // Couleur de fond du splash = blanc
      backgroundColor: "#ffffff",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    StatusBar: {
      // Style "DEFAULT" = texte sombre sur fond clair (adapté à la palette Sauge)
      style: "DEFAULT",
      // Couleur de la barre = Sauge foncé (--primary)
      backgroundColor: "#3d6b51",
      overlaysWebView: false,
    },
  },

  // ─── Android ───────────────────────────────────────────────────────────────

  android: {
    // Autorise le chargement de contenu HTTP (nécessaire pour le backend FastAPI
    // en développement sur réseau local). Configurer une exception réseau en
    // production — voir App/android/app/src/main/res/xml/network_security_config.xml
    allowMixedContent: true,

    // Améliore la saisie dans les <input> du WebView
    captureInput: true,

    // Active les DevTools Chrome pour déboguer le WebView depuis un PC
    // (chrome://inspect → choisir l'appareil USB)
    // ⚠️  Passer à false avant de publier sur le Play Store
    webContentsDebuggingEnabled: true,
  },

  // ─── Serveur (live reload pendant le développement) ────────────────────────

  server: {
    // ── MODE LIVE RELOAD ─────────────────────────────────────────────────────
    // Pour activer le hot-reload Android via WiFi :
    //   1. Lancer depuis la racine du projet :  npm run dev:mobile
    //      (le terminal affiche "Network: http://TON_IP:5173")
    //   2. Remplacer XX par votre IP locale ci-dessous et décommenter les 2 lignes
    //   3. Depuis App/ : npm run sync && npm run run:android
    //   → Chaque sauvegarde React se reflète en ~1 s sur le téléphone.
    //
    // ⚠️  RECOMMENTER AVANT DE GÉNÉRER L'APK FINAL (sinon l'APK ne fonctionne
    //     qu'en présence du serveur de dev sur le même réseau WiFi).
    //
    // url: "http://192.168.1.XX:5173",
    // ─────────────────────────────────────────────────────────────────────────

    // 👇 AJOUT REQUIS ICI : Autorise les requêtes HTTP (non sécurisées par HTTPS) vers ton backend local FastAPI
    cleartext: true,

    // En production : charge les assets depuis le bundle embarqué (App/www/)
    androidScheme: "http",
  },
};

export default config;