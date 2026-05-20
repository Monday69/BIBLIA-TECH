import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, BookOpen, Library, Clock, CheckCircle2, AlertCircle, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { books, shelves, scanHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — BIBLIA-TECH" },
      { name: "description", content: "Vérifiez l'ordre de vos livres en un instant grâce à l'IA." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const lastScan = scanHistory[0];
  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl p-8 lg:p-12 text-primary-foreground"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 backdrop-blur px-3 py-1 text-xs font-medium text-accent mb-4">
            <BookMarked className="h-3.5 w-3.5" /> BIBLIA-TECH
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            Vérifiez l'ordre de vos livres en un instant
          </h1>
          <p className="mt-3 text-primary-foreground/80 text-base lg:text-lg">
            Une vision par ordinateur au service de votre bibliothèque.
          </p>
          <Button asChild size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/scanner">
              <ScanLine className="mr-2 h-5 w-5" />
              Scanner une étagère
            </Link>
          </Button>
        </div>
        <div className="hidden lg:block absolute -right-10 -bottom-10 opacity-10">
          <BookOpen className="h-72 w-72" />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard icon={BookOpen} label="Livres" value={books.length} />
        <StatCard icon={Library} label="Étagères" value={shelves.length} />
        <StatCard icon={Clock} label="Dernier scan" value={lastScan.date} className="col-span-2 lg:col-span-1" />
      </section>

      {/* History */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Historique récent</h2>
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {scanHistory.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${s.status === "ok" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {s.status === "ok" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{s.shelfName}</div>
                    <div className="text-xs text-muted-foreground">{s.date}</div>
                  </div>
                </div>
                <Badge variant={s.status === "ok" ? "default" : "destructive"} className={s.status === "ok" ? "bg-success text-success-foreground" : ""}>
                  {s.status === "ok" ? "OK" : "Erreur"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: string | number; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl lg:text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
