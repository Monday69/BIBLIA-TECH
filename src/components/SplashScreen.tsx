import { useEffect, useRef, useState } from "react";

type SplashScreenProps = {
  onComplete: () => void;
};

// ─── Données de configuration des livres ───────────────────────────────────

const BOOK_HEIGHT = 120;

const BOOKS_CONFIG = [
  { color: "#c9a84c", spine: "#a8862e", width: 44, height: BOOK_HEIGHT }, // Jaune
  { color: "#1a3a5c", spine: "#122840", width: 36, height: BOOK_HEIGHT }, // Bleu
  { color: "#8b3a3a", spine: "#6b2a2a", width: 52, height: BOOK_HEIGHT }, // Rouge
  { color: "#1a6b4a", spine: "#145c3e", width: 42, height: BOOK_HEIGHT }, // Vert
];

// ─── Phases de l'animation ────────────────────────────────────────────────────

const PHASE_1_FRAMES = 80;   // Livres apparaissent
const PHASE_2_FRAMES = 90;   // Rectangle pointillé
const PHASE_3_FRAMES = 110;  // 4 boxes individuelles
const PHASE_4_FRAMES = 300;  // Loupe scanne + vérifications
const PHASE_5_FRAMES = 50;   // Pause
const PHASE_6_FRAMES = 280;  // Pan caméra + livres volent

const TOTAL_FRAMES = PHASE_1_FRAMES + PHASE_2_FRAMES + PHASE_3_FRAMES + 
                     PHASE_4_FRAMES + PHASE_5_FRAMES + PHASE_6_FRAMES;

// ─── Utilitaires de dessin ────────────────────────────────────────────────

