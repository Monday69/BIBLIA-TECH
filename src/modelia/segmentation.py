import cv2
import numpy as np
from ultralytics import YOLO
import base64
from pathlib import Path

# ─── Chargement du modèle YOLO ───────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent / "best.pt"

model = None
_load_error = None

try:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")
    model = YOLO(str(MODEL_PATH))
    print(f"✅ Modèle YOLO chargé : {MODEL_PATH}")
except Exception as e:
    _load_error = str(e)
    print(f"❌ Erreur de chargement YOLO : {e}")

# ─── Configuration ────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.55
ASPECT_RATIO_MIN = 2.0
DISTANCE_MINIMALE = 12

# Dictionnaires ArUco à essayer (du plus courant au plus rare)
ARUCO_DICTS = [
    cv2.aruco.DICT_4X4_50,
    cv2.aruco.DICT_4X4_100,
    cv2.aruco.DICT_4X4_250,
    cv2.aruco.DICT_5X5_50,
    cv2.aruco.DICT_5X5_100,
    cv2.aruco.DICT_6X6_50,
    cv2.aruco.DICT_6X6_100,
]

# ─── Détection ArUco ─────────────────────────────────────────────────────────

def detecter_aruco(img_brute):
    """
    Essaie plusieurs dictionnaires ArUco et retourne le premier ID détecté.
    Retourne None si aucun marqueur n'est trouvé.
    """
    gray = cv2.cvtColor(img_brute, cv2.COLOR_BGR2GRAY)
    for dict_type in ARUCO_DICTS:
        aruco_dict = cv2.aruco.getPredefinedDictionary(dict_type)
        params = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, params)
        corners, ids, _ = detector.detectMarkers(gray)
        if ids is not None and len(ids) > 0:
            etagere_id = int(ids[0][0])
            print(f"✅ Marqueur ArUco détecté — ID étagère : {etagere_id}")
            return etagere_id
    print("⚠️  Aucun marqueur ArUco détecté dans l'image.")
    return None

# ─── Pré-traitement image ─────────────────────────────────────────────────────

def normaliser_luminosite(image_cv2):
    """CLAHE : normalise la luminosité pour améliorer la détection en conditions variables."""
    lab = cv2.cvtColor(image_cv2, cv2.COLOR_BGR2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def order_points(pts):
    """Ordonne 4 points : Haut-Gauche, Haut-Droite, Bas-Droite, Bas-Gauche."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

# ─── Segmentation principale ──────────────────────────────────────────────────

def traiter_image_segmentation(image_bytes):
    """
    Reçoit les bytes de l'image, détecte le marqueur ArUco (ID étagère),
    segmente les livres avec YOLO, retourne l'image annotée en base64.
    """
    if model is None:
        raise RuntimeError(f"Modèle YOLO non chargé. Raison : {_load_error}")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_brute = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_brute is None:
        raise ValueError("Impossible de décoder l'image. Vérifiez que le fichier est un JPG ou PNG valide.")

    # 1. Détection ArUco sur l'image brute (avant normalisation)
    etagere_id = detecter_aruco(img_brute)

    # 2. Normalisation luminosité pour YOLO
    img = normaliser_luminosite(img_brute)
    img_clean = img.copy()
    hauteur_image = img.shape[0]

    # 3. Segmentation YOLO
    results = model.predict(source=img, conf=CONF_THRESHOLD, retina_masks=True, verbose=False)
    valid_books = []

    for r in results:
        if r.masks is None:
            continue
        for box, mask in zip(r.boxes, r.masks.xy):
            conf = box.conf[0].item()
            contour = np.array(mask, dtype=np.int32)
            rect = cv2.minAreaRect(contour)
            box_points = np.intp(cv2.boxPoints(rect))

            w, h = rect[1][0], rect[1][1]
            if w > h:
                w, h = h, w
            center_x, center_y = rect[0][0], rect[0][1]

            if center_y > (hauteur_image * 0.25) and h / max(w, 1) > ASPECT_RATIO_MIN:
                valid_books.append({
                    "box_points": box_points,
                    "conf": conf,
                    "center_x": center_x,
                    "width": int(w),
                    "height": int(h),
                })

    # 4. Tri gauche → droite + dédoublonnage
    valid_books.sort(key=lambda x: x["center_x"])
    livres_nettoyes = []
    for book in valid_books:
        if not livres_nettoyes:
            livres_nettoyes.append(book)
        else:
            dernier = livres_nettoyes[-1]
            if abs(book["center_x"] - dernier["center_x"]) < DISTANCE_MINIMALE:
                if book["conf"] > dernier["conf"]:
                    livres_nettoyes[-1] = book
            else:
                livres_nettoyes.append(book)

    # 5. Extraction des crops individuels (redressement perspective)
    crops_base64 = []
    for book in livres_nettoyes:
        rect_pts = order_points(book["box_points"].astype("float32"))
        dst_pts = np.array([
            [0, 0],
            [book["width"] - 1, 0],
            [book["width"] - 1, book["height"] - 1],
            [0, book["height"] - 1],
        ], dtype="float32")
        M = cv2.getPerspectiveTransform(rect_pts, dst_pts)
        warped = cv2.warpPerspective(img_clean, M, (book["width"], book["height"]))
        _, buf = cv2.imencode(".jpg", warped, [cv2.IMWRITE_JPEG_QUALITY, 88])
        crops_base64.append(f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}")

    # 6. Annotation de l'image complète
    for i, book in enumerate(livres_nettoyes):
        cv2.drawContours(img, [book["box_points"]], 0, (0, 255, 0), 2)
        cv2.putText(
            img,
            f"#{i + 1}",
            (book["box_points"][0][0], book["box_points"][0][1] - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 0),
            2,
        )

    # 7. Annotation de l'ID étagère si détecté
    if etagere_id is not None:
        label = f"Etagere #{etagere_id}"
        cv2.putText(img, label, (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 200, 255), 3)

    _, buffer = cv2.imencode(".jpg", img)
    img_str = base64.b64encode(buffer).decode("utf-8")

    return {
        "status": "success",
        "book_count": len(livres_nettoyes),
        "etagere_id": etagere_id,
        "image_base64": f"data:image/jpeg;base64,{img_str}",
        "crops": crops_base64,              # liste des images individuelles de chaque livre
    }
