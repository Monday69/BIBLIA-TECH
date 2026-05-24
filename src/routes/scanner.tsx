import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Camera, Upload, Loader2, ScanLine, X, RotateCcw,
  CheckCircle2, AlertTriangle, HelpCircle, BookOpen, LayoutGrid, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getEtageres, hasData, type Etagere } from "@/lib/ConnecBase";
import { BookGallery } from "@/components/BookGallery";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SEGMENT_ENDPOINT = `${API_BASE_URL}/segment`;

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner — BIBLIA-TECH" }] }),
  component: ScannerPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type BookInfo = {
  index: number;
  x: number; // coordonnées normalisées 0-1
  y: number;
  w: number;
  h: number;
};

// Représente un livre encore actif (non supprimé)
type ActiveBook = {
  originalIndex: number; // index dans books_info du backend
  crop: string;          // image base64 du crop
  bbox: BookInfo;        // position sur l'image annotée
};

type SegmentationResult = {
  status: "success" | "error";
  book_count: number;
  etagere_id: number | null;
  image_base64: string;
  crops: string[];
  books_info: BookInfo[];
  message?: string;
};

// ─── BookInspector ────────────────────────────────────────────────────────────
// Modal qui s'ouvre quand on clique sur un livre dans l'image annotée

type BookInspectorProps = {
  book: ActiveBook;
  onDelete: () => void;
  onClose: () => void;
};

