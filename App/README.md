# BIBLIA-TECH — Guide de build Android

Guide complet pour transformer le projet React en APK Android installable.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Installation (première fois)](#2-installation-première-fois)
3. [APK Debug](#3-apk-debug)
4. [APK Release signé](#4-apk-release-signé)
5. [Tester sur un téléphone USB](#5-tester-sur-un-téléphone-usb)
6. [Live reload pendant le développement](#6-live-reload-pendant-le-développement)
7. [Partager l'APK](#7-partager-lapk)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prérequis

### Android Studio
1. Télécharger sur https://developer.android.com/studio
2. Installer en gardant les options par défaut
3. Ouvrir Android Studio → **Tools → SDK Manager**
4. Cocher **Android SDK Platform** pour Android 14 (API 34) minimum
5. Cocher **Android SDK Build-Tools** pour la même version
6. Appliquer et laisser le téléchargement se terminer

### JDK 17 (inclus avec Android Studio)
Android Studio installe son propre JDK. Si vous utilisez Gradle en ligne de
commande, définir la variable d'environnement :
```
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

### Variables d'environnement à ajouter dans le PATH Windows
```
C:\Users\VotreNom\AppData\Local\Android\Sdk\platform-tools
C:\Users\VotreNom\AppData\Local\Android\Sdk\tools\bin
```
(Paramètres Windows → Variables d'environnement → Path → Nouveau)

### Node.js
Version ≥ 18 requis. Vérifier : `node --version`

---

## 2. Installation (première fois)

### Étape 2.1 — Installer les dépendances du projet principal

```bash
# Depuis la RACINE du projet (book-aura-scan-main/)
npm install
```

Cela installe :
- `@capacitor/core` et `@capacitor/filesystem` (utilisés par ConnecBase.ts)
- `sql.js` (bundlé localement dans l'APK pour fonctionner hors ligne)

### Étape 2.2 — Installer les dépendances Capacitor

```bash
# Depuis App/
cd App
npm install
```

Cela installe :
- `@capacitor/cli` (commande `npx cap`)
- `@capacitor/android` (le projet Android natif)
- Tous les plugins : camera, filesystem, network, etc.

### Étape 2.3 — Initialiser le projet Android

```bash
# Depuis App/ — à lancer UNE SEULE FOIS
npm run add:android
```

Cela génère `App/android/` avec le projet Android Studio complet.

### Étape 2.4 — Ajouter les permissions dans AndroidManifest.xml

Éditer `App/android/app/src/main/AndroidManifest.xml` et ajouter
**dans `<manifest>`** (avant `<application>`) :

```xml
<!-- Réseau (sql.js CDN + backend FastAPI) -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Caméra (onglet Scanner) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Stockage externe (sauvegarde base de données) -->
<!-- Android < 10 seulement — Directory.External n'en a pas besoin sur Android 10+ -->
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission
    android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
```

### Étape 2.5 — Configurer la sécurité réseau HTTP (backend FastAPI local)

Pour autoriser les appels HTTP vers votre serveur FastAPI local (non HTTPS) :

Créer `App/android/app/src/main/res/xml/network_security_config.xml` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Autorise HTTP uniquement vers les IP locales (développement) -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.0.0/16</domain>
        <domain includeSubdomains="true">10.0.0.0/8</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
```

Puis dans `AndroidManifest.xml`, dans la balise `<application>` :
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

### Étape 2.6 — Générer les icônes et le splash screen

```bash
# 1. Convertir les SVG en PNG (voir App/resources/README.md)
# 2. Placer icon.png (1024x1024) et splash.png (2732x2732) dans App/resources/
# 3. Depuis App/ :
npm run assets
```

---

## 3. APK Debug

Un APK debug est signé automatiquement avec une clé de développement Android.
Il peut être installé sur n'importe quel téléphone (avec "Sources inconnues" activé).

### Via les scripts npm (recommandé)

```bash
# Depuis la RACINE du projet
npm run build:android
# → Build React SPA → App/www/
# → Copie sql-asm.js → App/www/sql-asm.js
# → Synchronise App/www/ → App/android/ (npx cap sync)
# → Ouvre Android Studio
```

Dans Android Studio :
**Build → Build Bundle(s) / APK(s) → Build APK(s)**

L'APK est généré dans :
```
App/android/app/build/outputs/apk/debug/app-debug.apk
```

### Via Gradle (sans Android Studio)

```bash
# Depuis la RACINE du projet
npm run build:mobile      # Build SPA + copie sql-asm.js
npm run cap:sync          # Synchronise dans android/

# Depuis App/android/
cd App/android
.\gradlew.bat assembleDebug
# APK : app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. APK Release signé

Un APK release est obligatoire pour le Play Store et recommandé pour la distribution.

### Étape 4.1 — Générer le keystore (une seule fois !)

> ⚠️ **Le keystore est irremplaçable.** Si vous le perdez, vous ne pourrez plus
> mettre à jour votre app sur le Play Store. Sauvegardez-le dans plusieurs endroits.

```bash
keytool -genkey -v `
  -keystore App/android/app/biblia-tech-release.keystore `
  -alias biblia-tech `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

Remplir les informations demandées (nom, organisation, pays...).
Choisir un mot de passe fort et le noter quelque part de sûr.

### Étape 4.2 — Configurer la signature

Créer `App/android/key.properties` (ce fichier est dans .gitignore) :
```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE_CLE
keyAlias=biblia-tech
storeFile=biblia-tech-release.keystore
```

Éditer `App/android/app/build.gradle` — ajouter avant `android {` :
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Dans le bloc `android { ... }`, ajouter :
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Étape 4.3 — Builder l'APK release

```bash
cd App/android
.\gradlew.bat assembleRelease
# APK : app/build/outputs/apk/release/app-release.apk
```

### Avant de publier en production

Dans `App/capacitor.config.ts` :
- Mettre `webContentsDebuggingEnabled: false`
- S'assurer que `server.url` est commenté

---

## 5. Tester sur un téléphone connecté en USB

### Activer le débogage USB sur le téléphone

1. **Paramètres → À propos du téléphone**
2. Appuyer **7 fois** sur "Numéro de build" → "Vous êtes maintenant développeur"
3. **Paramètres → Options de développement**
4. Activer **Débogage USB**
5. Connecter via USB → Accepter la demande d'autorisation sur le téléphone

### Vérifier que le téléphone est détecté

```bash
adb devices
# Doit afficher : XXXXXXXX  device
```

### Installer l'APK directement

```bash
adb install App/android/app/build/outputs/apk/debug/app-debug.apk
```

### Ou via Android Studio

Dans Android Studio, sélectionner votre appareil dans la liste déroulante
et cliquer **Run ▶** (ou Shift+F10).

---

## 6. Live reload pendant le développement

Le live reload permet de voir les changements React en temps réel sur
le téléphone, sans recompiler l'APK.

### Étape 1 — Démarrer le serveur de développement

```bash
# Depuis la RACINE du projet
npm run dev:mobile
# Affiche : "Network: http://192.168.1.XX:5173"
# Notez votre IP locale
```

### Étape 2 — Configurer l'URL dans Capacitor

Dans `App/capacitor.config.ts`, décommenter et adapter :
```ts
server: {
  url: "http://192.168.1.XX:5173",  // ← votre IP
  cleartext: true,
}
```

### Étape 3 — Synchroniser et lancer sur le téléphone

```bash
# Depuis App/
npm run sync   # = npx cap sync android
npm run run:android  # = npx cap run android
```

Chaque fois que vous sauvegardez un fichier `.tsx`, la page se recharge
automatiquement sur le téléphone (~1 seconde de délai).

### ⚠️ Avant de générer l'APK final

Recommenter les lignes `server.url` et `cleartext` dans `capacitor.config.ts`.
Sans ça, l'APK ne fonctionnerait que sur votre réseau WiFi.

---

## 7. Partager l'APK

### Envoi direct (sans Play Store)

L'APK debug se trouve dans :
```
App/android/app/build/outputs/apk/debug/app-debug.apk
```

Options pour partager :
- **Email / Drive / WeTransfer** : envoyer le fichier .apk directement
- **ADB** : `adb install app-debug.apk` (nécessite débogage USB)
- **QR Code** : héberger l'APK sur un serveur et générer un QR code vers l'URL

### Sur le téléphone destinataire

1. Activer **Paramètres → Sécurité → Sources inconnues** (ou "Installer des apps inconnues")
2. Ouvrir le fichier .apk reçu → Installer
3. Android peut afficher un avertissement "Play Protect" → "Installer quand même"

### Pour une distribution plus large

Publier sur le Google Play Store (nécessite un compte développeur à 25 $) :
https://play.google.com/console

---

## 8. Troubleshooting

### ❌ `npx cap add android` échoue avec "No Capacitor project found"

**Cause** : La commande est lancée depuis le mauvais répertoire.
**Solution** : S'assurer d'être dans `App/` (où se trouve `capacitor.config.ts`).
```bash
cd App
npm run add:android
```

### ❌ `npm run build:mobile` échoue avec "routeTree.gen.ts introuvable"

**Cause** : Le fichier de routes auto-généré n'existe pas encore.
**Solution** : Lancer une fois le serveur web principal pour le générer :
```bash
npm run dev   # laisser démarrer, puis Ctrl+C
npm run build:mobile
```

### ❌ `npm run build:mobile` échoue avec "sql-asm.js introuvable"

**Cause** : `sql.js` n'est pas installé.
**Solution** :
```bash
npm install   # depuis la racine du projet
npm run build:mobile
```

### ❌ Gradle build échoue avec "SDK location not found"

**Cause** : Le fichier `local.properties` manque ou pointe vers le mauvais SDK.
**Solution** : Créer `App/android/local.properties` :
```properties
sdk.dir=C\:\\Users\\VotreNom\\AppData\\Local\\Android\\Sdk
```
(Remplacer `VotreNom` par votre nom d'utilisateur Windows)

### ❌ L'app se ferme au démarrage ("Unfortunately, BIBLIA-TECH has stopped")

**Cause** : Erreur JavaScript au chargement.
**Solution** : Connecter le téléphone en USB et ouvrir Chrome :
1. Aller sur `chrome://inspect`
2. Trouver votre téléphone et l'app BIBLIA-TECH
3. Cliquer "inspect" → voir la console d'erreurs

### ❌ L'import SQLite ne fonctionne pas sur Android

**Comportement attendu** : Sur Android, `showOpenFilePicker` n'est pas disponible.
L'app utilise automatiquement le sélecteur de fichiers HTML (`<input type="file">`).
Cliquer sur "Importer SQLite" doit ouvrir un sélecteur de fichiers natif Android.

Si ça ne s'ouvre pas : vérifier que le fichier .db est accessible (pas sur un
service cloud-only comme OneDrive en mode "en ligne uniquement").

### ❌ La sauvegarde échoue sur Android

**Comportement** : "Mettre à jour le fichier" sauvegarde dans :
```
/sdcard/Android/data/com.bibliatech.app/files/databaseLibrairie.db
```
Accessible via **Fichiers → Android → data → com.bibliatech.app → files**.

Si `@capacitor/filesystem` échoue : vérifier que `WRITE_EXTERNAL_STORAGE`
est dans AndroidManifest.xml (voir Étape 2.4).

### ❌ sql.js ne se charge pas ("Impossible de charger sql.js local")

**Cause** : `App/www/sql-asm.js` n'a pas été copié lors du build.
**Solution** :
```bash
npm run build:mobile   # le plugin copy-sqljs-for-android recopie sql-asm.js
npm run cap:sync
```

### ❌ "allowMixedContent" warnings dans les logs

Normal en développement. En production, passer tous les appels API en HTTPS
et mettre `allowMixedContent: false` dans `capacitor.config.ts`.

### ❌ DevTools Chrome ne voit pas l'app

Vérifier :
- `webContentsDebuggingEnabled: true` dans `capacitor.config.ts` (et relancer cap sync)
- USB debugging activé sur le téléphone
- Câble USB supportant le data (pas uniquement la charge)
- Autoriser la connexion sur le téléphone si une popup apparaît

---

## Structure des fichiers App/

```
App/
├── capacitor.config.ts      Configuration Capacitor (appId, plugins, server)
├── package.json             Dépendances Capacitor (CLI, plugins, assets)
├── tsconfig.json            TypeScript pour le dossier App/
├── .gitignore               Ignore www/, node_modules/, *.keystore, android/build/
├── android/                 ← Généré par "npm run add:android"
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml    À modifier (permissions)
│   │   │   ├── assets/public/         ← Contenu de www/ copié par cap sync
│   │   │   └── res/                   ← Icônes/splash générés par @capacitor/assets
│   │   └── build.gradle               À modifier (signing config pour release)
│   ├── local.properties               À créer (chemin SDK — gitignored)
│   └── build.gradle
├── www/                     ← Généré par "npm run build:mobile" (gitignored)
│   ├── index.html
│   ├── sql-asm.js           ← Copié depuis node_modules/sql.js/dist/
│   └── assets/              Scripts et styles React bundlés
├── resources/
│   ├── icon.svg             Source vectorielle de l'icône (à convertir en PNG)
│   ├── icon.png             ← À créer (1024×1024, voir resources/README.md)
│   ├── splash.svg           Source vectorielle du splash (à convertir en PNG)
│   ├── splash.png           ← À créer (2732×2732, voir resources/README.md)
│   └── README.md            Instructions de conversion SVG → PNG
└── src/
    ├── services/
    │   └── camera-service.ts  Abstraction caméra web+natif (prêt à intégrer)
    └── config/
        └── api-config.ts      Configuration URL backend FastAPI (prêt à intégrer)
```
