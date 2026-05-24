import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Camera, Upload, Loader2, ScanLine, X, RotateCcw,
  CheckCircle2, AlertTriangle, HelpCircle, BookOpen, LayoutGrid,
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

// Type aligné sur la réponse du backend
type SegmentationResult = {
  status: "success" | "error";
  book_count: number;
  etagere_id: number | null;
  image_base64: string;
  crops: string[];      // images individuelles redressées de chaque livre
  message?: string;
};

// ─── Composant résumé étagère ─────────────────────────────────────────────────

type ShelfSummaryProps = {
  result: SegmentationResult;
};

function ShelfSummary({ result }: ShelfSummaryProps) {
  const { book_count, etagere_id } = result;

  // Cas : aucun marqueur ArUco détecté
  if (etagere_id === null) {
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
              <span className="font-medium">{book_count} livre(s)</span> ont tout de même été détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cas : base de données vide / non importée
  if (!hasData()) {
    return (
      <Card className="border-blue-500/40 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              Étagère #{etagere_id} détectée
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Aucune base de données importée. Importez votre fichier .db dans la
              section <span className="font-medium">Bibliothèque</span> pour comparer le stock attendu.
              <br />
              <span className="font-medium">{book_count} livre(s)</span> détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cas : base présente → chercher l'étagère
  const etagere: Etagere | undefined = getEtageres().find((e) => e.id === etagere_id);

  if (!etagere) {
    return (
      <Card className="border-orange-500/40 bg-orange-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-orange-600 dark:text-orange-400">
              Étagère #{etagere_id} introuvable dans la base
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              Le marqueur ArUco indique l'étagère #{etagere_id}, mais elle n'existe pas
              dans la base importée.
              <br />
              <span className="font-medium">{book_count} livre(s)</span> ont été détectés.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cas nominal : comparaison livres détectés vs attendus
  const attendus = etagere.nb_livres_attendus;
  const isOk = book_count === attendus;
  const diff = book_count - attendus;

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
            className={isOk
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
              {book_count}
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
  const [galleryOpen, setGalleryOpen] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setProgress(0);
    e.target.value = "";
  };

  const analyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setProgress(20);
      const apiResponse = await fetch(SEGMENT_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      setProgress(75);

      const data: SegmentationResult = await apiResponse.json().catch(() => ({
        status: "error" as const,
        book_count: 0,
        etagere_id: null,
        image_base64: "",
        message: `Erreur HTTP ${apiResponse.status}`,
      }));

      setProgress(100);

      if (apiResponse.ok && data.status === "success") {
        setResult(data);
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
    setProgress(0);
    setGalleryOpen(false);
  };

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
              <img
                src={preview}
                alt="aperçu étagère"
                className="w-full object-contain max-h-[480px]"
              />
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
                <div className="text-xs text-muted-foreground">
                  Détection ArUco + segmentation YOLO…
                </div>
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
              {result.book_count} livre{result.book_count > 1 ? "s" : ""} détecté{result.book_count > 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Résumé étagère + comparaison stock */}
          <ShelfSummary result={result} />

          {/* Image annotée par YOLO */}
          {result.book_count === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun livre détecté. Vérifiez la qualité de l'image et réessayez.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <img
                  src={result.image_base64}
                  alt="Segmentation des livres par YOLO"
                  className="w-full rounded-lg object-contain"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Chaque livre est numéroté et encadré par le modèle YOLO
                </p>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3">
            {result.crops.length > 0 && (
              <Button
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setGalleryOpen(true)}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Gérer la segmentation
                <Badge variant="secondary" className="ml-2 text-xs">
                  {result.crops.length}
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

      {/* Galerie plein écran */}
      {galleryOpen && result && result.crops.length > 0 && (
        <BookGallery
          crops={result.crops}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