function BookInspector({ book, onDelete, onClose }: BookInspectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold">Livre #{book.originalIndex + 1}</span>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop en grand */}
        <div className="flex items-center justify-center bg-muted/20 p-4 min-h-48">
          <img
            src={book.crop}
            alt={`Livre ${book.originalIndex + 1}`}
            className="max-h-60 max-w-full object-contain rounded-lg shadow"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Garder
          </Button>
          <Button variant="destructive" onClick={onDelete} className="flex-1">
            <Trash2 className="h-4 w-4 mr-1.5" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ShelfSummary ─────────────────────────────────────────────────────────────

type ShelfSummaryProps = { bookCount: number; etagereId: number | null };

function ShelfSummary({ bookCount, etagereId }: ShelfSummaryProps) {
  if (etagereId === null) {
    return (
      <Card className="border-yellow-500/40 bg-yellow-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-yellow-600 dark:text-yellow-400">
              Marqueur ArUco non détecté
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Assurez-vous que le marqueur est visible et bien éclairé.
              <br />
              <span className="font-medium">{bookCount} livre(s)</span> ont tout de même été détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasData()) {
    return (
      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              Étagère #{etagereId} détectée
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Aucune base de données importée. Importez votre fichier .db dans la section{" "}
              <span className="font-medium">Bibliothèque</span> pour comparer le stock attendu.
              <br />
              <span className="font-medium">{bookCount} livre(s)</span> détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const etagere: Etagere | undefined = getEtageres().find((e) => e.id === etagereId);

  if (!etagere) {
    return (
      <Card className="border-orange-500/40 bg-orange-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-orange-600 dark:text-orange-400">
              Étagère #{etagereId} introuvable dans la base
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Le marqueur ArUco indique l'étagère #{etagereId}, mais elle n'existe pas dans la base importée.
              <br />
              <span className="font-medium">{bookCount} livre(s)</span> ont été détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const attendus = etagere.nb_livres_attendus;
  const isOk = bookCount === attendus;
  const diff = bookCount - attendus;

  return (
    <Card className={isOk ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          {isOk ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <span>{etagere.label}</span>
          <Badge
            variant="outline"
            className={
              isOk
                ? "ml-auto border-green-500 text-green-600 dark:text-green-400"
                : "ml-auto border-red-500 text-red-600 dark:text-red-400"
            }
          >
            {isOk ? "✓ Conforme" : diff > 0 ? `+${diff} livre(s) en trop` : `${diff} livre(s) manquant(s)`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="rounded-lg bg-background/60 border p-3 text-center">
            <div className="text-2xl font-bold">{attendus}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Attendus</div>
          </div>
          <div className={`rounded-lg border p-3 text-center ${isOk ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <div className={`text-2xl font-bold ${isOk ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {bookCount}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Détectés</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

function ScannerPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SegmentationResult | null>(null);

  // Source de vérité pour les livres non supprimés (synchronisée entre image + galerie)
  const [activeBooks, setActiveBooks] = useState<ActiveBook[]>([]);
  const [inspectedBook, setInspectedBook] = useState<ActiveBook | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setActiveBooks([]);
    setProgress(0);
    e.target.value = "";
  };

  const analyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress(0);
    setResult(null);
    setActiveBooks([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setProgress(20);
      const apiResponse = await fetch(SEGMENT_ENDPOINT, { method: "POST", body: formData });

      setProgress(75);

      const data: SegmentationResult = await apiResponse.json().catch(() => ({
        status: "error" as const,
        book_count: 0,
        etagere_id: null,
        image_base64: "",
        crops: [],
        books_info: [],
        message: `Erreur HTTP ${apiResponse.status}`,
      }));

      setProgress(100);

      if (apiResponse.ok && data.status === "success") {
        setResult(data);
        // Initialiser activeBooks depuis la réponse backend
        setActiveBooks(
          (data.books_info ?? []).map((info, i) => ({
            originalIndex: i,
            crop: data.crops[i] ?? "",
            bbox: info,
          }))
        );
      } else {
        throw new Error(data.message || `Erreur API ${apiResponse.status}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("Erreur segmentation:", msg);
      alert(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setActiveBooks([]);
    setInspectedBook(null);
    setGalleryOpen(false);
    setProgress(0);
  };

  // Suppression depuis l'inspecteur (clic sur image)
  const handleInspectorDelete = () => {
    if (!inspectedBook) return;
    const remaining = activeBooks.filter(
      (b) => b.originalIndex !== inspectedBook.originalIndex
    );
    setActiveBooks(remaining);
    setInspectedBook(null);
  };

  // Suppression depuis la galerie (synchro par correspondance de crop)
  const handleGalleryCropsChange = (remainingCrops: string[]) => {
    const cropSet = new Set(remainingCrops);
    setActiveBooks((prev) => prev.filter((b) => cropSet.has(b.crop)));
  };

  const activeCount = activeBooks.length;

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Scanner</h1>
        <p className="text-muted-foreground mt-1">
          Photographiez une étagère : le modèle YOLO segmente les livres et vérifie le stock.
        </p>
      </header>

      {/* Sélection de l'image */}
      {!preview && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-accent transition-colors"
            onClick={() => cameraRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                <Camera className="h-7 w-7" />
              </div>
              <div>
                <div className="font-semibold">Prendre une photo</div>
                <div className="text-xs text-muted-foreground mt-1">Utiliser l'appareil photo</div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                <Upload className="h-7 w-7" />
              </div>
              <div>
                <div className="font-semibold">Charger une image</div>
                <div className="text-xs text-muted-foreground mt-1">JPG, PNG depuis votre appareil</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

      {/* Aperçu + bouton d'analyse */}
      {preview && !result && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img src={preview} alt="aperçu étagère" className="w-full object-contain max-h-[480px]" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Segmentation en cours… {progress}%
                </div>
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">Détection ArUco + segmentation YOLO…</div>
              </div>
            ) : (
              <Button onClick={analyze} size="lg" className="w-full bg-primary">
                <ScanLine className="mr-2 h-5 w-5" />
                Lancer la segmentation
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Résultats ─────────────────────────────────────────────────────── */}
      {result && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl font-bold">Résultats</h2>
            <Badge variant="outline" className="border-accent text-accent text-sm px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              {activeCount} livre{activeCount > 1 ? "s" : ""} détecté{activeCount > 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Résumé étagère */}
          <ShelfSummary bookCount={activeCount} etagereId={result.etagere_id} />

          {/* Image annotée + overlays cliquables */}
          {activeCount === 0 && (result.books_info ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun livre détecté. Vérifiez la qualité de l'image et réessayez.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2">
                {/* Conteneur image avec overlays */}
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={result.image_base64}
                    alt="Segmentation des livres par YOLO"
                    className="w-full block rounded-lg"
                    draggable={false}
                  />

                  {/* Overlay cliquable pour chaque livre */}
                  {(result.books_info ?? []).map((info) => {
                    const isActive = activeBooks.some((b) => b.originalIndex === info.index);
                    const book = activeBooks.find((b) => b.originalIndex === info.index);

                    return (
                      <div
                        key={info.index}
                        onClick={() => isActive && book && setInspectedBook(book)}
                        style={{
                          position: "absolute",
                          left: `${info.x * 100}%`,
                          top: `${info.y * 100}%`,
                          width: `${info.w * 100}%`,
                          height: `${info.h * 100}%`,
                        }}
                        className={`rounded transition-all duration-200 ${
                          isActive
                            ? "cursor-pointer hover:bg-white/15 hover:ring-2 hover:ring-white/60"
                            : "bg-red-500/30 ring-1 ring-red-400 cursor-default"
                        }`}
                        title={isActive ? `Cliquer pour inspecter le livre #${info.index + 1}` : "Supprimé"}
                      >
                        {/* Croix rouge sur les livres supprimés */}
                        {!isActive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <X className="text-red-400 h-5 w-5 drop-shadow" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Cliquez sur un livre pour l'inspecter · Livres supprimés marqués en rouge
                </p>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3">
            {activeBooks.length > 0 && (
              <Button
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setGalleryOpen(true)}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Gérer la segmentation
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeBooks.length}
                </Badge>
              </Button>
            )}
            <Button variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Scanner une autre image
            </Button>
          </div>
        </section>
      )}

      {/* Inspecteur (clic sur l'image) */}
      {inspectedBook && (
        <BookInspector
          book={inspectedBook}
          onClose={() => setInspectedBook(null)}
          onDelete={handleInspectorDelete}
        />
      )}

      {/* Galerie plein écran */}
      {galleryOpen && activeBooks.length > 0 && (
        <BookGallery
          crops={activeBooks.map((b) => b.crop)}
          onClose={() => setGalleryOpen(false)}
          onCropsChange={handleGalleryCropsChange}
        />
      )}
    </div>
  );
}
