import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, BookPlus, HandCoins, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { books as initialBooks, shelves, loans as initialLoans, type Book, type Loan } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/gestion")({
  head: () => ({ meta: [{ title: "Gestion — BIBLIA-TECH" }] }),
  component: GestionPage,
});

function GestionPage() {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loans, setLoans] = useState<Loan[]>(initialLoans);

  // Add form
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [shelfId, setShelfId] = useState(shelves[0].id);
  const [position, setPosition] = useState("");

  // Delete
  const [deleteId, setDeleteId] = useState<string>("");

  // Loan
  const [loanBookId, setLoanBookId] = useState<string>("");
  const [borrower, setBorrower] = useState("");

  const addBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !position) return;
    const b: Book = { id: `b${Date.now()}`, title, author, shelfId, position: Number(position) };
    setBooks((x) => [...x, b]);
    setTitle(""); setAuthor(""); setPosition("");
    toast.success("Livre ajouté", { description: b.title });
  };

  const deleteBook = () => {
    if (!deleteId) return;
    const b = books.find((x) => x.id === deleteId);
    setBooks((x) => x.filter((b) => b.id !== deleteId));
    setDeleteId("");
    toast.success("Livre supprimé", { description: b?.title });
  };

  const recordLoan = () => {
    if (!loanBookId || !borrower) return;
    const b = books.find((x) => x.id === loanBookId);
    if (!b) return;
    setLoans((x) => [...x, { id: `l${Date.now()}`, bookId: b.id, bookTitle: b.title, borrower, borrowedAt: new Date().toISOString().slice(0, 10) }]);
    setLoanBookId(""); setBorrower("");
    toast.success("Emprunt enregistré");
  };

  const returnLoan = (id: string) => {
    setLoans((x) => x.filter((l) => l.id !== id));
    toast.success("Livre rendu");
  };

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Gestion</h1>
        <p className="text-muted-foreground mt-1">Ajoutez, supprimez et gérez les emprunts.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BookPlus className="h-4 w-4 text-accent" /> Ajouter un livre</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addBook} className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="L'Étranger" required />
            </div>
            <div className="space-y-1.5">
              <Label>Auteur</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Albert Camus" required />
            </div>
            <div className="space-y-1.5">
              <Label>Étagère</Label>
              <Select value={shelfId} onValueChange={setShelfId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shelves.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input type="number" min="1" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="1" required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" /> Supprimer un livre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={deleteId} onValueChange={setDeleteId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un livre…" /></SelectTrigger>
            <SelectContent>
              {books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} — {b.author}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="destructive" onClick={deleteBook} disabled={!deleteId}>
            <Trash2 className="mr-2 h-4 w-4" /> Confirmer la suppression
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><HandCoins className="h-4 w-4 text-accent" /> Emprunts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            {loans.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">Aucun emprunt en cours.</div>
            ) : loans.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{l.bookTitle}</div>
                  <div className="text-xs text-muted-foreground">par {l.borrower} • emprunté le {l.borrowedAt}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => returnLoan(l.id)}>
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Rendu
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="text-sm font-medium">Enregistrer un emprunt</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Select value={loanBookId} onValueChange={setLoanBookId}>
                <SelectTrigger><SelectValue placeholder="Livre…" /></SelectTrigger>
                <SelectContent>
                  {books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Nom de l'emprunteur" value={borrower} onChange={(e) => setBorrower(e.target.value)} />
            </div>
            <Button onClick={recordLoan} disabled={!loanBookId || !borrower}>
              <Plus className="mr-2 h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
