import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Save,
  FolderOpen,
  GripVertical,
  Eraser,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getEtageres,
  getLivres,
  getLivresByEtagere,
  getPositions,
  addEtagere,
  updateEtagere,
  deleteEtagere,
  addLivre,
  updateLivre,
  deleteLivre,
  moveLivreEtagere,
  countLivresByEtagere,
  reorderLivres,
  clearAll,
  importFromSQLiteFile,
  importFromFilePicker,
  exportToSQLiteFile,
  saveToFilePicker,
  hasWriteHandle,
  type Etagere,
  type LivrePositionne,
} from "@/lib/ConnecBase";

export const Route = createFileRoute("/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — BIBLIA-TECH" }] }),
  component: BibliothequePage,
});

// ─── Types dialogs ────────────────────────────────────────────────────────────

type DialogState =
  | { type: "none" }
  | { type: "add-livre" }
  | { type: "edit-livre"; item: LivrePositionne }
  | { type: "delete-livre"; item: LivrePositionne }
  | { type: "add-etagere" }
  | { type: "edit-etagere"; item: Etagere }
  | { type: "delete-etagere"; item: Etagere }
  | { type: "clear-all" }
  | { type: "save-options" }
  | { type: "shelf-full"; etagere: Etagere; currentCount: number; pendingAction: () => void };

// ─── Dialog Livre ─────────────────────────────────────────────────────────────

