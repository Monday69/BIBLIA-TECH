/**
 * camera-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Abstraction de l'accès caméra — fonctionne sur WEB et ANDROID natif.
 *
 * ─ Sur web     : délègue à l'<input type="file" capture="environment"> existant
 *                 dans scanner.tsx (comportement actuel inchangé).
 * ─ Sur Android : utilise @capacitor/camera (API native, meilleure qualité,
 *                 pas d'intermédiaire navigateur).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTÉGRATION dans scanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Copier ce fichier dans src/lib/camera-service.ts
 * 2. Ajouter l'import dans scanner.tsx :
 *      import { capturePhoto, pickFromGallery, isNative } from "@/lib/camera-service";
 *
 * 3. Remplacer les handlers existants :
 *
 *    // Avant (web uniquement) :
 *    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
 *      const f = e.target.files?.[0];
 *      if (!f) return;
 *      setPreview(URL.createObjectURL(f));
 *    };
 *
 *    // Après (web + Android natif) :
 *    const handleCamera = async () => {
 *      const photo = await capturePhoto(cameraRef.current ?? undefined);
 *      if (photo) setPreview(photo.dataUrl);
 *    };
 *    const handleGallery = async () => {
 *      const photo = await pickFromGallery(fileRef.current ?? undefined);
 *      if (photo) setPreview(photo.dataUrl);
 *    };
 *
 * 4. Garder les <input ref> pour le fallback web :
 *      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
 *      <input ref={fileRef}   type="file" accept="image/*" hidden onChange={onPick} />
 *
 * 5. Remplacer les onClick des deux cartes :
 *      onClick={() => isNative() ? handleCamera() : cameraRef.current?.click()}
 *      onClick={() => isNative() ? handleGallery() : fileRef.current?.click()}
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types publics ────────────────────────────────────────────────────────────

export interface CapturedPhoto {
  /** Data URL (data:image/jpeg;base64,...) utilisable directement dans <img src> */
  dataUrl: string;
  /** Format de l'image */
  format: "jpeg" | "png" | "gif";
}

// ─── Détection de la plateforme ───────────────────────────────────────────────

/**
 * Retourne true si l'app tourne dans un wrapper Capacitor natif (Android/iOS).
 * Ne requiert aucun import — vérifie le bridge global injecté par capacitor.js.
 */
export function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

/**
 * Retourne la plateforme courante : "android" | "ios" | "web".
 */
export function getPlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  return (window as any).Capacitor?.getPlatform?.() ?? "web";
}

// ─── Accès dynamique aux plugins Capacitor ────────────────────────────────────
// Les imports sont dynamiques pour éviter toute inclusion dans le bundle web/SSR.

async function loadCameraPlugin() {
  const { Camera, CameraResultType, CameraSource } = await import(
    /* @vite-ignore */ "@capacitor/camera"
  );
  return { Camera, CameraResultType, CameraSource };
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Prend une photo avec l'appareil photo.
 *
 * ─ Android : ouvre l'application caméra native (meilleure qualité).
 * ─ Web     : active le fallbackInput (l'<input capture="environment"> existant).
 *             Retourne null — le résultat arrive via l'événement onChange de l'input.
 *
 * @param fallbackInput  Référence à l'<input type="file" capture="environment">
 *                       utilisé comme fallback sur web.
 * @returns Photo capturée (Android) ou null (web — résultat via input onChange).
 */
export async function capturePhoto(
  fallbackInput?: HTMLInputElement,
): Promise<CapturedPhoto | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await loadCameraPlugin();
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 90,
        allowEditing: false,
        width: 1920,
        correctOrientation: true,
      });
      return {
        dataUrl: photo.dataUrl!,
        format: (photo.format as CapturedPhoto["format"]) ?? "jpeg",
      };
    } catch (err: any) {
      // L'utilisateur a annulé → null (pas d'erreur à afficher)
      if (
        err?.message?.includes("cancel") ||
        err?.message?.includes("dismiss") ||
        err?.errorMessage?.includes("cancel")
      ) {
        return null;
      }
      throw err;
    }
  }

  // Fallback web : déléguer à l'<input> HTML
  fallbackInput?.click();
  return null;
}

/**
 * Sélectionne une image depuis la galerie photos.
 *
 * ─ Android : ouvre le sélecteur de photos natif.
 * ─ Web     : active le fallbackInput (l'<input type="file"> existant).
 *
 * @param fallbackInput  Référence à l'<input type="file"> (sans capture).
 */
export async function pickFromGallery(
  fallbackInput?: HTMLInputElement,
): Promise<CapturedPhoto | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await loadCameraPlugin();
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90,
        correctOrientation: true,
      });
      return {
        dataUrl: photo.dataUrl!,
        format: (photo.format as CapturedPhoto["format"]) ?? "jpeg",
      };
    } catch (err: any) {
      if (
        err?.message?.includes("cancel") ||
        err?.message?.includes("dismiss") ||
        err?.errorMessage?.includes("cancel")
      ) {
        return null;
      }
      throw err;
    }
  }

  fallbackInput?.click();
  return null;
}

/**
 * Convertit un dataUrl en File (utile pour l'envoyer à l'API FastAPI via FormData).
 *
 * Exemple d'usage :
 *   const photo = await capturePhoto();
 *   if (photo) {
 *     const file = dataUrlToFile(photo.dataUrl, "scan.jpg");
 *     const form = new FormData();
 *     form.append("image", file);
 *     await fetch(ENDPOINTS.analyze, { method: "POST", body: form });
 *   }
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}
