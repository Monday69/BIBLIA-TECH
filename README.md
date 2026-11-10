# BIBLIA-TECH

**Une application intelligente de scanning et reconnaissance de livres utilisant l'IA (YOLO + OCR)**

> Projet de semestre en Majeure Intelligence Artificielle - Année 2026

---

## À propos

**BIBLIA-TECH** est une application full-stack qui permet de scanner des livres via caméra et d'en extraire automatiquement les informations (titre, auteur, ISBN, etc.) grâce à des modèles de vision par ordinateur avancés.

### Fonctionnalités principales
- **Scanner intelligent** : Capture et détection de livres via caméra (web & mobile)
- **Détection YOLO** : Segmentation précise des livres dans les images
- **Reconnaissance OCR** : Extraction du texte et des informations des couvertures
- **Bibliothèque** : Gestion et consultation des livres détectés
- **Validation BDD** : Vérification des informations contre une base de données SQLite
- **Application mobile** : Support Android via Capacitor

---

## Fait par :

- **Tom Vallette**
- **Matteo Bombrun**
- **Matteo Bergeron**

---


### Stack Technologique

| Domaine | Technologies |
|---------|--------------|
| **Frontend** | React 18, TypeScript, TanStack Start, Vite |
| **Mobile** | Capacitor, Android, React Native Web |
| **Backend** | Python, FastAPI, Uvicorn |
| **ML/CV** | YOLO v11 (ultralytics), PaddleOCR, OpenCV |
| **Deep Learning** | PyTorch 2.3, TorchVision |
| **Styling** | Tailwind CSS, Shadcn/UI, Radix UI |
| **Database** | SQLite |
| **Deployment** | Cloudflare Workers (optional) |

### Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)              │
│         Web (Vite) + Mobile (Capacitor/Android)         │
└────────────────────────┬────────────────────────────────┘
                         │
                  HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────┐
│            Backend (FastAPI - Python)                   │
│  Endpoints: /segment (YOLO) /ocr (OCR) /health         │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼──────┐   ┌────▼────┐
   │YOLO v11 │    │ PaddleOCR  │   │  OpenCV │
   │best.pt  │    │ (OCR)      │   │(Traite.)│
   └─────────┘    └────────────┘   └────┬────┘
                                        │
                                   ┌────▼────┐
                                   │SQLite DB│
                                   └─────────┘
```

---

## Structure du projet

```
book-aura-scan-main/
├── Backend
│   ├── main.py                 # Serveur FastAPI
│   ├── requirements.txt         # Dépendances Python
│   └── src/modelia/
│       ├── best.pt            # Modèle YOLO v11
│       ├── segmentation.py    # Détection + segmentation
│       └── ocr_analysis.py    # OCR + validation BDD
│
├── Frontend
│   ├── src/
│   │   ├── components/        # Composants React
│   │   ├── routes/           # Pages (TanStack Router)
│   │   ├── lib/              # Utilitaires & services
│   │   ├── mobile-main.tsx   # Point d'entrée mobile
│   │   └── router.tsx        # Configuration routeur
│   ├── vite.config.ts        # Config web
│   ├── vite.mobile.config.ts # Config mobile
│   └── package.json
│
├── App Mobile
│   ├── App/capacitor.config.ts
│   ├── App/android/          # Code natif Android
│   └── App/src/
│       ├── config/
│       └── services/
│
└── Configuration
    ├── tsconfig.json
    ├── eslint.config.js
    └── components.json
```

---

## Projet lié : entraînement OCR

Les scripts de génération de données synthétiques et de fine-tuning TrOCR sur des tranches de livres (jusqu'à 76 500 images) sont dans un dépôt séparé : [trocr-book-spines](https://github.com/Monday69/trocr-book-spines).

---

## Installation

### Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (v18+) - [Télécharger](https://nodejs.org/)
- **Python** (v3.10+) - [Télécharger](https://www.python.org/)
- **Git** - [Télécharger](https://git-scm.com/)
- **pip** (gestionnaire de packages Python)
- **npm** (gestionnaire de packages Node)

#### Pour Android (optionnel)
- **Android Studio** - [Télécharger](https://developer.android.com/studio)
- **Java Development Kit (JDK)** 11+
- **Android SDK**

### Étape 1 : Cloner le repository

```bash
git clone https://github.com/your-repo/book-aura-scan.git
cd book-aura-scan-main
```

### Étape 2️ : Configuration du Backend (FastAPI + Python)

#### 2.1 Créer un environnement virtuel Python

```bash
# Créer l'environnement
python -m venv venv

# Activer l'environnement
# Sur Windows :
venv\Scripts\activate

# Sur macOS/Linux :
source venv/bin/activate
```

#### 2.2 Installer les dépendances Python

```bash
pip install -r requirements.txt
```


#### 2.3 Vérifier l'installation

```bash
python -c "import torch; print(f'PyTorch OK: {torch.__version__}')"
python -c "import cv2; print(f'OpenCV OK: {cv2.__version__}')"
python -c "from ultralytics import YOLO; print('YOLO OK')"
```

#### 2.4 Lancer le serveur FastAPI

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

 Le serveur démarre sur `http://localhost:8000`


### Étape 3️ : Configuration du Frontend (React + Node)

#### 3.1 Installer les dépendances Node

Dans un **nouveau terminal** (sans fermer le backend) :

```bash
npm install
```

#### 3.2 Lancer le serveur de développement

```bash
npm run dev
```

Le frontend démarre sur le port indiqué

---

## Utilisation

### Mode Web (Développement)

1. **Démarrer le backend** (Terminal 1)
   ```bash
   cd /chemin/vers/project
   venv\Scripts\activate  # Windows
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Démarrer le frontend** (Terminal 2)
   ```bash
   npm run dev
   ```

3. **Accéder à l'application**
   ```
   http://localhost:5173
   ```

4. **Utiliser la caméra**
   - Allez à la page **Scanner**
   - Donnez accès à votre caméra
   - Pointez vers un livre pour le détecter

### Mode Mobile (Android)

#### 4.1 Préparation (une seule fois)

```bash
npm run build:mobile
npm run sync:android
npm run cap:open  # Ouvre Android Studio
```

#### 4.2 Build et déploiement

```bash
# Build pour Android
npm run build:android

# ou directement sur appareil/émulateur
npm run dev:android
```

---

##  Dépendances clés

### Backend (Python)
- **fastapi** - Framework web moderne
- **uvicorn** - Serveur ASGI
- **ultralytics** - YOLO v11 pour la détection
- **opencv-python** - Traitement d'image
- **paddleocr** - Reconnaissance optique de caractères
- **torch** - Deep Learning
- **pillow** - Traitement d'image

### Frontend (Node)
- **react** - Framework UI
- **typescript** - Typage statique
- **tanstack-start** - Framework full-stack
- **vite** - Bundler ultra-rapide
- **tailwindcss** - Styling utility-first
- **shadcn/ui** - Composants UI de haut niveau
- **radix-ui** - Composants accessibles

---




##  Scripts npm disponibles

```bash
npm run dev           # Démarrer le frontend (mode dev)
npm run build         # Build pour production
npm run preview       # Prévisualiser la build
npm run format        # Formater le code

# Mobile (Android)
npm run dev:mobile              # Dev mode mobile
npm run build:mobile            # Build APK
npm run build:android           # Build complet pour Android
npm run sync:android            # Synchroniser avec Capacitor
npm run cap:open                # Ouvrir Android Studio
npm run cap:run                 # Lancer sur appareil/émulateur
```



---

**Dernière mise à jour** : Mai 2026

