import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import {
  Camera, Upload, Loader2, ScanLine, X, RotateCcw,
  CheckCircle2, AlertTriangle, HelpCircle, BookOpen, LayoutGrid, Trash2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getEtageres, getLivres, getPositions, hasData, type Etagere } from "@/lib/ConnecBase";
import { BookGallery, type GalleryBook } from "@/components/BookGallery";

//  MODIFICATION ICI : On force l'IP du PC
const API_BASE_URL = "http://172.20.10.2:8000";
const SEGMENT_ENDPOINT = `${API_BASE_URL}/segment`;
const OCR_ENDPOINT     = `${API_BASE_URL}/ocr`;

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner — BIBLIA-TECH" }] }),
  component: ScannerPage,
});

// ─── Types segmentation ───────────────────────────────────────────────────────

type BookInfo = {
  index: number;
  x: number; y: number; w: number; h: number;
};

type BookEntry = {
  originalIndex: number;
  crop: string;
  bbox: BookInfo;
  deleted: boolean;
};

type Timing = {
  yolo_ms?:         number;
  ocr_total_ms?:    number;
  ocr_per_book_ms?: number;
  total_ms:         number;
};

type SegmentationResult = {
  status: "success" | "error";
  book_count: number;
  etagere_id: number | null;
  image_base64: string;
  crops: string[];
  books_info: BookInfo[];
  timing?: Timing;
  message?: string;
};

// ─── Types OCR ────────────────────────────────────────────────────────────────

type OcrStatus = "correct" | "wrong_position" | "not_expected" | "unreadable";

type OcrBookResult = {
  position: number;
  titre: string;
  auteur: string;
  ocr_text: string;
  status: OcrStatus;
  expected_position: number | null;
  score: number;
  crop: string;
};

type OcrSummary = {
  total: number;
  correct: number;
  wrong_position: number;
  not_expected: number;
  unreadable: number;
};

type OcrResult = {
  status: "success" | "error";
  etagere_id: number | null;
  book_count: number;
  image_base64: string;
  results: OcrBookResult[];
  summary: OcrSummary;
  timing?: Timing;
  message?: string;
};

// ─── BookInspector ────────────────────────────────────────────────────────────

type BookInspectorProps = {
  book: BookEntry;
  onDelete: () => void;
  onRestore: () => void;
  onClose: () => void;
};

