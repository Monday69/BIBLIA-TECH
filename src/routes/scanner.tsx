import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Upload, Loader2, ScanLine, CheckCircle2, ArrowRight, Shuffle, PackageOpen, AlertOctagon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner — BIBLIA-TECH" }] }),
  component: ScannerPage,
});

type DetectedBook = {
  position: number;
  title: string;
  score: number;
  status: "ok" | "misplaced" | "intruder";
  targetPosition?: number;
};

type AnalysisResult = {
  shelfId: string;
  books: DetectedBook[];
  summary: { ok: number; misplaced: number; missing: number; intruders: number };
};

const mockResult: AnalysisResult = {
  shelfId: "ArUco-E2",
  books: [
    { position: 1, title: "Notre-Dame de Paris", score: 0.96, status: "ok" },
    { position: 2, title: "Bel-Ami", score: 0.71, status: "misplaced", targetPosition: 3 },
    { position: 3, title: "Germinal", score: 0.88, status: "misplaced", targetPosition: 2 },
    { position: 4, title: "Inconnu — Roman policier", score: 0.42, status: "intruder" },
  ],
  summary: { ok: 1, misplaced: 2, missing: 1, intruders: 1 },
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
    setLoading(true);
    setProgress(0);
    setResult(null);
    const steps = [20, 45, 70, 90, 100];
    for (const p of steps) {
      await new Promise((r) => setTimeout(r, 450));
      setProgress(p);
    }
    setResult(mockResult);
    setLoading(false);
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
            <h2 className="font-display text-2xl font-bold">Résultats</h2>
            <Badge variant="outline" className="border-accent text-accent">
              Étagère détectée : {result.shelfId}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={CheckCircle2} label="OK" value={result.summary.ok} color="success" />
            <SummaryCard icon={Shuffle} label="Mal placés" value={result.summary.misplaced} color="warning" />
            <SummaryCard icon={PackageOpen} label="Manquants" value={result.summary.missing} color="muted" />
            <SummaryCard icon={AlertOctagon} label="Intrus" value={result.summary.intruders} color="destructive" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Livres détectés</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {result.books.map((b) => (
                <div key={b.position} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 rounded-md bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center">
                    {b.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b.title}</div>
                    {b.status === "misplaced" && b.targetPosition && (
                      <div className="text-xs text-warning flex items-center gap-1 mt-0.5">
                        Position {b.position} <ArrowRight className="h-3 w-3" /> {b.targetPosition}
                      </div>
                    )}
                    {b.status === "intruder" && (
                      <div className="text-xs text-destructive mt-0.5">Livre intrus</div>
                    )}
                  </div>
                  <ScoreBadge score={b.score} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const cls =
    score >= 0.8 ? "bg-success text-success-foreground" :
    score >= 0.6 ? "bg-warning text-warning-foreground" :
    "bg-destructive text-destructive-foreground";
  return <Badge className={cls}>{pct}%</Badge>;
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: "success" | "warning" | "destructive" | "muted" }) {
  const colorMap = {
    success: "text-success bg-success/15",
    warning: "text-warning bg-warning/20",
    destructive: "text-destructive bg-destructive/15",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-display text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