function LivreDialogContent({
  etageres,
  defaultEtagereId,
  initial,
  onClose,
  onSave,
}: {
  etageres: Etagere[];
  defaultEtagereId: number;
  initial?: LivrePositionne | null;
  onClose: () => void;
  onSave: (titre: string, auteur: string, etagereId: number) => void;
}) {
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [auteur, setAuteur] = useState(initial?.auteur ?? "");
  const [etagereId, setEtagereId] = useState(
    initial?.etagere_id ?? defaultEtagereId,
  );

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {initial ? "Modifier le livre" : "Ajouter un livre"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="lv-titre">Titre *</Label>
          <Input
            id="lv-titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Titre du livre"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lv-auteur">Auteur</Label>
          <Input
            id="lv-auteur"
            value={auteur}
            onChange={(e) => setAuteur(e.target.value)}
            placeholder="Nom de l'auteur"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lv-etagere">Étagère</Label>
          <select
            id="lv-etagere"
            value={etagereId}
            onChange={(e) => setEtagereId(Number(e.target.value))}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {etageres.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!titre.trim()}
          onClick={() => onSave(titre.trim(), auteur.trim(), etagereId)}
        >
          {initial ? "Enregistrer" : "Ajouter"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Dialog Étagère ───────────────────────────────────────────────────────────

function EtagereDialogContent({
  initial,
  onClose,
  onSave,
}: {
  initial?: Etagere | null;
  onClose: () => void;
  onSave: (label: string, nb: number) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [nb, setNb] = useState(String(initial?.nb_livres_attendus ?? 0));

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {initial ? "Modifier l'étagère" : "Nouvelle étagère"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="et-label">Nom *</Label>
          <Input
            id="et-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex : Romans, Section A…"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="et-nb">Capacité (livres attendus)</Label>
          <Input
            id="et-nb"
            type="number"
            min={0}
            value={nb}
            onChange={(e) => setNb(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          disabled={!label.trim()}
          onClick={() => onSave(label.trim(), Number(nb) || 0)}
        >
          {initial ? "Enregistrer" : "Créer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

function BibliothequePage() {
  const [rev, setRev] = useState(0);
  const refresh = () => setRev((r) => r + 1);

  const etageres = useMemo(() => getEtageres(), [rev]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const activeId = selectedId ?? etageres[0]?.id ?? null;
  const activeEtagere = etageres.find((e) => e.id === activeId) ?? null;

  const shelfBooks = useMemo(
    () => (activeId !== null ? getLivresByEtagere(activeId) : []),
    [rev, activeId],
  );

  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const close = () => setDialog({ type: "none" });

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const handleDrop = (targetId: number) => {
    if (!draggedId || draggedId === targetId || activeId === null) return;
    const ids = shelfBooks.map((b) => b.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    const newIds = [...ids];
    newIds.splice(from, 1);
    newIds.splice(to, 0, draggedId);
    reorderLivres(activeId, newIds);
    setDraggedId(null);
    setDragOverId(null);
    refresh();
  };

  // ── Recherche ────────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const positions = getPositions();
    return getLivres()
      .filter(
        (l) =>
          l.titre.toLowerCase().includes(q) ||
          l.auteur.toLowerCase().includes(q),
      )
      .map((l) => {
        const pos = positions.find((p) => p.livre_id === l.id);
        const shelf = etageres.find((e) => e.id === pos?.etagere_id);
        return { ...l, shelfLabel: shelf?.label ?? "—" };
      });
  }, [rev, query, etageres]);

  const isEmpty = etageres.length === 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveToFile = async () => {
    close();
    setExporting(true);
    try {
      await saveToFilePicker("databaseLibrairie.db");
      toast.success("Fichier mis à jour avec succès !");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Annulé par l'utilisateur, ne rien faire
      } else if (err?.message?.includes("non supportée")) {
        toast.error("Votre navigateur ne supporte pas cette fonction. Utilisez Chrome ou Edge.");
      } else if (err?.message?.includes("refusée")) {
        toast.error("Permission d'écriture refusée. Autorisez l'accès au fichier dans la fenêtre du navigateur.");
      } else {
        console.error(err);
        toast.error("Erreur lors de l'enregistrement : " + (err?.message ?? "inconnue"));
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    close();
    setExporting(true);
    try {
      await exportToSQLiteFile("databaseLibrairie.db");
      toast.success("Fichier téléchargé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du téléchargement.");
    } finally {
      setExporting(false);
    }
  };

  // Fallback pour les navigateurs sans File System Access API (Firefox)
  const handleImportFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importFromSQLiteFile(file);
      setSelectedId(null);
      refresh();
      toast.success("Base importée ! (Enregistrement direct indisponible sur ce navigateur.)");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Impossible d'importer la base.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // Import principal via showOpenFilePicker (Chrome/Edge) — stocke le dossier source
  const handleImport = async () => {
    setImporting(true);
    try {
      await importFromFilePicker();
      setSelectedId(null);
      refresh();
      toast.success("Base de données importée avec succès !");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // Annulé par l'utilisateur
      } else if (err?.message === "NOT_SUPPORTED") {
        // Firefox → ouvrir le sélecteur classique
        document.getElementById("import-fallback-input")?.click();
      } else {
        console.error(err);
        toast.error(err?.message ?? "Impossible d'importer la base.");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleSaveLivre = (titre: string, auteur: string, etagereId: number) => {
    // Capturer l'état du dialog avant de le modifier
    const isEditing = dialog.type === "edit-livre";
    const editItem = dialog.type === "edit-livre" ? dialog.item : null;

    // Action réelle à exécuter (avec ou sans blocage)
    const doAction = () => {
      if (isEditing && editItem) {
        updateLivre(editItem.id, { titre, auteur });
        if (editItem.etagere_id !== etagereId) {
          moveLivreEtagere(editItem.id, etagereId);
        }
        toast.success("Livre mis à jour.");
      } else {
        addLivre(titre, auteur, etagereId);
        toast.success("Livre ajouté !");
      }
      close();
      refresh();
    };

    // Vérifier si l'étagère cible est pleine
    const etagere = etageres.find((e) => e.id === etagereId);
    const currentCount = countLivresByEtagere(etagereId);
    const isFull =
      etagere &&
      etagere.nb_livres_attendus > 0 &&
      currentCount >= etagere.nb_livres_attendus;

    if (isFull && etagere) {
      // Bloquer et proposer d'agrandir
      setDialog({ type: "shelf-full", etagere, currentCount, pendingAction: doAction });
      return;
    }

    doAction();
  };

  const handleShelfFullConfirm = () => {
    if (dialog.type !== "shelf-full") return;
    const { etagere, pendingAction } = dialog;
    // Augmenter la capacité de 1 puis exécuter l'action en attente
    updateEtagere(etagere.id, {
      nb_livres_attendus: etagere.nb_livres_attendus + 1,
    });
    pendingAction(); // contient déjà close() + refresh()
  };

  const handleDeleteLivre = () => {
    if (dialog.type !== "delete-livre") return;
    deleteLivre(dialog.item.id);
    close();
    refresh();
    toast.success("Livre supprimé.");
  };

  const handleSaveEtagere = (label: string, nb: number) => {
    if (dialog.type === "edit-etagere") {
      updateEtagere(dialog.item.id, { label, nb_livres_attendus: nb });
      toast.success("Étagère mise à jour.");
    } else {
      addEtagere(label, nb);
      toast.success("Étagère créée !");
    }
    close();
    refresh();
  };

  const handleDeleteEtagere = () => {
    if (dialog.type !== "delete-etagere") return;
    deleteEtagere(dialog.item.id);
    if (activeId === dialog.item.id) setSelectedId(null);
    close();
    refresh();
    toast.success("Étagère supprimée.");
  };

  const handleClearAll = () => {
    clearAll();
    setSelectedId(null);
    close();
    refresh();
    toast.success("Bibliothèque supprimée.");
  };

  const deleteLivreItem = dialog.type === "delete-livre" ? dialog.item : null;
  const deleteEtagereItem =
    dialog.type === "delete-etagere" ? dialog.item : null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto space-y-6">

      {/* En-tête */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold">
              Bibliothèque
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos étagères et vos livres.
            </p>
          </div>
        </div>

        {/* Boutons d'action — ligne dédiée, scroll horizontal sur mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {/* Fallback input pour Firefox */}
          <input
            id="import-fallback-input"
            type="file"
            accept=".sqlite,.db,.sqlite3"
            className="hidden"
            onChange={handleImportFallback}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={importing}
            className="shrink-0"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {importing ? "Import…" : "Importer"}
          </Button>
          <Button
            size="sm"
            onClick={() => setDialog({ type: "add-etagere" })}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Étagère
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialog({ type: "save-options" })}
            disabled={exporting || isEmpty}
            className="shrink-0"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {exporting ? "Enreg…" : "Enregistrer"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDialog({ type: "clear-all" })}
            className="shrink-0"
          >
            <Eraser className="h-4 w-4 mr-1.5" />
            <span className="sm:hidden">Supprimer</span>
            <span className="hidden sm:inline">Supprimer bibliothèque</span>
          </Button>
        </div>
      </header>

      {/* État vide */}
      {isEmpty ? (
        <Card>
          <CardContent className="py-20 text-center space-y-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium text-lg">Aucune donnée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importez votre base SQLite ou créez une étagère pour commencer.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un titre ou un auteur…"
              className="pl-10 h-11"
            />
          </div>

          {query.trim() ? (
            /* Résultats de recherche */
            <section className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} résultat(s)
              </p>
              {searchResults.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Aucun livre trouvé.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((l) => (
                    <Card key={l.id}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {l.titre}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {l.auteur || "—"}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {l.shelfLabel}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {/* ── Sélecteur d'étagère ── */}
              <div className="flex items-center gap-2">
                <Select
                  value={activeId !== null ? String(activeId) : ""}
                  onValueChange={(v) => setSelectedId(Number(v))}
                >
                  <SelectTrigger className="flex-1 sm:w-64 sm:flex-none">
                    <SelectValue placeholder="Choisir une étagère" />
                  </SelectTrigger>
                  <SelectContent>
                    {etageres.map((e) => {
                      const count = getPositions().filter(
                        (p) => p.etagere_id === e.id,
                      ).length;
                      return (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.label}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {count}
                            {e.nb_livres_attendus > 0
                              ? `/${e.nb_livres_attendus}`
                              : ""}{" "}
                            livre{count !== 1 ? "s" : ""}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Actions sur l'étagère active */}
                {activeEtagere && (
                  <>
                    <button
                      onClick={() =>
                        setDialog({ type: "edit-etagere", item: activeEtagere })
                      }
                      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Modifier l'étagère"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setDialog({
                          type: "delete-etagere",
                          item: activeEtagere,
                        })
                      }
                      className="p-2 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                      title="Supprimer l'étagère"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {/* ── Liste des livres ── */}
              <Card>
                <CardContent className="p-0">
                  {shelfBooks.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">
                      Aucun livre dans cette étagère.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {shelfBooks.map((b) => (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={() => setDraggedId(b.id)}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragOverId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverId(b.id);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(b.id);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 group transition-colors",
                            draggedId === b.id && "opacity-40",
                            dragOverId === b.id &&
                              draggedId !== b.id &&
                              "bg-accent/10 border-l-2 border-accent",
                          )}
                        >
                          {/* Poignée de glisser — masquée sur mobile (drag non supporté) */}
                          <GripVertical className="hidden sm:block h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />

                          {/* Numéro de position */}
                          <div className="h-9 w-9 shrink-0 rounded-md bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center">
                            {b.position_index}
                          </div>

                          {/* Titre & auteur */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {b.titre}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {b.auteur || "—"}
                            </div>
                          </div>

                          {/* Actions — toujours visibles sur mobile, au survol sur desktop */}
                          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                            <button
                              onClick={() =>
                                setDialog({ type: "edit-livre", item: b })
                              }
                              className="p-2 sm:p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDialog({ type: "delete-livre", item: b })
                              }
                              className="p-2 sm:p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ajouter un livre */}
                  <div className="px-4 py-4 border-t border-border">
                    <button
                      onClick={() => setDialog({ type: "add-livre" })}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full min-h-[44px]"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      Ajouter un livre
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══ Dialogs ════════════════════════════════════════════════════════ */}

      <Dialog
        open={dialog.type === "add-livre" || dialog.type === "edit-livre"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <LivreDialogContent
          key={dialog.type === "edit-livre" ? dialog.item.id : "new"}
          etageres={etageres}
          defaultEtagereId={activeId ?? etageres[0]?.id ?? 0}
          initial={dialog.type === "edit-livre" ? dialog.item : null}
          onClose={close}
          onSave={handleSaveLivre}
        />
      </Dialog>

      <Dialog
        open={dialog.type === "add-etagere" || dialog.type === "edit-etagere"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <EtagereDialogContent
          key={dialog.type === "edit-etagere" ? dialog.item.id : "new"}
          initial={dialog.type === "edit-etagere" ? dialog.item : null}
          onClose={close}
          onSave={handleSaveEtagere}
        />
      </Dialog>

      <Dialog
        open={dialog.type === "delete-livre"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce livre ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            «&nbsp;{deleteLivreItem?.titre}&nbsp;» sera définitivement supprimé.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteLivre}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.type === "delete-etagere"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette étagère ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            L'étagère «&nbsp;{deleteEtagereItem?.label}&nbsp;» et tous ses
            livres associés seront supprimés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteEtagere}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Choix d'enregistrement */}
      <Dialog
        open={dialog.type === "save-options"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer la bibliothèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              onClick={handleSaveToFile}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Save className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-medium text-sm">Mettre à jour le fichier</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {hasWriteHandle()
                    ? "Enregistrer directement sur le fichier (sans dialog)"
                    : "Choisir le fichier .db à mettre à jour"}
                </div>
              </div>
            </button>
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Download className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-medium text-sm">Télécharger une copie</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Télécharger databaseLibrairie.db dans vos Téléchargements
                </div>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Étagère pleine — bloquer et proposer d'agrandir */}
      <Dialog
        open={dialog.type === "shelf-full"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Étagère pleine</DialogTitle>
          </DialogHeader>
          {dialog.type === "shelf-full" && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                L'étagère{" "}
                <span className="font-semibold text-foreground">
                  "{dialog.etagere.label}"
                </span>{" "}
                a atteint sa capacité maximale ({dialog.currentCount}/
                {dialog.etagere.nb_livres_attendus} livres).
              </p>
              <p>
                Voulez-vous augmenter sa capacité à{" "}
                <span className="font-semibold text-foreground">
                  {dialog.etagere.nb_livres_attendus + 1} livres
                </span>{" "}
                et ajouter le livre quand même ?
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Annuler
            </Button>
            <Button onClick={handleShelfFullConfirm}>
              Augmenter la capacité et ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmer suppression de toute la bibliothèque */}
      <Dialog
        open={dialog.type === "clear-all"}
        onOpenChange={(v) => { if (!v) close(); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer toute la bibliothèque ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Toutes les étagères, tous les livres et toutes les positions seront
            définitivement supprimés. Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Annuler</Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Tout supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