function BookInspector({ book, onDelete, onRestore, onClose }: BookInspectorProps) {
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
          <div className="flex items-center gap-2">
            <span className="font-semibold">Livre #{book.originalIndex + 1}</span>
            {book.deleted && (
              <Badge variant="destructive" className="text-xs">Supprimé</Badge>
            )}
          </div>
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
            className={`max-h-60 max-w-full object-contain rounded-lg shadow ${
              book.deleted ? "opacity-50 grayscale" : ""
            }`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t">
          {book.deleted ? (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Fermer
              </Button>
              <Button
                onClick={onRestore}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Restaurer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Garder
              </Button>
              <Button variant="destructive" onClick={onDelete} className="flex-1">
                <Trash2 className="h-4 w-4 mr-1.5" />
                Supprimer
              </Button>
            </>
          )}
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

// ─── OcrBookCard ──────────────────────────────────────────────────────────────

type OcrBookCardProps = { book: OcrBookResult };

function OcrBookCard({ book }: OcrBookCardProps) {
  const statusConfig: Record<OcrStatus, { label: string; colorClass: string; bgClass: string; icon: string }> = {
    correct:        { label: "Bien placé",    colorClass: "text-green-600 dark:text-green-400",   bgClass: "bg-green-500/10 border-green-500/40",   icon: "✅" },
    wrong_position: { label: "Mauvaise place",colorClass: "text-orange-500 dark:text-orange-400", bgClass: "bg-orange-500/10 border-orange-500/40",  icon: "⚠️" },
    not_expected:   { label: "Non reconnu",   colorClass: "text-red-600 dark:text-red-400",        bgClass: "bg-red-500/10 border-red-500/40",        icon: "❌" },
    unreadable:     { label: "Illisible",     colorClass: "text-muted-foreground",                 bgClass: "border-border",                          icon: "👻" },
  };
  const cfg = statusConfig[book.status];

  return (
    <Card className={`border ${cfg.bgClass}`}>
      <CardContent className="p-3 flex gap-3 items-start">
        {/* Miniature du crop */}
        <div className="w-14 shrink-0 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center min-h-[72px]">
          {book.crop ? (
            <img
              src={book.crop}
              alt={`Livre ${book.position}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Détails */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">#{book.position}</span>
            <span className={`text-xs font-semibold ${cfg.colorClass}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div className="text-sm font-semibold leading-tight truncate">{book.titre}</div>
          {book.auteur && (
            <div className="text-xs text-muted-foreground truncate">{book.auteur}</div>
          )}
          {book.status === "wrong_position" && book.expected_position !== null && (
            <div className="text-xs text-orange-500 mt-1">
              Attendu en position #{book.expected_position}
            </div>
          )}
          {book.ocr_text && book.status !== "correct" && (
            <div className="text-xs text-muted-foreground italic truncate">
              « {book.ocr_text} »
            </div>
          )}
          {book.score > 0 && (
            <div className="text-xs text-muted-foreground">Similarité : {book.score}%</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

function ScannerPage() {
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Segmentation state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview,      setPreview]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [result,       setResult]       = useState<SegmentationResult | null>(null);

  const [books,         setBooks]         = useState<BookEntry[]>([]);
  const [inspectedBook, setInspectedBook] = useState<BookEntry | null>(null);
  const [galleryOpen,   setGalleryOpen]   = useState(false);

  // OCR state
  const [ocrResult,   setOcrResult]   = useState<OcrResult | null>(null);
  const [ocrLoading,  setOcrLoading]  = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Metriques de performance (frontend)
  const [segMetrics, setSegMetrics] = useState<{ serverMs: number; networkMs: number; totalMs: number } | null>(null);
  const [ocrMetrics, setOcrMetrics] = useState<{ serverMs: number; networkMs: number; totalMs: number } | null>(null);

  // Compteurs dérivés
  const activeCount = books.filter((b) => !b.deleted).length;

  // Fausse progression OCR pendant l'attente
  useEffect(() => {
    if (!ocrLoading) return;
    const id = setInterval(() => {
      setOcrProgress((p) => (p < 88 ? p + Math.random() * 4 : p));
    }, 700);
    return () => clearInterval(id);
  }, [ocrLoading]);

  // ─── Handlers fichier ────────────────────────────────────────────────────

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setBooks([]);
    setOcrResult(null);
    setOcrProgress(0);
    setProgress(0);
    setSegMetrics(null);
    setOcrMetrics(null);
    e.target.value = "";
  };

  const analyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress(0);
    setResult(null);
    setBooks([]);
    setOcrResult(null);
    setOcrProgress(0);
    setSegMetrics(null);
    setOcrMetrics(null);

    const t0 = performance.now();
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
        const totalMs = Math.round(performance.now() - t0);
        if (data.timing) {
          setSegMetrics({
            serverMs:  data.timing.total_ms,
            networkMs: Math.max(0, totalMs - data.timing.total_ms),
            totalMs,
          });
        }
        setResult(data);
        setBooks(
          (data.books_info ?? []).map((info, i) => ({
            originalIndex: i,
            crop: data.crops[i] ?? "",
            bbox: info,
            deleted: false,
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

  // Construit le catalogue depuis localStorage et l'envoie au backend
  const buildCatalog = () => {
    const positions = getPositions();
    const livres = getLivres();
    const livresMap = new Map(livres.map((l) => [l.id, l]));
    return positions.map((p) => {
      const livre = livresMap.get(p.livre_id);
      return {
        position_index: p.position_index,
        etagere_id:     p.etagere_id,
        titre:          livre?.titre  ?? "",
        auteur:         livre?.auteur ?? "",
      };
    });
  };

  const analyzeOcr = async () => {
    if (!selectedFile) return;
    setOcrLoading(true);
    setOcrProgress(0);
    setOcrResult(null);
    setOcrMetrics(null);

    const t0 = performance.now();
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("catalog", JSON.stringify(buildCatalog()));

      const apiResponse = await fetch(OCR_ENDPOINT, { method: "POST", body: formData });
      const data: OcrResult = await apiResponse.json().catch(() => ({
        status: "error" as const,
        etagere_id: null,
        book_count: 0,
        image_base64: "",
        results: [],
        summary: { total: 0, correct: 0, wrong_position: 0, not_expected: 0, unreadable: 0 },
        message: `Erreur HTTP ${apiResponse.status}`,
      }));

      if (apiResponse.ok && data.status === "success") {
        const totalMs = Math.round(performance.now() - t0);
        if (data.timing) {
          setOcrMetrics({
            serverMs:  data.timing.total_ms,
            networkMs: Math.max(0, totalMs - data.timing.total_ms),
            totalMs,
          });
        }
        setOcrResult(data);
        setOcrProgress(100);
      } else {
        throw new Error(data.message || `Erreur API ${apiResponse.status}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("Erreur OCR:", msg);
      alert(`❌ ${msg}`);
    } finally {
      setOcrLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setBooks([]);
    setInspectedBook(null);
    setGalleryOpen(false);
    setProgress(0);
    setOcrResult(null);
    setOcrLoading(false);
    setOcrProgress(0);
    setSegMetrics(null);
    setOcrMetrics(null);
  };

  // ─── Supprimer / Restaurer ────────────────────────────────────────────────

  const deleteBook = (originalIndex: number) => {
    setBooks((prev) =>
      prev.map((b) => (b.originalIndex === originalIndex ? { ...b, deleted: true } : b))
    );
    setInspectedBook(null);
  };

  const restoreBook = (originalIndex: number) => {
    setBooks((prev) =>
      prev.map((b) => (b.originalIndex === originalIndex ? { ...b, deleted: false } : b))
    );
    setInspectedBook(null);
  };

  // ─── Galerie ─────────────────────────────────────────────────────────────

  const galleryBooks: GalleryBook[] = books.map((b) => ({
    id: b.originalIndex,
    crop: b.crop,
    deleted: b.deleted,
  }));

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
      <input ref={fileRef}   type="file" accept="image/*" hidden onChange={onPick} />

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

      {/* ─── Résultats segmentation ───────────────────────────────────────────── */}
      {result && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl font-bold">Résultats</h2>
            <Badge variant="outline" className="border-accent text-accent text-sm px-3 py-1">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              {activeCount} livre{activeCount > 1 ? "s" : ""} détecté{activeCount > 1 ? "s" : ""}
            </Badge>
          </div>

          <ShelfSummary bookCount={activeCount} etagereId={result.etagere_id} />

          {/* Image annotée + overlays cliquables */}
          {books.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun livre détecté. Vérifiez la qualité de l'image et réessayez.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={result.image_base64}
                    alt="Segmentation des livres par YOLO"
                    className="w-full block rounded-lg"
                    draggable={false}
                  />

                  {/* Overlay cliquable sur chaque livre */}
                  {(result.books_info ?? []).map((info) => {
                    const book = books.find((b) => b.originalIndex === info.index);
                    if (!book) return null;
                    const isActive = !book.deleted;

                    return (
                      <div
                        key={info.index}
                        onClick={() => setInspectedBook(book)}
                        style={{
                          position: "absolute",
                          left:   `${info.x * 100}%`,
                          top:    `${info.y * 100}%`,
                          width:  `${info.w * 100}%`,
                          height: `${info.h * 100}%`,
                        }}
                        className={`rounded cursor-pointer transition-all duration-200 ${
                          isActive
                            ? "hover:bg-white/15 hover:ring-2 hover:ring-white/60"
                            : "bg-red-500/30 ring-1 ring-red-400 hover:bg-red-500/45"
                        }`}
                        title={
                          isActive
                            ? `Livre #${info.index + 1} — cliquer pour inspecter`
                            : `Livre #${info.index + 1} — supprimé, cliquer pour restaurer`
                        }
                      >
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
                  Cliquez sur un livre pour l'inspecter ·{" "}
                  Les livres <span className="text-red-400">rouges</span> sont supprimés (cliquez pour restaurer)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Métriques de performance — segmentation */}
          {segMetrics && result?.timing && (
            <Card className="border-muted bg-muted/10">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Performances — Segmentation
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-background/70 border p-2.5">
                    <div className="text-lg font-bold">{result.timing.yolo_ms ?? "—"} ms</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Inférence YOLO</div>
                  </div>
                  <div className="rounded-lg bg-background/70 border p-2.5">
                    <div className="text-lg font-bold">{segMetrics.serverMs} ms</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Traitement serveur</div>
                  </div>
                  <div className="rounded-lg bg-background/70 border p-2.5">
                    <div className="text-lg font-bold">{segMetrics.networkMs} ms</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Latence réseau</div>
                  </div>
                </div>
                <div className="mt-2.5 rounded-lg bg-accent/10 border border-accent/30 p-2.5 text-center">
                  <div className="text-lg font-bold text-accent">{segMetrics.totalMs} ms</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Durée totale (frontend)</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3">
            {books.length > 0 && (
              <Button
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setGalleryOpen(true)}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Gérer la segmentation
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeCount}
                  {books.length - activeCount > 0 && (
                    <span className="text-red-400 ml-1">+{books.length - activeCount}🗑</span>
                  )}
                </Badge>
              </Button>
            )}

            {books.length > 0 && !ocrLoading && (
              <Button
                onClick={analyzeOcr}
                disabled={ocrLoading}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Eye className="mr-2 h-4 w-4" />
                Analyser les titres
              </Button>
            )}

            <Button variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Scanner une autre image
            </Button>
          </div>
        </section>
      )}

      {/* ─── Résultats OCR ───────────────────────────────────────────────────── */}
      {(ocrLoading || ocrResult) && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <h2 className="font-display text-2xl font-bold">Analyse des titres</h2>

          {/* Barre de progression OCR */}
          {ocrLoading && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  Lecture OCR en cours… {Math.round(ocrProgress)}%
                </div>
                <Progress value={ocrProgress} className="[&>div]:bg-emerald-600" />
                <div className="text-xs text-muted-foreground">
                  PaddleOCR analyse chaque tranche et compare à la base de données…
                </div>
              </CardContent>
            </Card>
          )}

          {/* Résultats */}
          {ocrResult && (
            <>
              {/* Résumé en 4 cartes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    { key: "correct"        as const, label: "Bien placés",  icon: "✅", colorClass: "text-green-600 dark:text-green-400",   bgClass: "bg-green-500/10 border-green-500/40"   },
                    { key: "wrong_position" as const, label: "Mal placés",   icon: "⚠️", colorClass: "text-orange-500 dark:text-orange-400", bgClass: "bg-orange-500/10 border-orange-500/40" },
                    { key: "not_expected"   as const, label: "Non reconnus", icon: "❌", colorClass: "text-red-600 dark:text-red-400",        bgClass: "bg-red-500/10 border-red-500/40"       },
                    { key: "unreadable"     as const, label: "Illisibles",   icon: "👻", colorClass: "text-muted-foreground",                 bgClass: "border-border"                         },
                  ] satisfies { key: keyof OcrSummary; label: string; icon: string; colorClass: string; bgClass: string }[]
                ).map(({ key, label, icon, colorClass, bgClass }) => (
                  <Card key={key} className={`border ${bgClass}`}>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className={`text-xl font-bold ${colorClass}`}>
                        {ocrResult.summary[key]}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Image annotée */}
              {ocrResult.image_base64 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <img
                      src={ocrResult.image_base64}
                      alt="Résultat analyse OCR"
                      className="w-full block rounded-lg"
                      draggable={false}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      <span className="text-green-500 font-medium">Vert</span> : bien placé ·{" "}
                      <span className="text-orange-400 font-medium">Orange</span> : mauvaise place ·{" "}
                      <span className="text-red-500 font-medium">Rouge</span> : non reconnu ·{" "}
                      <span className="text-muted-foreground font-medium">Gris</span> : illisible
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Liste détaillée par livre */}
              {ocrResult.results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Détail par livre
                  </p>
                  <div className="grid gap-2">
                    {ocrResult.results.map((book) => (
                      <OcrBookCard key={book.position} book={book} />
                    ))}
                  </div>
                </div>
              )}

              {/* Métriques de performance — OCR */}
              {ocrMetrics && ocrResult.timing && (
                <Card className="border-muted bg-muted/10">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Performances — OCR
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-lg bg-background/70 border p-2.5">
                        <div className="text-lg font-bold">{ocrResult.timing.yolo_ms ?? "—"} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Inférence YOLO</div>
                      </div>
                      <div className="rounded-lg bg-background/70 border p-2.5">
                        <div className="text-lg font-bold">{ocrResult.timing.ocr_total_ms ?? "—"} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">OCR total</div>
                      </div>
                      <div className="rounded-lg bg-background/70 border p-2.5">
                        <div className="text-lg font-bold">{ocrResult.timing.ocr_per_book_ms ?? "—"} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">OCR / livre</div>
                      </div>
                      <div className="rounded-lg bg-background/70 border p-2.5">
                        <div className="text-lg font-bold">{ocrMetrics.networkMs} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Latence réseau</div>
                      </div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-lg bg-background/70 border p-2.5">
                        <div className="text-lg font-bold">{ocrMetrics.serverMs} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Traitement serveur total</div>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5">
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{ocrMetrics.totalMs} ms</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Durée totale (frontend)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </section>
      )}

      {/* Inspecteur (clic sur overlay de l'image segmentée) */}
      {inspectedBook && (
        <BookInspector
          book={inspectedBook}
          onClose={() => setInspectedBook(null)}
          onDelete={() => deleteBook(inspectedBook.originalIndex)}
          onRestore={() => restoreBook(inspectedBook.originalIndex)}
        />
      )}

      {/* Galerie plein écran */}
      {galleryOpen && books.length > 0 && (
        <BookGallery
          books={galleryBooks}
          onDelete={(id) => deleteBook(id)}
          onRestore={(id) => restoreBook(id)}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
