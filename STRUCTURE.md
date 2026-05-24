# 📁 Structure du projet Book Aura Scan

## 🌳 Arborescence Simplifiée

```
📦 book-aura-scan-main/
│
├── 🐍 Backend Python (FastAPI)
│   ├── main.py                          ← Serveur FastAPI (endpoints /detect, /segment)
│   ├── requirements.txt                  ← Dépendances Python
│   ├── src/
│   │   └── modelia/
│   │       ├── best.pt                  ← Modèle YOLOv11 (classification de livres)
│   │       └── segmentation.py          ← Fonctions post-traitement (redressement images, OCR)
│
├── 🎨 Frontend React/TypeScript (Web & Mobile)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppNav.tsx               ← Navigation
│   │   │   └── ui/                      ← Composants Radix UI
│   │   ├── hooks/
│   │   │   └── use-mobile.tsx           ← Hook détection mobile
│   │   ├── lib/
│   │   │   ├── ConnecBase.ts            ← Connexion base de données
│   │   │   ├── error-capture.ts         ← Gestion erreurs
│   │   │   ├── error-page.ts            ← Pages d'erreur
│   │   │   ├── mock-data.ts             ← Données de test
│   │   │   └── utils.ts                 ← Utilitaires
│   │   ├── routes/                      ← Pages (TanStack Router)
│   │   │   ├── __root.tsx               ← Layout racine
│   │   │   ├── index.tsx                ← Accueil
│   │   │   ├── scanner.tsx              ← 📸 Scanner (capture caméra)
│   │   │   ├── bibliotheque.tsx         ← 📚 Bibliothèque (liste livres)
│   │   │   ├── gestion.tsx              ← ⚙️ Gestion
│   │   │   └── a-propos.tsx             ← ℹ️ À propos
│   │   ├── mobile-main.tsx              ← Point d'entrée mobile
│   │   ├── router.tsx                   ← Configuration routeur
│   │   ├── server.ts                    ← Serveur SSR
│   │   └── start.ts                     ← Démarrage
│
├── 📱 App Mobile (Capacitor + Android)
│   ├── App/
│   │   ├── capacitor.config.ts          ← Config Capacitor
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── api-config.ts        ← Config URL backend FastAPI
│   │   │   └── services/
│   │   │       └── camera-service.ts    ← Service caméra
│   │   └── android/                     ← Code Android natif
│   │       ├── app/                     ← App APK
│   │       └── gradle.properties        ← Config Gradle
│
├── ⚙️ Configuration
│   ├── package.json                     ← Dépendances NPM
│   ├── tsconfig.json                    ← Config TypeScript
│   ├── vite.config.ts                   ← Config Vite (Web)
│   ├── vite.mobile.config.ts            ← Config Vite (Mobile)
│   ├── eslint.config.js                 ← Linter ESLint
│   ├── .prettierrc                      ← Formatage Prettier
│   ├── components.json                  ← Config Shadcn/UI
│   ├── wrangler.jsonc                   ← Config Cloudflare Workers
│   ├── index-mobile.html                ← Template HTML mobile
│   └── bun.lock / package-lock.json     ← Lock files
│
└── 📦 Dépendances
    └── node_modules/                    ← Packages NPM (ignoré git)

```

## 🔗 Architecture

### **Backend (Python - Serveur)**
```
FastAPI Server (Port 8000)
│
├── GET /health                          → Vérifier l'état du serveur
├── POST /detect                         → Détection d'objets (retour bounding boxes)
└── POST /segment                        → Segmentation (retour images redressées)
    └── Utilise: YOLO (best.pt) + OpenCV
```

### **Frontend (React - Client)**
```
App React
│
├── Scanner (scanner.tsx)
│   └── Capture → Envoie image au backend /detect → Affiche résultats
│
├── Bibliothèque (bibliotheque.tsx)
│   └── Liste des livres détectés
│
├── Gestion (gestion.tsx)
│   └── Gestion des données
│
└── À propos (a-propos.tsx)
    └── Info app + stack tech
```

## 🚀 Stack Technologique

| Couche | Technologies |
|--------|-------------|
| **Backend** | FastAPI, Python, YOLO v11, OpenCV, Pillow |
| **Frontend** | React, TypeScript, TanStack Router, Vite |
| **Mobile** | Capacitor, Android, Gradle |
| **UI** | Shadcn/UI, Radix UI, Tailwind CSS |
| **Base Données** | SQL.js (en mémoire) |
| **Build** | Vite, Bun |
| **Déploiement** | Cloudflare Workers |

## 📊 Flux de données

```
📱 User (Mobile App)
    ↓
📸 Capture image (camera-service.ts)
    ↓
🔄 Envoie à backend FastAPI
    ↓
🤖 YOLO détecte/segmente
    ↓
📐 Post-traitement (segmentation.py)
    ↓
📤 Retour images redressées
    ↓
💾 Sauvegarde en base (ConnectBase.ts)
    ↓
📚 Affichage bibliothèque
```

## 🔧 Commandes principales

```bash
# Development
npm run dev                     # Web dev
npm run dev:mobile             # Mobile dev

# Build
npm run build                  # Build web
npm run build:mobile           # Build mobile
npm run build:android          # Build Android APK

# Backend
python main.py                 # Lancer serveur FastAPI (dev)
uvicorn main:app               # Lancer serveur FastAPI (production)

# Mobile
npm run cap:sync               # Sync config Capacitor
npm run cap:open               # Ouvrir Android Studio
npm run cap:run                # Run sur device/émulateur
```

## 📝 Fichiers clés à connaître

| Fichier | Rôle |
|---------|------|
| `main.py` | Cœur du backend (FastAPI + YOLO) |
| `src/routes/scanner.tsx` | Interface capture photo |
| `App/src/config/api-config.ts` | URL du backend |
| `src/modelia/segmentation.py` | Post-traitement images |
| `package.json` | Dépendances frontend |

---

✅ **Le projet est prêt à développer!**
