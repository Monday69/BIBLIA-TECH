/**
 * BookGallery — Gestionnaire des segmentations individuelles.
 *
 * Affiche les crops de chaque livre détecté en plein écran.
 * Navigation : flèches ← → | clic sur miniature | touches ← → clavier
 * Suppression : bouton "Supprimer" | swipe vers le haut | touche Suppr/Backspace
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Book = { id: number; src: string };

type BookGalleryProps = {
  crops: string[];
  onClose: () => void;
  onCropsChange?: (remaining: string[]) => void;
};

export function BookGallery({ crops: initialCrops, onClose, onCropsChange }: BookGalleryProps) {
  const [books, setBooks] = useState<Book[]>(() =>
    initialCrops.map((src, i) => ({ id: i, src }))
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Swipe state
  const [swipeY, setSwipeY] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(books.length - 1, idx));
      setCurrentIdx(clamped);
      // Centrer la miniature dans le scroll
      setTimeout(() => {
        const container = thumbnailsRef.current;
        const thumb = container?.children[clamped] as HTMLElement | undefined;
        thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 50);
    },
    [books.length]
  );

  // ─── Suppression ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (isDeleting || books.length === 0) return;
    setIsDeleting(true);
    // Attendre la fin de l'animation (translateY + fade)
    setTimeout(() => {
      const nextBooks = books.filter((_, i) => i !== currentIdx);
      const nextIdx =
        currentIdx >= nextBooks.length
          ? Math.max(0, nextBooks.length - 1)
          : currentIdx;
      setBooks(nextBooks);
      setCurrentIdx(nextIdx);
      setIsDeleting(false);
      setSwipeY(0);
      // Notifier le parent du nouveau tableau de crops
      onCropsChange?.(nextBooks.map((b) => b.src));
    }, 320);
  }, [books, currentIdx, isDeleting]);

  // ─── Swipe tactile ────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    if (dy > 5) setSwipeY(dy); // seulement vers le haut
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = Math.abs((touchStartX.current ?? 0) - e.changedTouches[0].clientX);

    if (dy > 80 && dx < 50) {
      // Swipe vers le haut dominant → supprimer
      handleDelete();
    } else if (dx > 60 && Math.abs(dy) < 40) {
      // Swipe horizontal → navigation
      const dxSigned = (touchStartX.current ?? 0) - e.changedTouches[0].clientX;
      goTo(currentIdx + (dxSigned > 0 ? 1 : -1));
      setSwipeY(0);
    } else {
      setSwipeY(0);
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  // ─── Clavier ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(currentIdx - 1);
      else if (e.key === "ArrowRight") goTo(currentIdx + 1);
      else if (e.key === "Delete" || e.key === "Backspace") handleDelete();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, goTo, handleDelete, onClose]);

  // ─── Cas vide ─────────────────────────────────────────────────────────────

  if (books.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-2">
          <Trash2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-semibold">Toutes les segmentations ont été supprimées.</p>
          <p className="text-sm text-muted-foreground">
            Relancez une analyse pour obtenir de nouveaux résultats.
          </p>
        </div>
        <Button onClick={onClose}>Fermer</Button>
      </div>
    );
  }

  const current = books[currentIdx];
  // Visuel de swipe : translate + fade progressif
  const swipeClamped = Math.min(swipeY, 130);
  const swipeOpacity = swipeY > 40 ? Math.max(0, 1 - (swipeY - 40) / 90) : 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col select-none">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="font-semibold text-base">Gérer la segmentation</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {currentIdx + 1} / {books.length}
          </span>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Image principale + boutons latéraux ──────────────────────────── */}
      <div className="flex-1 flex items-center gap-1 px-1 min-h-0 overflow-hidden">
        {/* Flèche gauche */}
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="h-10 w-10 shrink-0 rounded-full border flex items-center justify-center
                     hover:bg-muted disabled:opacity-20 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Zone image */}
        <div
          className="relative flex-1 flex items-center justify-center h-full py-3 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            key={current.id}
            src={current.src}
            alt={`Livre ${currentIdx + 1}`}
            draggable={false}
            className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
            style={{
              transform: `translateY(-${swipeClamped}px)`,
              opacity: isDeleting ? 0 : swipeOpacity,
              transition: swipeY === 0 || isDeleting
                ? "transform 0.3s ease, opacity 0.3s ease"
                : "none",
            }}
          />

          {/* Indicateur swipe */}
          {swipeY > 35 && !isDeleting && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2
                            bg-destructive/90 text-destructive-foreground text-xs font-medium
                            px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
              <Trash2 className="h-3.5 w-3.5" />
              Relâchez pour supprimer
            </div>
          )}
          {swipeY === 0 && !isDeleting && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                            text-[11px] text-muted-foreground/60 pointer-events-none">
              ↑ Swipez vers le haut pour supprimer
            </div>
          )}
        </div>

        {/* Flèche droite */}
        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx === books.length - 1}
          className="h-10 w-10 shrink-0 rounded-full border flex items-center justify-center
                     hover:bg-muted disabled:opacity-20 transition-opacity"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── Miniatures ───────────────────────────────────────────────────── */}
      <div
        ref={thumbnailsRef}
        className="flex gap-2 overflow-x-auto px-4 py-2 shrink-0 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {books.map((book, i) => (
          <button
            key={book.id}
            onClick={() => goTo(i)}
            className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              i === currentIdx
                ? "border-accent scale-105 shadow-md"
                : "border-transparent opacity-40 hover:opacity-75"
            }`}
          >
            <img
              src={book.src}
              alt={`Livre ${i + 1}`}
              className="h-16 w-10 object-cover"
              draggable={false}
            />
          </button>
        ))}
      </div>

      {/* ── Barre d'actions ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-t shrink-0">
        <p className="text-xs text-muted-foreground flex-1 hidden sm:block">
          ← → clavier · swipe ↑ · ou cliquez Supprimer
        </p>
        <Button variant="outline" onClick={onClose}>
          Terminer
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
