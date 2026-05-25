/**
 * BookGallery — Gestionnaire des segmentations.
 * Affiche tous les livres (actifs + supprimés) et permet de les supprimer ou restaurer.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Trash2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GalleryBook = {
  id: number;       // originalIndex
  crop: string;
  deleted: boolean;
};

type BookGalleryProps = {
  books: GalleryBook[];
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onClose: () => void;
};

export function BookGallery({ books, onDelete, onRestore, onClose }: BookGalleryProps) {
  const firstActiveId = books.find((b) => !b.deleted)?.id ?? books[0]?.id ?? 0;
  const [currentId, setCurrentId] = useState<number>(firstActiveId);
  const [swipeY, setSwipeY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const currentBook = books.find((b) => b.id === currentId) ?? books[0];
  const currentIdx = books.findIndex((b) => b.id === currentId);
  const isDeleted = currentBook?.deleted ?? false;
  const activeCount = books.filter((b) => !b.deleted).length;

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(books.length - 1, idx));
      setCurrentId(books[clamped].id);
      setTimeout(() => {
        const container = thumbnailsRef.current;
        const thumb = container?.children[clamped] as HTMLElement | undefined;
        thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 50);
    },
    [books]
  );

  // ─── Action principale (supprimer ou restaurer) ────────────────────────────

  const handleAction = useCallback(() => {
    if (!currentBook) return;

    if (isDeleted) {
      // Restaurer → appel immédiat, pas d'animation
      onRestore(currentBook.id);
    } else {
      // Supprimer → animation slide-up puis callback
      setIsAnimating(true);
      setTimeout(() => {
        onDelete(currentBook.id);
        setIsAnimating(false);
        setSwipeY(0);
        // Avancer vers le prochain livre
        const nextIdx = Math.min(currentIdx + 1, books.length - 1);
        setCurrentId(books[nextIdx]?.id ?? currentBook.id);
      }, 320);
    }
  }, [currentBook, isDeleted, currentIdx, books, onDelete, onRestore]);

  // ─── Swipe tactile ────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || isDeleted) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    if (dy > 5) setSwipeY(dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = Math.abs((touchStartX.current ?? 0) - e.changedTouches[0].clientX);

    if (dy > 80 && dx < 50 && !isDeleted) {
      handleAction();
    } else if (dx > 60 && Math.abs(dy) < 40) {
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
      else if ((e.key === "Delete" || e.key === "Backspace") && !isDeleted) handleAction();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, isDeleted, goTo, handleAction, onClose]);

  // ─── Cas vide ─────────────────────────────────────────────────────────────

  if (books.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
        <div className="text-center text-white space-y-2">
          <Trash2 className="h-10 w-10 mx-auto opacity-50" />
          <p className="font-semibold">Aucune segmentation disponible.</p>
        </div>
        <Button onClick={onClose}>Fermer</Button>
      </div>
    );
  }

  const swipeClamped = Math.min(swipeY, 130);
  const swipeOpacity = swipeY > 40 ? Math.max(0, 1 - (swipeY - 40) / 90) : 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col select-none">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h2 className="font-semibold text-base text-white">Gérer la segmentation</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50 tabular-nums">
            {activeCount} actif{activeCount !== 1 ? "s" : ""}
            {books.length - activeCount > 0 && (
              <span className="text-red-400 ml-1">
                · {books.length - activeCount} supprimé{books.length - activeCount !== 1 ? "s" : ""}
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Image principale ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center gap-1 px-1 min-h-0 overflow-hidden">
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="h-10 w-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center
                     hover:bg-white/10 disabled:opacity-20 text-white transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          className="relative flex-1 flex items-center justify-center h-full py-3 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {currentBook && (
            <img
              key={currentBook.id}
              src={currentBook.crop}
              alt={`Livre ${currentBook.id + 1}`}
              draggable={false}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
              style={{
                transform: `translateY(-${swipeClamped}px)`,
                opacity: isAnimating
                  ? 0
                  : isDeleted
                  ? 0.35
                  : swipeOpacity,
                filter: isDeleted ? "grayscale(80%)" : "none",
                transition:
                  swipeY === 0 || isAnimating
                    ? "transform 0.3s ease, opacity 0.3s ease, filter 0.3s ease"
                    : "none",
              }}
            />
          )}

          {/* Badge "Supprimé" */}
          {isDeleted && !isAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-red-500/80 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <X className="h-4 w-4" /> Supprimé — cliquez Restaurer
              </div>
            </div>
          )}

          {/* Indicateur swipe supprimer */}
          {swipeY > 35 && !isAnimating && !isDeleted && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2
                            bg-destructive/90 text-destructive-foreground text-xs font-medium
                            px-3 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
              <Trash2 className="h-3.5 w-3.5" /> Relâchez pour supprimer
            </div>
          )}
          {swipeY === 0 && !isAnimating && !isDeleted && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2
                            text-[11px] text-white/30 pointer-events-none">
              ↑ Swipez vers le haut pour supprimer
            </div>
          )}
        </div>

        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx === books.length - 1}
          className="h-10 w-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center
                     hover:bg-white/10 disabled:opacity-20 text-white transition-opacity"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── Miniatures ───────────────────────────────────────────────────── */}
      <div
        ref={thumbnailsRef}
        className="flex gap-2 overflow-x-auto px-4 py-2 shrink-0"
        style={{ scrollbarWidth: "none" }}
      >
        {books.map((book, i) => (
          <button
            key={book.id}
            onClick={() => goTo(i)}
            className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 relative ${
              book.id === currentBook?.id
                ? "border-accent scale-105 shadow-md"
                : "border-transparent opacity-40 hover:opacity-75"
            }`}
          >
            <img
              src={book.crop}
              alt={`Livre ${book.id + 1}`}
              className={`h-16 w-10 object-cover ${book.deleted ? "opacity-40 grayscale" : ""}`}
              draggable={false}
            />
            {/* Croix rouge sur les miniatures supprimées */}
            {book.deleted && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                <X className="h-3 w-3 text-red-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Barre d'actions ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 shrink-0">
        <p className="text-xs text-white/35 flex-1 hidden sm:block">
          {isDeleted
            ? "Cliquez Restaurer pour remettre ce livre dans le compte"
            : "← → clavier · swipe ↑ · ou Supprimer"}
        </p>
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10 hover:text-white"
        >
          Terminer
        </Button>

        {isDeleted ? (
          <Button
            onClick={handleAction}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Restaurer
          </Button>
        ) : (
          <Button variant="destructive" onClick={handleAction} disabled={isAnimating}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}