function drawBook(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  spine: string,
  opacity: number = 1
) {
  ctx.globalAlpha = opacity;
  
  // Corps du livre
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  
  // Spine (tranche sombre)
  ctx.fillStyle = spine;
  const spineWidth = Math.max(2, width * 0.15);
  ctx.fillRect(x, y, spineWidth, height);
  
  // Lignes de pages (blanches semi-transparentes)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.5;
  const lineSpacing = height / 4;
  for (let i = 1; i < 4; i++) {
    const lineY = y + lineSpacing * i;
    ctx.beginPath();
    ctx.moveTo(x + spineWidth + 3, lineY);
    ctx.lineTo(x + width - 3, lineY);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawCheckmark(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string,
  opacity: number = 1
) {
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  const radius = size / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.4, centerY);
  ctx.lineTo(centerX - radius * 0.1, centerY + radius * 0.3);
  ctx.lineTo(centerX + radius * 0.4, centerY - radius * 0.3);
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

function drawCross(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string,
  opacity: number = 1
) {
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  
  const radius = size / 2;
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.4, centerY - radius * 0.4);
  ctx.lineTo(centerX + radius * 0.4, centerY + radius * 0.4);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(centerX + radius * 0.4, centerY - radius * 0.4);
  ctx.lineTo(centerX - radius * 0.4, centerY + radius * 0.4);
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

// ─── Composant SplashScreen ────────────────────────────────────────────────────

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ─── Configuration du canvas ───────────────────────────────────────────

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ─── Chargement de la police Playfair Display ─────────────────────────

    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // ─── Calculs de positions ──────────────────────────────────────────────

    const booksTotalWidth = BOOKS_CONFIG.reduce((sum, book) => sum + book.width, 0);
    const booksGap = 15;
    const shelfWidth = booksTotalWidth + booksGap * (BOOKS_CONFIG.length - 1);
    const shelfHeight = BOOK_HEIGHT;

    const shelfCenterX = canvas.width / 2;
    const shelfCenterY = canvas.height * 0.4;
    const shelfStartX = shelfCenterX - shelfWidth / 2;
    const shelfStartY = shelfCenterY - shelfHeight / 2;

    // Positions individuelles des livres
    const bookPositions: { x: number; y: number }[] = [];
    let currentX = shelfStartX;
    for (let i = 0; i < BOOKS_CONFIG.length; i++) {
      bookPositions.push({
        x: currentX,
        y: shelfStartY,
      });
      currentX += BOOKS_CONFIG[i].width + booksGap;
    }

    // ─── Boucle d'animation ───────────────────────────────────────────────

    let frameNum = 0;
    let animationFrameId: number;

    const animate = () => {
      // Remplir le fond (couleur de fond de l'app)
      ctx.fillStyle = "oklch(0.91 0.022 82)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const progress = frameNum / TOTAL_FRAMES;

      // ─── PHASE 1 : Livres apparaissent (80 frames) ──────────────────────

      if (frameNum < PHASE_1_FRAMES) {
        const phaseProgress = frameNum / PHASE_1_FRAMES;
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          drawBook(
            ctx,
            pos.x,
            pos.y,
            book.width,
            book.height,
            book.color,
            book.spine,
            phaseProgress
          );
        }
      }

      // ─── PHASE 2 : Rectangle pointillé doré (90 frames) ────────────────

      else if (frameNum < PHASE_1_FRAMES + PHASE_2_FRAMES) {
        const phaseFrame = frameNum - PHASE_1_FRAMES;
        const phaseProgress = phaseFrame / PHASE_2_FRAMES;

        // Dessiner les livres à opacité 1
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          drawBook(ctx, pos.x, pos.y, book.width, book.height, book.color, book.spine);
        }

        // Rectangle pointillé autour de tous les livres
        ctx.globalAlpha = phaseProgress;
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          shelfStartX - 8,
          shelfStartY - 8,
          shelfWidth + 16,
          shelfHeight + 16
        );
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // ─── PHASE 3 : 4 boxes individuelles (110 frames) ─────────────────

      else if (frameNum < PHASE_1_FRAMES + PHASE_2_FRAMES + PHASE_3_FRAMES) {
        const phaseFrame = frameNum - PHASE_1_FRAMES - PHASE_2_FRAMES;
        const phaseProgress = phaseFrame / PHASE_3_FRAMES;

        // Dessiner les livres
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          drawBook(ctx, pos.x, pos.y, book.width, book.height, book.color, book.spine);
        }

        // Rectangle principal fade out
        ctx.globalAlpha = 1 - phaseProgress;
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(
          shelfStartX - 8,
          shelfStartY - 8,
          shelfWidth + 16,
          shelfHeight + 16
        );
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // 4 boxes individuelles fade in
        ctx.globalAlpha = phaseProgress;
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          ctx.strokeRect(pos.x - 4, pos.y - 4, book.width + 8, book.height + 8);
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // ─── PHASE 4 : Loupe scanne (300 frames) ──────────────────────────

      else if (frameNum < PHASE_1_FRAMES + PHASE_2_FRAMES + PHASE_3_FRAMES + PHASE_4_FRAMES) {
        const phaseFrame = frameNum - PHASE_1_FRAMES - PHASE_2_FRAMES - PHASE_3_FRAMES;
        const phaseProgress = phaseFrame / PHASE_4_FRAMES;

        // Dessiner les livres
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          drawBook(ctx, pos.x, pos.y, book.width, book.height, book.color, book.spine);
        }

        // 4 boxes individuelles restent visibles
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          ctx.strokeRect(pos.x - 4, pos.y - 4, book.width + 8, book.height + 8);
        }
        ctx.setLineDash([]);

        // Loupe qui scanne de gauche à droite
        const loupeX = shelfStartX - 40 + phaseProgress * (shelfWidth + 80);
        const loupeRadius = 35;

        // Cercle de la loupe
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(loupeX, shelfCenterY, loupeRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Tige de la loupe
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(loupeX + loupeRadius * 0.7, shelfCenterY + loupeRadius * 0.7);
        ctx.lineTo(loupeX + loupeRadius * 1.2, shelfCenterY + loupeRadius * 1.2);
        ctx.stroke();

        // Vérifications (check vert pour livres 0 et 2, croix rouge pour 1 et 3)
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          const bookCenterX = pos.x + book.width / 2;
          const bookCenterY = pos.y + book.height / 2;

          // Calculer quelle portion de la loupe est au-dessus du livre
          const distFromLoup = Math.abs(bookCenterX - loupeX);
          let checkOpacity = 0;

          if (distFromLoup < loupeRadius) {
            checkOpacity = 1 - distFromLoup / loupeRadius;
          }

          if (i === 0 || i === 2) {
            // Check vert
            drawCheckmark(ctx, bookCenterX, bookCenterY, 40, "#4ade80", checkOpacity);
          } else {
            // Croix rouge
            drawCross(ctx, bookCenterX, bookCenterY, 40, "#f87171", checkOpacity);
          }
        }
      }

      // ─── PHASE 5 : Pause (50 frames) ─────────────────────────────────

      else if (frameNum < PHASE_1_FRAMES + PHASE_2_FRAMES + PHASE_3_FRAMES + 
                           PHASE_4_FRAMES + PHASE_5_FRAMES) {
        // État final : loupe à droite
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          drawBook(ctx, pos.x, pos.y, book.width, book.height, book.color, book.spine);
        }

        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          const book = BOOKS_CONFIG[i];
          const pos = bookPositions[i];
          ctx.strokeRect(pos.x - 4, pos.y - 4, book.width + 8, book.height + 8);
        }
        ctx.setLineDash([]);

        // Loupe final (à droite)
        const loupeX = shelfStartX + shelfWidth + 40;
        const loupeRadius = 35;
        ctx.strokeStyle = "#c9a84c";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(loupeX, shelfCenterY, loupeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(loupeX + loupeRadius * 0.7, shelfCenterY + loupeRadius * 0.7);
        ctx.lineTo(loupeX + loupeRadius * 1.2, shelfCenterY + loupeRadius * 1.2);
        ctx.stroke();
      }

      // ─── PHASE 6 : Pan caméra + livres volent (280 frames) ──────────

      else {
        const phaseFrame = frameNum - PHASE_1_FRAMES - PHASE_2_FRAMES - 
                           PHASE_3_FRAMES - PHASE_4_FRAMES - PHASE_5_FRAMES;
        const phaseProgress = phaseFrame / PHASE_6_FRAMES;

        // ─── Calcul des positions des slots (mesure du texte en premier) ──────
        const fontSize = 36;
        const textY = canvas.height * 0.7;
        const mainColor = "oklch(0.48 0.05 155)";
        const slotW = fontSize * 0.6;

        ctx.font = `700 ${fontSize}px 'Playfair Display', serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const wB  = ctx.measureText("B").width;
        const wBL = ctx.measureText("BL").width;
        const wA  = ctx.measureText("A").width;
        const wD  = ctx.measureText("-").width;
        const wT  = ctx.measureText("TECH").width;
        const totalW = wB + slotW + wBL + slotW + wA + wD + wT;

        const textStartX = canvas.width / 2 - totalW / 2;
        const blueSlotX  = textStartX + wB + slotW / 2;
        const greenSlotX = textStartX + wB + slotW + wBL + slotW / 2;

        // ─── Texte BIBLIA-TECH (apparaît dès le début de la phase 6) ──────────
        const textOpacity = Math.min(phaseProgress / 0.45, 1);
        ctx.globalAlpha = textOpacity;

        let rx = textStartX;
        ctx.fillStyle = mainColor;
        ctx.fillText("B", rx, textY);   rx += wB;
        rx += slotW;                    // espace slot bleu
        ctx.fillText("BL", rx, textY);  rx += wBL;
        rx += slotW;                    // espace slot vert
        ctx.fillText("A", rx, textY);   rx += wA;
        ctx.fillStyle = "#c9a84c";
        ctx.fillText("-", rx, textY);   rx += wD;
        ctx.fillStyle = mainColor;
        ctx.fillText("TECH", rx, textY);
        ctx.globalAlpha = 1;

        // ─── Étagère (livres 0 et 2) défile vers la gauche ───────────────────
        const panOffset = phaseProgress * (shelfWidth + 200);
        const shelfOpacity = phaseProgress < 0.45 ? 1 : Math.max(0, 1 - (phaseProgress - 0.45) / 0.35);

        for (let i = 0; i < BOOKS_CONFIG.length; i++) {
          if (i !== 1 && i !== 3) {
            const book = BOOKS_CONFIG[i];
            const pos  = bookPositions[i];
            drawBook(ctx, pos.x - panOffset, pos.y, book.width, book.height, book.color, book.spine, shelfOpacity);
          }
        }

        // ─── Vol des livres bleu (1) et vert (3) vers leurs slots ────────────
        // Le vol se termine à 90% de la phase : ensuite ils sont posés dans les slots.
        const FLIGHT_END = 0.90;
        const t = Math.min(phaseProgress / FLIGHT_END, 1); // 0 → 1 pendant le vol

        const finalScale = fontSize / BOOK_HEIGHT; // taille mini dans le texte

        const flights = [
          { idx: 1, targetX: blueSlotX  },
          { idx: 3, targetX: greenSlotX },
        ];

        for (const { idx, targetX: slotX } of flights) {
          const book     = BOOKS_CONFIG[idx];
          const startPos = bookPositions[idx];
          const startX   = startPos.x + book.width  / 2;
          const startY   = startPos.y + book.height / 2;

          // Interpolation linéaire + arc parabolique
          const flyX  = startX + (slotX   - startX) * t;
          const baseY = startY + (textY   - startY) * t;
          const arcY  = baseY  - 200 * Math.sin(t * Math.PI);

          // Rotation : une révolution complète → revient à 0° à l'atterrissage
          const rotation = (1 - t) * Math.PI * 2;

          // Échelle : taille pleine → taille mini texte
          const scale = 1 + (finalScale - 1) * t;

          ctx.save();
          ctx.translate(flyX, arcY);
          ctx.rotate(rotation);
          ctx.scale(scale, scale);
          ctx.translate(-book.width / 2, -book.height / 2);
          drawBook(ctx, 0, 0, book.width, book.height, book.color, book.spine);
          ctx.restore();
        }
      }

      frameNum++;

      if (frameNum < TOTAL_FRAMES) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Animation terminée
        setFadeOut(true);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      document.head.removeChild(link);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-white transition-opacity duration-300 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
