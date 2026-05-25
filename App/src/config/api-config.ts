/**
 * api-config.ts
 * Configuration de l'URL du backend FastAPI.
 *
 * ⚠️  POUR LA DÉMO : remplacez l'IP ci-dessous par celle de votre PC.
 *     → Lancez `ipconfig` sur le PC et notez l'IP du réseau partagé.
 *     → Rebuild l'APK après chaque changement d'IP.
 */

// ─── IP du serveur FastAPI ────────────────────────────────────────────────────
// Remplacez par l'IP de votre PC sur le réseau commun avec le téléphone.
// Exemples courants :
//   192.168.137.1  → Point d'accès mobile Windows
//   192.168.43.1   → Partage de connexion Android
//   10.18.44.24    → WiFi école/entreprise (si téléphone sur même réseau)

const IP_SERVEUR = "172.20.10.2"; // ← REMPLACER SI NÉCESSAIRE
const PORT       = 8000;

export const API_BASE_URL = `http://${IP_SERVEUR}:${PORT}`;

// ─── Endpoints FastAPI ────────────────────────────────────────────────────────

export const ENDPOINTS = {
  /** POST /detect  — détection YOLO sur une image */
  detect:  `${API_BASE_URL}/detect`,
  /** POST /segment — segmentation + OCR complète */
  segment: `${API_BASE_URL}/segment`,
  /** GET  /health  — vérification que le serveur répond */
  health:  `${API_BASE_URL}/health`,
} as const;

// ─── Client HTTP avec timeout ─────────────────────────────────────────────────

interface ApiFetchOptions extends RequestInit {
  /** Délai avant abandon de la requête (défaut : 60 secondes). */
  timeoutMs?: number;
}

/**
 * Wrapper fetch avec timeout automatique et messages d'erreur clairs.
 * @throws Error avec message lisible si réseau inaccessible, timeout ou HTTP ≥ 400.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { timeoutMs = 60_000, ...fetchOptions } = options;

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
        `Délai d'attente dépassé (${Math.round(timeoutMs / 1000)}s). ` +
        `Vérifiez que FastAPI tourne sur ${API_BASE_URL}.`,
      );
    }

    if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
      throw new Error(
        `Impossible de joindre le serveur (${API_BASE_URL}). ` +
        "Vérifiez que le PC et le téléphone sont sur le même réseau.",
      );
    }

    throw err;
  }
}

// ─── Vérification de disponibilité ───────────────────────────────────────────

/**
 * Vérifie que l'API FastAPI répond en moins de 5 secondes.
 * Retourne true si le serveur est joignable, false sinon.
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