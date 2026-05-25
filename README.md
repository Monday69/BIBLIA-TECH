# BIBLIA-TECH — Scanner intelligent de bibliothèque

> Projet de semestre — Majeure Intelligence Artificielle  
> **Matteo BERGERON · Matteo BOMBRUN · Tom VALETTE**

---

## Présentation

BIBLIA-TECH est une application web/mobile permettant de vérifier automatiquement l'ordre des livres sur une étagère grâce à la vision par ordinateur.

L'utilisateur photographie une étagère ; l'application :
1. **Segmente** chaque tranche de livre avec un modèle YOLO entraîné sur mesure.
2. **Lit** les titres/auteurs avec PaddleOCR (OCR optimisé pour les textes en biais).
3. **Compare** les résultats à la base de données de la bibliothèque (importée en amont).
4. **Affiche** un rapport coloré : livres bien placés, mal placés, non reconnus ou illisibles.

L'application tourne en mode web (navigateur) et en mode natif Android via Capacitor.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19, TypeScript, TanStack Router, Tailwind CSS, Shadcn/UI |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Vision | YOLO v11 (Ultralytics) — modèle fine-tuné `best.pt` |
| OCR | PaddleOCR 2.9.1 + PaddlePaddle 2.6.2 (conda) |
| Matching | RapidFuzz (token_set_ratio + token_sort_ratio) |
| Marqueurs | ArUco (OpenCV) — détection automatique de l'étagère |
| Base de données | Fichier SQLite importé → stocké en localStorage (sql.js) |
| Mobile | Capacitor 7 (Android) |
| Build | Vite 6 |

---

## Arborescence du projet

```
book-aura-scan/
│
├── main.py                     # Point d'entrée FastAPI — expose /segment et /ocr
├── requirements.txt            # Dépendances Python (pip + conda pour PaddlePaddle)
│
├── package.json                # Dépendances Node.js du frontend React
├── vite.config.ts              # Configuration Vite (alias, plugins, build)
├── tsconfig.json               # Configuration TypeScript
├── tailwind.config.ts          # Configuration Tailwind CSS
├── index.html                  # Shell HTML SPA — mode web
├── index-mobile.html           # Shell HTML SPA — mode mobile (Capacitor)
│
├── src/                        # Code source du frontend React
│   │
│   ├── routes/                 # Pages de l'application (TanStack Router)
│   │   ├── __root.tsx          # Layout racine : barre de navigation + outlet
│   │   ├── index.tsx           # Page d'accueil — tableau de bord et statistiques
│   │   ├── scanner.tsx         # Page scanner — segmentation YOLO + OCR PaddleOCR
│   │   ├── bibliotheque.tsx    # Page bibliothèque — import du fichier .db SQLite
│   │   ├── gestion.tsx         # Page gestion — visualisation et édition des livres
│   │   └── a-propos.tsx        # Page à propos — description du projet
│   │
│   ├── components/             # Composants React réutilisables
│   │   ├── AppNav.tsx          # Navigation principale (desktop sidebar + mobile bottom bar)
│   │   ├── BookGallery.tsx     # Galerie plein écran pour gérer les crops de livres
│   │   ├── SplashScreen.tsx    # Écran de démarrage animé (mode mobile uniquement)
│   │   └── ui/                 # Bibliothèque de composants Shadcn/UI (Button, Card, Badge…)
│   │
│   ├── lib/                    # Utilitaires et couche de données frontend
│   │   ├── ConnecBase.ts       # Accès aux données : import SQLite via sql.js,
│   │   │                       # lecture/écriture localStorage, export Capacitor Filesystem
│   │   ├── utils.ts            # Helpers génériques (cn pour Tailwind, etc.)
│   │   ├── mock-data.ts        # Données de démonstration pour la page d'accueil
│   │   ├── error-capture.ts    # Capture globale des erreurs non gérées
│   │   └── error-page.ts       # Page d'erreur générique
│   │
│   ├── modelia/                # Modules Python d'intelligence artificielle (backend)
│   │   ├── segmentation.py     # Pipeline YOLO : détection ArUco + segmentation des livres
│   │   │                       # + extraction des crops + annotation de l'image
│   │   ├── ocr_analysis.py     # Pipeline OCR : PaddleOCR + fuzzy matching (RapidFuzz)
│   │   │                       # + comparaison au catalogue + rapport coloré par statut
│   │   └── best.pt             # Poids du modèle YOLO entraîné sur les tranches de livres
│   │
│   ├── router.tsx              # Configuration des routes TanStack Router
│   ├── mobile-main.tsx         # Point d'entrée React — mode mobile (Capacitor)
│   ├── start.ts                # Point d'entrée React — mode web
│   ├── routeTree.gen.ts        # Arbre de routes généré automatiquement (ne pas éditer)
│   └── styles.css              # Styles globaux Tailwind CSS + polices
│
└── App/                        # Shell Capacitor pour le build Android
    ├── capacitor.config.ts     # Configuration Capacitor (appId, plugins SplashScreen/StatusBar)
    ├── package.json            # Dépendances Capacitor (@capacitor/android, camera, filesystem…)
    ├── android/                # Projet Android Studio généré par `npx cap add android`
    │   └── app/src/main/       # Manifeste Android, fichiers Gradle, ressources
    ├── www/                    # Build React copié ici par `npx cap sync` avant chaque APK
    └── icons/                  # Icônes et splash screen générés par `npx @capacitor/assets`
```

