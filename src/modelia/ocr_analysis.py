"""
ocr_analysis.py
──────────────────────────────────────────────────────────────────────────────
Pipeline complet : YOLO segmentation + PaddleOCR + correspondance BDD SQLite.
Appelé par POST /ocr dans main.py.
──────────────────────────────────────────────────────────────────────────────
"""
import os, cv2, numpy as np, base64, re, unicodedata, sqlite3, json, time

# ─── DLLs indispensables pour PaddleOCR + PyTorch sur Windows ────────────────
os.environ["PATH"] = (
    r"C:\Users\matte\anaconda3\envs\ocr_env\Lib\site-packages\torch\lib;"
    r"C:\yolo;" +
    os.environ.get("PATH", "")
)

from paddleocr import PaddleOCR
from rapidfuzz import fuzz

from .segmentation import (
    model as yolo_model,
    _load_error,
    CONF_THRESHOLD,
    ASPECT_RATIO_MIN,
    DISTANCE_MINIMALE,
    normaliser_luminosite,
    order_points,
    detecter_aruco,
)

# ─── Configuration ─────────────────────────────────────────────────────────────
DB_PATH = r"C:\yolo\database.db"

_BLACKLIST = re.compile(
    r"\b(pocket|folio|gallimard|albin|michel|editions|edition|roman|occasion|"
    r"casterman|nrf|grasset|hachette|livre|poche|seuil|flammarion|stock)\b",
    re.IGNORECASE,
)

FUZZY_SEUIL = 60

# Couleurs OpenCV BGR par statut
_COLORS = {
    "correct":        (0,  200,  80),   # vert
    "wrong_position": (0,  165, 255),   # orange
    "not_expected":   (50,  50, 220),   # rouge
    "unreadable":     (160, 160, 160),  # gris
}

# ─── PaddleOCR (singleton, chargé à la première analyse) ─────────────────────
_ocr_engine = None

def _get_ocr() -> PaddleOCR:
    global _ocr_engine
    if _ocr_engine is None:
        print("⏳ Chargement PaddleOCR…")
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang="fr",
            use_gpu=True,
            show_log=False,
            det_db_box_thresh=0.4,
            rec_score_thresh=0.55,
        )
        print("✅ PaddleOCR prêt.")
    return _ocr_engine

# ─── Pré-traitement d'un crop de tranche ──────────────────────────────────────
def _preprocess(img: np.ndarray) -> np.ndarray:
    img = cv2.copyMakeBorder(img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=[255, 255, 255])
    h, w = img.shape[:2]
    if h > w:
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        h, w = img.shape[:2]
    img_up = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(img_up, cv2.COLOR_BGR2GRAY)
    if gray.std() < 60:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_up = cv2.cvtColor(clahe.apply(gray), cv2.COLOR_GRAY2BGR)
    return img_up

def _clean_lines(raw: list) -> tuple:
    if not raw:
        return "", 0.0
    raw.sort(key=lambda x: x[0][0][1])
    tokens, confs = [], []
    for _, (text, conf) in raw:
        if conf < 0.40:
            continue
        text = re.sub(r"[^a-zA-ZÀ-ÖØ-öø-ÿ0-9'\s\-]", " ", text).strip()
        text = re.sub(r"\s+", " ", text)
        if len(text) >= 2:
            tokens.append(text)
            confs.append(conf)
    return " ".join(tokens).strip(), (float(np.mean(confs)) if confs else 0.0)

def _ocr_crop(img: np.ndarray) -> tuple:
    """Extrait le texte d'un crop de tranche (essaie les 2 orientations)."""
    if img is None or img.size == 0:
        return "", 0.0
    ocr = _get_ocr()
    proc = _preprocess(img)
    res = ocr.ocr(proc, cls=True)
    text, conf = _clean_lines(res[0] if res and res[0] else [])
    if not text:
        rot = cv2.rotate(proc, cv2.ROTATE_180)
        res2 = ocr.ocr(rot, cls=True)
        text, conf = _clean_lines(res2[0] if res2 and res2[0] else [])
    return text, conf

# ─── Matching flou ─────────────────────────────────────────────────────────────
def _fuzzy(ocr_raw: str, ref_key: str) -> float:
    norm = unicodedata.normalize("NFKD", ocr_raw).encode("ascii", "ignore").decode("utf-8")
    return fuzz.token_set_ratio(norm, ref_key) * 0.8 + fuzz.token_sort_ratio(norm, ref_key) * 0.2

