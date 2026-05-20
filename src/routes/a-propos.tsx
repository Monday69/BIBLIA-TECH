import { createFileRoute } from "@tanstack/react-router";
import { Camera, QrCode, Brain, ScanText, GitCompareArrows, CheckCircle2, ArrowRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/a-propos")({
  head: () => ({ meta: [{ title: "À propos — BIBLIA-TECH" }] }),
  component: AProposPage,
});

const steps = [
  { icon: Camera, label: "Photo" },
  { icon: QrCode, label: "ArUco" },
  { icon: Brain, label: "YOLOv11" },
  { icon: ScanText, label: "OCR" },
  { icon: GitCompareArrows, label: "Matching" },
  { icon: CheckCircle2, label: "Vérification" },
];

const stack = ["YOLOv11", "PaddleOCR", "ArUco", "FastAPI", "React", "TypeScript", "Tailwind"];

function AProposPage() {
  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">À propos</h1>
        <p className="text-muted-foreground mt-1">Le projet derrière BIBLIA-TECH.</p>
      </header>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm lg:text-base leading-relaxed text-foreground/90">
            <strong>BIBLIATECH</strong> est un projet de fin de 2ème année cycle ingénieur IA.
            Il utilise <strong>YOLOv11</strong>, <strong>PaddleOCR</strong> et des marqueurs
            <strong> ArUco</strong> pour vérifier automatiquement l'ordre des livres en bibliothèque.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2 lg:gap-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2 lg:gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-12 w-12 lg:h-14 lg:w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <s.icon className="h-5 w-5 lg:h-6 lg:w-6" />
                  </div>
                  <div className="text-[11px] lg:text-xs font-medium">{s.label}</div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-accent shrink-0" />}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Stack technique</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stack.map((t) => (
              <Badge key={t} variant="outline" className="border-accent/40 text-foreground">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Équipe</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {["Étudiant·e IA — 2A", "Étudiant·e IA — 2A"].map((name, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground font-semibold flex items-center justify-center">
                {name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">Cycle ingénieur</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