---

## Prérequis

### Backend Python
- **Anaconda** (recommandé) avec un environnement Python 3.11 64-bit
- GPU NVIDIA avec CUDA (optionnel, améliore les performances OCR)

### Frontend
- Node.js ≥ 18
- npm ≥ 9

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/marmat3/book-aura-scan.git
cd book-aura-scan
```

### 2. Environnement Python (backend)

Créer et activer l'environnement conda :

```bash
conda create -n ocr_env python=3.11
conda activate ocr_env
```

Installer PaddlePaddle via conda (non disponible sur PyPI) :

```bash
conda install paddlepaddle==2.6.2 -c paddle -c conda-forge
```

Installer les autres dépendances Python :

```bash
pip install -r requirements.txt
```

> **Note GPU :** Pour activer l'accélération GPU, installer `paddlepaddle-gpu` à la place
> et s'assurer que CUDA et cuDNN sont installés.

### 3. Dépendances Node.js (frontend)

```bash
npm install
```

---

## Lancer l'application

### Backend FastAPI

Depuis la racine du projet, avec l'environnement `ocr_env` activé :

```bash
conda activate ocr_env
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

L'API sera disponible sur `http://localhost:8000`.  
Documentation interactive : `http://localhost:8000/docs`

> **Premier démarrage :** PaddleOCR télécharge ses modèles (~200 Mo) à la première exécution.
> Le chargement prend environ 15–30 secondes. Les appels suivants sont instantanés.

### Frontend React (mode web)

Dans un second terminal :

```bash
npm run dev
```

Ouvrir `http://localhost:5173` dans le navigateur.

### Adresse IP du backend (réseau local / mobile)

L'adresse du serveur est configurée dans [src/routes/scanner.tsx](src/routes/scanner.tsx) :

```typescript
const API_BASE_URL = "http://<IP_DU_PC>:8000";
```

Remplacer `<IP_DU_PC>` par l'adresse IP locale du PC hébergeant le backend.

---

## Build Android

Le build Android utilise Capacitor. Les commandes se lancent depuis le dossier `App/` :

```bash
cd App
npm install
```

| Commande | Description |
|---|---|
| `npm run add:android` | Génère le projet Android (une seule fois) |
| `npm run assets` | Génère les icônes et splash screens |
| `npm run sync` | Copie le build React vers `App/www/` et synchronise Android |
| `npm run open` | Ouvre Android Studio |
| `npm run run:android` | Lance l'app sur un appareil connecté |