# ─── Lecture BDD SQLite ────────────────────────────────────────────────────────
def _get_db_books(etagere_id: int | None) -> list:
    """
    Si etagere_id est fourni → livres de cette étagère uniquement.
    Si None → TOUS les livres de la BDD (comme le script de référence).
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        if etagere_id is not None:
            cur.execute(
                """
                SELECT p.position_index, l.id, l.titre, l.auteur
                FROM Positions p
                JOIN Livres l ON p.livre_id = l.id
                WHERE p.etagere_id = ?
                ORDER BY p.position_index ASC
                """,
                (etagere_id,),
            )
        else:
            # Pas d'ArUco → on cherche dans tout le catalogue
            cur.execute(
                """
                SELECT p.position_index, l.id, l.titre, l.auteur
                FROM Positions p
                JOIN Livres l ON p.livre_id = l.id
                ORDER BY p.etagere_id, p.position_index ASC
                """
            )
        rows = cur.fetchall()
        conn.close()
        print(f"📚 BDD : {len(rows)} livre(s) chargé(s) (étagère={'all' if etagere_id is None else etagere_id})")
        books = []
        for row in rows:
            b = dict(row)
            key = f"{b['titre'] or ''} {b['auteur'] or ''}".lower()
            b["search_key"] = (
                unicodedata.normalize("NFKD", key).encode("ascii", "ignore").decode("utf-8")
            )
            books.append(b)
        return books
    except Exception as e:
        print(f"⚠️  Erreur BDD : {e}")
        return []

# ─── Catalogue envoyé par le frontend (localStorage) ─────────────────────────
def _prepare_catalog(catalog_json: str) -> list:
    """Transforme le JSON du frontend en liste de livres avec search_key."""
    try:
        items = json.loads(catalog_json)
    except Exception:
        return []
    books = []
    for item in items:
        titre  = item.get("titre",  "") or ""
        auteur = item.get("auteur", "") or ""
        key = f"{titre} {auteur}".lower()
        books.append({
            "position_index": item.get("position_index"),
            "etagere_id":     item.get("etagere_id"),
            "titre":          titre,
            "auteur":         auteur,
            "search_key":     unicodedata.normalize("NFKD", key).encode("ascii", "ignore").decode("utf-8"),
        })
    print(f"📚 Catalogue frontend : {len(books)} livre(s)")
    return books

# ─── Pipeline principal ────────────────────────────────────────────────────────
def analyser_ocr(image_bytes: bytes, catalog_json: str | None = None) -> dict:
    """
    Segmente l'image (YOLO), lit chaque tranche avec PaddleOCR,
    compare à la BDD SQLite et retourne un rapport JSON structuré.
    """
    if yolo_model is None:
        raise RuntimeError(f"Modèle YOLO non chargé : {_load_error}")

    t_total_start = time.time()

    # Décodage
    arr = np.frombuffer(image_bytes, np.uint8)
    img_brute = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img_brute is None:
        raise ValueError("Impossible de décoder l'image.")

    # ArUco → ID étagère
    etagere_id = detecter_aruco(img_brute)

    # Normalisation + YOLO
    img = normaliser_luminosite(img_brute)
    img_clean = img.copy()
    h_img = img.shape[0]

    t_yolo_start = time.time()
    preds = yolo_model.predict(source=img, conf=CONF_THRESHOLD, retina_masks=True, verbose=False)
    yolo_ms = round((time.time() - t_yolo_start) * 1000)
    raw_books = []
    for r in preds:
        if r.masks is None:
            continue
        for box, mask in zip(r.boxes, r.masks.xy):
            conf = float(box.conf[0])
            contour = np.array(mask, dtype=np.int32)
            rect = cv2.minAreaRect(contour)
            bpts = np.intp(cv2.boxPoints(rect))
            w, h = rect[1]
            if w > h:
                w, h = h, w
            cx, cy = rect[0]
            if cy > h_img * 0.25 and h / max(w, 1) > ASPECT_RATIO_MIN:
                raw_books.append({
                    "box_points": bpts, "contour": contour,
                    "conf": conf, "cx": cx, "w": int(w), "h": int(h),
                })

    # Tri + dédoublonnage
    raw_books.sort(key=lambda x: x["cx"])
    livres = []
    for b in raw_books:
        if not livres or abs(b["cx"] - livres[-1]["cx"]) >= DISTANCE_MINIMALE:
            livres.append(b)
        elif b["conf"] > livres[-1]["conf"]:
            livres[-1] = b

    # Catalogue : priorité au JSON envoyé par le frontend, sinon SQLite local
    if catalog_json:
        db_books = _prepare_catalog(catalog_json)
        # Filtrer par étagère si ArUco détecté
        if etagere_id is not None:
            shelf_books = [b for b in db_books if b.get("etagere_id") == etagere_id]
            db_books = shelf_books if shelf_books else db_books
    else:
        db_books = _get_db_books(etagere_id)

    # Fond sombre (zones hors livres à 40%)
    mask_img = np.zeros(img.shape[:2], dtype=np.uint8)
    for b in livres:
        cv2.fillPoly(mask_img, [b["contour"]], 255)
    img_out = np.where(mask_img[:, :, np.newaxis] > 0, img, (img * 0.40).astype(np.uint8))

    # OCR + matching + annotation
    results = []
    counts = {"correct": 0, "wrong_position": 0, "not_expected": 0, "unreadable": 0}
    ocr_times = []

    t_ocr_start = time.time()
    for i, book in enumerate(livres):
        # Crop redressé (correction de perspective)
        rp = order_points(book["box_points"].astype("float32"))
        dst = np.array(
            [[0, 0], [book["w"] - 1, 0], [book["w"] - 1, book["h"] - 1], [0, book["h"] - 1]],
            dtype="float32",
        )
        M = cv2.getPerspectiveTransform(rp, dst)
        crop = cv2.warpPerspective(img_clean, M, (book["w"], book["h"]))

        # OCR
        t_book_start = time.time()
        ocr_text, _ = _ocr_crop(crop)
        book_ocr_ms = round((time.time() - t_book_start) * 1000)
        ocr_times.append(book_ocr_ms)
        print(f"  📖 Livre #{i+1} — OCR : «{ocr_text}» ({book_ocr_ms}ms)")

        # Matching BDD
        best_score, best_match = 0.0, None
        if ocr_text and db_books:
            clean = _BLACKLIST.sub("", ocr_text.lower())
            clean = re.sub(r"\s+", " ", clean).strip()
            for db_b in db_books:
                s = _fuzzy(clean, db_b["search_key"])
                if s > best_score:
                    best_score, best_match = s, db_b

        # Détermination du statut
        if not ocr_text:
            status, titre, auteur, expected_pos = "unreadable", "Illisible", "", None
        elif best_match and best_score > FUZZY_SEUIL:
            titre    = best_match["titre"]
            auteur   = best_match.get("auteur") or ""
            pos_bdd  = best_match["position_index"]
            expected_pos = pos_bdd
            status = "correct" if pos_bdd == (i + 1) else "wrong_position"
        else:
            status, titre, auteur, expected_pos = "not_expected", ocr_text, "", None

        counts[status] += 1
        color = _COLORS[status]

        # Crop → base64
        _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 88])
        crop_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode()

        results.append({
            "position":          i + 1,
            "titre":             titre,
            "auteur":            auteur,
            "ocr_text":          ocr_text,
            "status":            status,
            "expected_position": expected_pos,
            "score":             round(best_score, 1),
            "crop":              crop_b64,
        })

        # Annotation image
        lp = (int(book["box_points"][0][0]), int(book["box_points"][0][1]) - 12)
        cv2.drawContours(img_out, [book["box_points"]], 0, color, 4)
        cv2.putText(img_out, f"#{i + 1}", lp, cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 5)
        cv2.putText(img_out, f"#{i + 1}", lp, cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 3)

    # ID étagère sur l'image
    if etagere_id is not None:
        lbl = f"Etagere #{etagere_id}"
        cv2.putText(img_out, lbl, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 5)
        cv2.putText(img_out, lbl, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 200, 255), 3)

    _, buffer = cv2.imencode(".jpg", img_out)
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

    ocr_total_ms  = round((time.time() - t_ocr_start) * 1000)
    ocr_per_book  = round(sum(ocr_times) / len(ocr_times)) if ocr_times else 0
    total_ms      = round((time.time() - t_total_start) * 1000)

    print(f"OCR termine : YOLO={yolo_ms}ms | OCR total={ocr_total_ms}ms | moy/livre={ocr_per_book}ms | total serveur={total_ms}ms")
    print(f"Statuts : {counts}")

    return {
        "status":       "success",
        "etagere_id":   etagere_id,
        "book_count":   len(livres),
        "image_base64": img_b64,
        "results":      results,
        "summary":      {"total": len(livres), **counts},
        "timing": {
            "yolo_ms":         yolo_ms,
            "ocr_total_ms":    ocr_total_ms,
            "ocr_per_book_ms": ocr_per_book,
            "total_ms":        total_ms,
        },
    }
