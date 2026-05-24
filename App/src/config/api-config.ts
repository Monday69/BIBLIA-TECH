/**
 * api-config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuration de l'URL du backend FastAPI.
 * Résolution automatique selon la plateforme et l'environnement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTÉGRATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copier ce fichier dans src/lib/api-config.ts
 * 2. Créer un fichier .env.local à la RACINE du projet avec :
 *
 *      # Développement web (navigateur)
 *      VITE_API_URL=http://localhost:8000
 *
 *      # Développement natif Android (remplacer XX par votre IP locale)
 *      # VITE_API_URL=http://192.168.1.XX:8000
 *
 * 3. Pour la production, créer .env.production :
 *      VITE_API_URL=https://api.votredomaine.com
 *
 * 4. Importer dans scanner.tsx :
 *      import { ENDPOINTS, apiFetch, checkApiHealth } from "@/lib/api-config";
 *
 * 5. Remplacer le mock dans analyze() par un vrai appel :
 *      const form = new FormData();
 *      form.append("image", file);
 *      const result = await apiFetch<AnalysisResult>(ENDPOINTS.analyze, {
 *        method: "POST",
 *        body: form,
 *        timeoutMs: 60_000,
 *      });
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Détection de la plateforme (sans import Capacitor au niveau module) ──────

function isNativePlatform(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

// ─── Résolution de l'URL de base ──────────────────────────────────────────────

/**
 * Ordre de priorité :
 * 1. Variable d'environnement VITE_API_URL (fichier .env.local ou .env.production)
 * 2. Plateforme native Android/iOS → IP locale du serveur de développement
 * 3. Développement web (Vite dev server)
 * 4. Production web
 */
function resolveApiUrl(): string {
  // 1. Variable d'environnement explicite (source de vérité en équipe)
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, ""); // retire le slash final

  // 2. Android natif sans variable d'env → IP locale par défaut
  //    ⚠️  À modifier avec votre IP locale (affichée par ipconfig sur Windows)
  if (isNativePlatform()) {
    return "http://192.168.1.1:8000"; // ← REMPLACER
  }

  // 3. Développement web
  if (import.meta.env.DEV) {
    return "http://localhost:8000";
  }

  // 4. Production web (à remplacer par votre URL de déploiement)
  return "https://api.bibliatech.example.com"; // ← REMPLACER
}

export const API_BASE_URL = resolveApiUrl();

// ─── Endpoints FastAPI ────────────────────────────────────────────────────────

export const ENDPOINTS = {
  /** POST /detect
   *  Body    : multipart/form-data avec champ "file" (JPEG/PNG)
   *  Réponse : { detections: [...], image_size: [...] }
   */
  detect: `${API_BASE_URL}/detect`,

  /** POST /segment
   *  Body    : multipart/form-data avec champ "file" (JPEG/PNG)
   *  Réponse : { status: "success", books_count: N, books: [...] }
   */
  segment: `${API_BASE_URL}/segment`,

  /** GET /health → { status: "ok", model_loaded: true } */
  health: `${API_BASE_URL}/health`,
} as const;

// ─── Client HTTP avec timeout ─────────────────────────────────────────────────

interface ApiFetchOptions extends RequestInit {
  /** Délai avant abandon de la requête (défaut : 30 secondes). */
  timeoutMs?: number;
}

/**
 * Wrapper fetch avec timeout automatique et gestion d'erreurs cohérente.
 *
 * @throws Error avec message français si : réseau inaccessible, timeout, HTTP ≥ 400.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { timeoutMs = 30_000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Erreur API ${response.status}${body ? ` : ${body.slice(0, 200)}` : ""}`,
      );
    }

    return response.json() as Promise<T>;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(
        `Délai d'attente dépassé (${Math.round(timeoutMs / 1000)} s). ` +
          "Vérifiez que le serveur FastAPI est démarré et accessible.",
      );
    }
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new Error(
        `Impossible de joindre le serveur (${API_BASE_URL}). ` +
          "Vérifiez votre connexion et l'URL dans .env.local.",
      );
    }
    throw err;
  }
}

// ─── Vérification de disponibilité ───────────────────────────────────────────

/**
 * Vérifie que l'API FastAPI répond en moins de 5 secondes.
 * Utilisation : afficher un badge "API connectée / déconnectée" dans l'UI.
 *
 * @example
 * const [online, setOnline] = useState<boolean | null>(null);
 * useEffect(() => { checkApiHealth().then(setOnline); }, []);
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINTS.health, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
