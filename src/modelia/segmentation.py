import cv2
import numpy as np
from ultralytics import YOLO
import base64

# Chargement du modèle (le chemin est relatif à main.py au moment de l'exécution)
MODEL_PATH = "src/modelia/best.pt"
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Erreur de chargement YOLO : {e}")

CONF_THRESHOLD = 0.45
ASPECT_RATIO_MIN = 2.0
DISTANCE_MINIMALE = 12

def normaliser_luminosite(image_cv2):
    lab = cv2.cvtColor(image_cv2, cv2.COLOR_BGR2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def traiter_image_segmentation(image_bytes):
    """Reçoit les bytes de l'image, fait la détection, renvoie JSON et Base64"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_brute = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    img = normaliser_luminosite(img_brute)
    img_clean = img.copy()
    hauteur_image = img.shape[0]

    results = model.predict(source=img, conf=CONF_THRESHOLD, retina_masks=True, verbose=False)
    valid_books = []

    for r in results:
        if r.masks is None:
            continue
        for box, mask in zip(r.boxes, r.masks.xy):
            conf = box.conf[0].item()
            contour = np.array(mask, dtype=np.int32)
            rect = cv2.minAreaRect(contour)
            box_points = np.int0(cv2.boxPoints(rect))
            
            w, h = rect[1][0], rect[1][1]
            if w > h: w, h = h, w
            center_x, center_y = rect[0][0], rect[0][1]
            
            if center_y > (hauteur_image * 0.25) and h / max(w, 1) > ASPECT_RATIO_MIN:
                valid_books.append({
                    "box_points": box_points, "conf": conf,
                    "center_x": center_x, "width": int(w), "height": int(h)
                })

    valid_books.sort(key=lambda x: x["center_x"])
    livres_nettoyes = []
    for book in valid_books:
        if not livres_nettoyes:
            livres_nettoyes.append(book)
        else:
            dernier_livre = livres_nettoyes[-1]
            if abs(book["center_x"] - dernier_livre["center_x"]) < DISTANCE_MINIMALE:
                if book["conf"] > dernier_livre["conf"]: livres_nettoyes[-1] = book
            else:
                livres_nettoyes.append(book)

    crops_in_memory = []
    for i, book in enumerate(livres_nettoyes):
        rect_points = order_points(book["box_points"])
        dst_pts = np.array([[0, 0], [book["width"] - 1, 0], [book["width"] - 1, book["height"] - 1], [0, book["height"] - 1]], dtype="float32")
        M = cv2.getPerspectiveTransform(rect_points, dst_pts)
        warped_crop = cv2.warpPerspective(img_clean, M, (book["width"], book["height"]))
        crops_in_memory.append(warped_crop)
        
        cv2.drawContours(img, [book["box_points"]], 0, (0, 255, 0), 2)
        cv2.putText(img, f"#{i+1}", (book["box_points"][0][0], book["box_points"][0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    _, buffer = cv2.imencode('.jpg', img)
    img_str = base64.b64encode(buffer).decode("utf-8")

    return {
        "status": "success",
        "book_count": len(livres_nettoyes),
        "image_base64": f"data:image/jpeg;base64,{img_str}"
    }