import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { books, shelves } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — BIBLIA-TECH" }] }),
  component: BibliothequePage,
});

function BibliothequePage() {
  const [shelfId, setShelfId] = useState(shelves[0].id);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }, [query]);

  const shelfBooks = books.filter((b) => b.shelfId === shelfId).sort((a, b) => a.position - b.position);

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Bibliothèque</h1>
        <p className="text-muted-foreground mt-1">Explorez vos étagères et retrouvez un ouvrage.</p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un livre ou un auteur…"
          className="pl-10 h-11"
        />
      </div>

      {query.trim() ? (
        <section className="space-y-2">
          <div className="text-sm text-muted-foreground">{filtered.length} résultat(s)</div>
          {filtered.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucun livre trouvé.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const shelf = shelves.find((s) => s.id === b.shelfId);
                return (
                  <Card key={b.id}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{b.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.author}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{shelf?.name}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">Position {b.position}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Shelf chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
            {shelves.map((s) => (
              <button
                key={s.id}
                onClick={() => setShelfId(s.id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                  shelfId === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-accent"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {shelfBooks.map((b) => (
                <div key={b.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 rounded-md bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center">
                    {b.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.author}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
