# App/resources/ — Sources graphiques BIBLIA-TECH

Ce dossier contient les **sources** des icônes et du splash screen.
`@capacitor/assets` génère automatiquement toutes les tailles requises par Android.

---

## Fichiers sources requis

| Fichier | Dimensions | Format | Usage |
|---------|-----------|--------|-------|
| `icon.png` | **1024 × 1024** px | PNG 32 bits (avec transparence) | Icône de l'app |
| `splash.png` | **2732 × 2732** px | PNG sans transparence | Splash screen |

> Les fichiers SVG (`icon.svg`, `splash.svg`) sont fournis comme **sources vectorielles**.
> Il faut les convertir en PNG avant de générer les assets.

---

## Étape 1 — Convertir SVG → PNG

### Option A : avec Inkscape (gratuit, Windows)
```bash
# Installer Inkscape : https://inkscape.org/
inkscape icon.svg   --export-type=png --export-filename=icon.png   --export-width=1024 --export-height=1024
inkscape splash.svg --export-type=png --export-filename=splash.png --export-width=2732 --export-height=2732
```

### Option B : avec SVGR / sharp (Node.js)
```bash
npm install -g sharp-cli
sharp -i icon.svg   -o icon.png   resize 1024 1024
sharp -i splash.svg -o splash.png resize 2732 2732
```

### Option C : convertisseur en ligne
- https://svgtopng.com
- Régler la taille à 1024×1024 pour l'icône, 2732×2732 pour le splash.

---

## Étape 2 — Générer toutes les tailles Android

Depuis le dossier **App/** :

```bash
cd App
npm install              # si pas encore fait
npm run assets
```

Cette commande (`npx @capacitor/assets generate`) lit `resources/icon.png` et
`resources/splash.png` et génère automatiquement :

```
android/app/src/main/res/
├── mipmap-mdpi/    ic_launcher.png        (48 × 48)
├── mipmap-hdpi/    ic_launcher.png        (72 × 72)
├── mipmap-xhdpi/   ic_launcher.png        (96 × 96)
├── mipmap-xxhdpi/  ic_launcher.png       (144 × 144)
├── mipmap-xxxhdpi/ ic_launcher.png       (192 × 192)
│   (+ round, foreground, background variants)
├── drawable/       splash.png           (2732 × 2732)
└── drawable-land/  splash.png
```

---

## Palette de couleurs

| Rôle | Valeur | Couleur |
|------|--------|---------|
| Fond icône | `#3d6b51` | Sauge foncé (primary) |
| Fond splash | `#e8e0cf` | Lin beige (background) |
| Texte/détails | `#2a4d39` | Sauge très foncé |
| Accent | `#c4956a` | Terracotta |

---

## Notes

- L'icône **ne doit pas avoir de coins arrondis dans le PNG source** — Android
  applique le masque adaptatif selon le launcher de l'appareil.
- Le splash **doit avoir un fond uni** (pas de transparence) pour éviter un
  flash blanc au démarrage.
- Ces fichiers sont ignorés par git (`android/app/src/main/res/` est dans `.gitignore`).
  Regénérez-les après chaque `git clone` ou changement graphique.
