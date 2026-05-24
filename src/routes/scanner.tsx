import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Upload, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ✅ Import de la configuration API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const SEGMENT_ENDPOINT = `${API_BASE_URL}/segment`;

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner — BIBLIA-TECH" }] }),
  component: ScannerPage,
});

type DetectedBook = {
  book_id: string;
  image_base64: string;
  width: number;
  height: number;
};

type AnalysisResult = {
  status: "success" | "error";
  books_count: number;
  books: DetectedBook[];
  error?: string;
};

const mockResult: AnalysisResult = {
  status: "success",
  books_count: 2,
  books: [
    { book_id: "book_1", image_base64: "", width: 150, height: 250 },
    { book_id: "book_2", image_base64: "", width: 160, height: 240 },
  ],
};

function ScannerPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const analyze = async () => {
    if (!preview) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      // 1. Récupérer le fichier depuis le preview
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      // 2. Créer FormData pour l'API
      const formData = new FormData();
      formData.append("file", file);

      // 3. Envoyer au backend FastAPI /segment
      setProgress(25);
      const apiResponse = await fetch(SEGMENT_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error(`Erreur API: ${apiResponse.status}`);
      }

      setProgress(70);
      const data: AnalysisResult = await apiResponse.json();
      
      if (data.status === "success") {
        setResult(data);
      } else {
        throw new Error(data.error || "Erreur lors de la segmentation");
      }

      setProgress(100);
    } catch (error: any) {
      console.error("Erreur segmentation:", error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setPreview(null); setResult(null); setProgress(0); };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Scanner</h1>
        <p className="text-muted-foreground mt-1">Analysez l'ordre d'une étagère via une photo.</p>
      </header>

      {!preview && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => cameraRef.current?.click()}>
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
          <Card className="cursor-pointer hover:border-accent transition-colors" onClick={() => fileRef.current?.click()}>
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

      {preview && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              <img src={preview} alt="aperçu étagère" className="w-full h-full object-cover" />
              <button onClick={reset} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background">
                <X className="h-4 w-4" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Analyse en cours… {progress}%
                </div>
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">
                  Détection ArUco → YOLOv11 → OCR → Vérification de l'ordre
                </div>
              </div>
            ) : (
              <Button onClick={analyze} size="lg" className="w-full bg-primary">
                <ScanLine className="mr-2 h-5 w-5" /> Lancer l'analyse
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <section className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-2xl font-bold">Résultats Segmentation</h2>
            <Badge variant="outline" className="border-accent text-accent">
              {result.books_count} livre(s) détecté(s)
            </Badge>
          </div>

          {result.books_count === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun livre détecté. Vérifiez l'image et réessayez.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.books.map((book, idx) => (
                <Card key={book.book_id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {book.image_base64 && (
                      <div className="relative rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={`data:image/png;base64,${book.image_base64}`} 
                          alt={`Livre ${idx + 1}`}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Livre #{idx + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {book.book_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Taille: {book.width}x{book.height}px
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