Avant chaque `sync`, générer le build mobile depuis la racine :

```bash
npm run build:mobile
```

---

## Endpoints API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/health` | Vérification de l'état du serveur |
| `POST` | `/segment` | Segmentation YOLO d'une image d'étagère |
| `POST` | `/ocr` | Segmentation + OCR + comparaison catalogue |

### POST `/segment`

- **Corps :** `multipart/form-data` avec le champ `file` (image JPG/PNG)
- **Réponse :** image annotée en base64, crops individuels, coordonnées des boîtes, ID étagère (ArUco), timings

### POST `/ocr`

- **Corps :** `multipart/form-data` avec `file` (image) et `catalog` (JSON du catalogue localStorage)
- **Réponse :** résultats par livre (statut, titre, auteur, score), image annotée colorée, résumé, timings

---

## Fonctionnement de la détection

### 1. Détection ArUco
Un marqueur ArUco collé sur l'étagère permet d'identifier automatiquement son numéro. Si aucun marqueur n'est détecté, le système compare avec l'ensemble du catalogue.

### 2. Segmentation YOLO
Le modèle `best.pt` a été entraîné pour détecter les tranches de livres. Chaque détection est filtrée par ratio d'aspect (hauteur/largeur > 2) et dédoublonnée par position horizontale.

### 3. OCR PaddleOCR
Chaque tranche est redressée par correction de perspective (warp affine), prétraitée (CLAHE, agrandissement ×2, padding), puis analysée dans les deux orientations si nécessaire.

### 4. Matching flou
Le texte OCR est comparé au catalogue via RapidFuzz :
```
score = token_set_ratio × 0.8 + token_sort_ratio × 0.2
```
Un seuil de 60 % détermine si un livre est reconnu.

### 5. Statuts de résultat

| Statut | Couleur | Signification |
|---|---|---|
| `correct` | Vert | Livre reconnu et à la bonne position |
| `wrong_position` | Orange | Livre reconnu mais mal placé |
| `not_expected` | Rouge | Texte lu mais non trouvé dans le catalogue |
| `unreadable` | Gris | Tranche illisible par l'OCR |

---

## Base de données

La base de données est un fichier SQLite contenant trois tables :

```
Etageres  (id, label, nb_livres_attendus)
Livres    (id, titre, auteur)
Positions (etagere_id, position_index, livre_id)
```

Elle est importée depuis la page **Bibliothèque** de l'application (fichier `.db`) et stockée dans le `localStorage` du navigateur via `sql.js`. À chaque analyse OCR, le catalogue est sérialisé en JSON et envoyé avec la requête au backend — aucun fichier n'est requis côté serveur.

---

## Variables de configuration

| Fichier | Variable | Description |
|---|---|---|
| `src/routes/scanner.tsx` | `API_BASE_URL` | Adresse du serveur FastAPI |
| `src/modelia/segmentation.py` | `CONF_THRESHOLD` | Seuil de confiance YOLO (défaut : 0.55) |
| `src/modelia/segmentation.py` | `ASPECT_RATIO_MIN` | Ratio h/w minimum pour valider un livre (défaut : 2.0) |
| `src/modelia/ocr_analysis.py` | `FUZZY_SEUIL` | Score minimum pour valider un match (défaut : 60) |
| `App/capacitor.config.ts` | `appId` | Identifiant Android de l'application |

---

## Auteurs

| Nom | Rôle |
|---|---|
| **Matteo BERGERON** | Backend IA (YOLO, OCR), architecture FastAPI, intégration frontend-backend |
| **Matteo BOMBRUN** | Frontend React (UI/UX, pages, composants), build mobile Capacitor |
| **Tom VALETTE** | Entraînement du modèle YOLO, collecte et annotation des données |

---

*Projet de semestre — Majeure Intelligence Artificielle — 2025/2026*
