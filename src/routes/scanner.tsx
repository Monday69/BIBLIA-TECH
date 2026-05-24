import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Upload, Loader2, ScanLine, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SEGMENT_ENDPOINT = `${API_BASE_URL}/segment`;

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner — BIBLIA-TECH" }] }),
  component: ScannerPage,
});

// Type qui correspond exactement à ce que retourne le backend
type SegmentationResult = {
  status: "success" | "error";
  book_count: number;
  image_base64: string; // image complète annotée par YOLO
  message?: string;
};

function ScannerPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SegmentationResult | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setProgress(0);
    // Réinitialise l'input pour permettre de re-sélectionner le même fichier
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

      if (!apiResponse.ok) {
        throw new Error(`Erreur API: ${apiResponse.status}`);
      }

      const data: SegmentationResult = await apiResponse.json();

      setProgress(100);

      if (data.status === "success") {
        setResult(data);
      } else {
        throw new Error(data.message || "Erreur lors de la segmentation");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("Erreur segmentation:", msg);
      alert(`❌ Erreur: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Scanner</h1>
        <p className="text-muted-foreground mt-1">
          Photographiez une étagère et le modèle YOLO segmente chaque livre automatiquement.
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
                  Analyse avec le modèle YOLO en cours…
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

      {/* Résultats : image annotée par YOLO */}
      {result && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl font-bold">Résultats</h2>
            <Badge variant="outline" className="border-accent text-accent text-sm px-3 py-1">
              {result.book_count} livre{result.book_count > 1 ? "s" : ""} détecté{result.book_count > 1 ? "s" : ""}
            </Badge>
          </div>

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
                  Chaque livre est numéroté et entouré par le modèle YOLO
                </p>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={reset} className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Scanner une autre image
          </Button>
        </section>
      )}
    </div>
  );
}
