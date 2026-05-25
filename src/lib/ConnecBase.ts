/**
 * ConnecBase.ts
 * Couche d'accès aux données de la bibliothèque.
 * Stockage : localStorage (JSON).
 * Import    : fichier SQLite via sql.js (chargé depuis CDN sur web, bundlé sur natif).
 * Natif     : @capacitor/filesystem pour l'export sur Android/iOS.
 */

// ─── Types (miroir du schéma SQLite) ─────────────────────────────────────────

export type Etagere = {
  id: number;
  label: string;
  nb_livres_attendus: number;
};

export type Livre = {
  id: number;
  titre: string;
  auteur: string;
};

export type Position = {
  etagere_id: number;
  position_index: number;
  livre_id: number;
};

export type LivrePositionne = Livre & {
  etagere_id: number;
  position_index: number;
};

// ─── Clés localStorage ────────────────────────────────────────────────────────

const KEYS = {
  etageres: "bib_etageres",
  livres: "bib_livres",
  positions: "bib_positions",
} as const;

// ─── Helpers internes ─────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function nextId(list: { id: number }[]): number {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}

// ─── Helpers Capacitor (Android / iOS) ────────────────────────────────────────
// AUCUN import au niveau module : les imports sont dynamiques dans les fonctions
// ↳ garantit zéro code Capacitor dans le bundle Cloudflare Workers / SSR.

/**
 * Retourne true si le code s'exécute dans un wrapper Capacitor natif (Android/iOS).
 * Vérifie directement le bridge global injecté par Capacitor — pas d'import requis.
 * Toujours false en SSR (window indéfini) et dans un navigateur web ordinaire.
 */
function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  );
}

/**
 * Convertit un Uint8Array en chaîne Base64.
 * Requis par @capacitor/filesystem.writeFile() qui attend du Base64.
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Charge dynamiquement @capacitor/filesystem (uniquement sur natif).
 * L'import dynamique évite l'inclusion dans le bundle Cloudflare Workers.
 * Prérequis : npm install @capacitor/filesystem (dans le projet root).
 */
async function loadFilesystem() {
  // @vite-ignore : empêche Vite d'analyser statiquement cet import
  // (il ne sera jamais exécuté dans le build web / Cloudflare).
  return import(/* @vite-ignore */ "@capacitor/filesystem");
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

export function getEtageres(): Etagere[] {
  return load<Etagere>(KEYS.etageres);
}

export function getLivres(): Livre[] {
  return load<Livre>(KEYS.livres);
}

export function getPositions(): Position[] {
  return load<Position>(KEYS.positions);
}

export function getLivresByEtagere(etagereId: number): LivrePositionne[] {
  const positions = getPositions()
    .filter((p) => p.etagere_id === etagereId)
    .sort((a, b) => a.position_index - b.position_index);
  const livres = getLivres();
  return positions.flatMap((p) => {
    const livre = livres.find((l) => l.id === p.livre_id);
    return livre
      ? [{ ...livre, etagere_id: p.etagere_id, position_index: p.position_index }]
      : [];
  });
}

export function hasData(): boolean {
  return getEtageres().length > 0;
}

// ─── Étagères ─────────────────────────────────────────────────────────────────

export function addEtagere(label: string, nb_livres_attendus = 0): Etagere {
  const list = getEtageres();
  const item: Etagere = { id: nextId(list), label, nb_livres_attendus };
  save(KEYS.etageres, [...list, item]);
  return item;
}

export function updateEtagere(id: number, data: Partial<Omit<Etagere, "id">>): void {
  save(
    KEYS.etageres,
    getEtageres().map((e) => (e.id === id ? { ...e, ...data } : e)),
  );
}

export function deleteEtagere(id: number): void {
  save(KEYS.etageres, getEtageres().filter((e) => e.id !== id));
  save(KEYS.positions, getPositions().filter((p) => p.etagere_id !== id));
}

// ─── Livres ───────────────────────────────────────────────────────────────────

export function addLivre(titre: string, auteur: string, etagereId: number): Livre {
  const list = getLivres();
  const livre: Livre = { id: nextId(list), titre, auteur };
  save(KEYS.livres, [...list, livre]);

  const positions = getPositions();
  const maxIdx = positions
    .filter((p) => p.etagere_id === etagereId)
    .reduce((m, p) => Math.max(m, p.position_index), 0);
  save(KEYS.positions, [
    ...positions,
    { etagere_id: etagereId, position_index: maxIdx + 1, livre_id: livre.id },
  ]);
  return livre;
}

export function updateLivre(id: number, data: Partial<Omit<Livre, "id">>): void {
  save(
    KEYS.livres,
    getLivres().map((l) => (l.id === id ? { ...l, ...data } : l)),
  );
}

export function deleteLivre(id: number): void {
  save(KEYS.livres, getLivres().filter((l) => l.id !== id));
  save(KEYS.positions, getPositions().filter((p) => p.livre_id !== id));
}

/** Déplace un livre vers une autre étagère (le met en dernière position). */
export function moveLivreEtagere(livreId: number, newEtagereId: number): void {
  const positions = getPositions();
  const maxIdx = positions
    .filter((p) => p.etagere_id === newEtagereId)
    .reduce((m, p) => Math.max(m, p.position_index), 0);
  const updated = positions.filter((p) => p.livre_id !== livreId);
  updated.push({ etagere_id: newEtagereId, position_index: maxIdx + 1, livre_id: livreId });
  save(KEYS.positions, updated);
}

/** Retourne le nombre de livres actuellement dans une étagère. */
export function countLivresByEtagere(etagereId: number): number {
  return getPositions().filter((p) => p.etagere_id === etagereId).length;
}

/** Supprime toutes les données de la bibliothèque. */
export function clearAll(): void {
  save(KEYS.etageres, []);
  save(KEYS.livres, []);
  save(KEYS.positions, []);
}

/** Réordonne les livres d'une étagère selon le tableau d'IDs fourni. */
export function reorderLivres(etagereId: number, orderedLivreIds: number[]): void {
  const autres = getPositions().filter((p) => p.etagere_id !== etagereId);
  const reordered = orderedLivreIds.map((livreId, i) => ({
    etagere_id: etagereId,
    position_index: i + 1,
    livre_id: livreId,
  }));
  save(KEYS.positions, [...autres, ...reordered]);
}

// ─── Export SQLite ────────────────────────────────────────────────────────────

/** Construit la base SQLite en mémoire à partir du localStorage. */
function buildDatabase(SQL: SqlJsStatic): SqlDatabase {
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE "Etageres" (
      "id" INTEGER NOT NULL,
      "label" TEXT NOT NULL,
      "nb_livres_attendus" INTEGER,
      PRIMARY KEY("id")
    )
  `);
  db.run(`
    CREATE TABLE "Livres" (
      "id" INTEGER NOT NULL,
      "titre" TEXT NOT NULL,
      "auteur" TEXT,
      PRIMARY KEY("id")
    )
  `);
  db.run(`
    CREATE TABLE "Positions" (
      "etagere_id" INTEGER NOT NULL,
      "position_index" INTEGER NOT NULL,
      "livre_id" INTEGER NOT NULL
    )
  `);

  for (const e of getEtageres()) {
    db.run(
      'INSERT INTO "Etageres" (id, label, nb_livres_attendus) VALUES (?, ?, ?)',
      [e.id, e.label, e.nb_livres_attendus],
    );
  }
  for (const l of getLivres()) {
    db.run('INSERT INTO "Livres" (id, titre, auteur) VALUES (?, ?, ?)', [
      l.id, l.titre, l.auteur,
    ]);
  }
  for (const p of getPositions()) {
    db.run(
      'INSERT INTO "Positions" (etagere_id, position_index, livre_id) VALUES (?, ?, ?)',
      [p.etagere_id, p.position_index, p.livre_id],
    );
  }

  return db;
}

/**
 * Exporte la base sous forme de fichier .db.
 *
 * ─ Web    : téléchargement via balise <a> (comportement INCHANGÉ).
 * ─ Natif  : écriture dans Directory.External de l'app Android.
 *            Chemin : /sdcard/Android/data/com.bibliatech.app/files/<filename>
 *            Accessible via l'explorateur de fichiers Android.
 *            Aucune permission WRITE_EXTERNAL_STORAGE requise (dossier propre à l'app).
 */
export async function exportToSQLiteFile(
  filename = "databaseLibrairie.db",
): Promise<void> {
  const SQL = await ensureSqlJs();
  const db = buildDatabase(SQL);
  const data = db.export();
  db.close();

  // ── Branche NATIF (Android/iOS) ──────────────────────────────────────────
  if (isNative()) {
    const { Filesystem, Directory } = await loadFilesystem();
    await Filesystem.writeFile({
      path: filename,
      data: uint8ArrayToBase64(data),
      directory: Directory.External,
    });
    return; // ← sort ici sur natif, ne touche pas au code web ci-dessous
  }

  // ── Branche WEB (comportement INCHANGÉ) ──────────────────────────────────
  const blob = new Blob(
    [data.buffer as ArrayBuffer],
    { type: "application/octet-stream" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Handle d'ÉCRITURE obtenu via showSaveFilePicker (réutilisable entre les sauvegardes)
let _writeHandle: any = null;
// Handle de LECTURE obtenu via showOpenFilePicker (utilisé comme startIn pour la sauvegarde)
let _readHandle: any = null;
// Nom du fichier importé (pour pré-remplir le sélecteur de sauvegarde)
let _importedFileName = "databaseLibrairie.db";

/** Vrai si on peut sauvegarder directement sans ouvrir de sélecteur (web uniquement). */
export function hasWriteHandle(): boolean {
  return _writeHandle !== null;
}

/**
 * Ouvre le sélecteur de fichier pour importer une base SQLite.
 * Stocke le handle de lecture pour que showSaveFilePicker s'ouvre
 * automatiquement dans le même dossier au premier enregistrement.
 *
 * Note Android : showOpenFilePicker n'est pas disponible dans le WebView
 * → lance NOT_SUPPORTED → le fallback <input type="file"> prend le relais
 *   (géré dans bibliotheque.tsx — déjà fonctionnel sur Android).
 */
export async function importFromFilePicker(): Promise<void> {
  if (!("showOpenFilePicker" in window)) {
    throw new Error("NOT_SUPPORTED");
  }
  const [handle] = await (window as any).showOpenFilePicker({
    types: [
      {
        description: "Base de données SQLite",
        accept: { "application/octet-stream": [".db", ".sqlite", ".sqlite3"] },
      },
    ],
    multiple: false,
  });
  _readHandle = handle;
  _writeHandle = null; // Réinitialiser le handle d'écriture à chaque nouvel import
  const file = await handle.getFile();
  await importFromSQLiteFile(file);
}

/** Écrit les données dans un handle d'écriture (issu de showSaveFilePicker). */
async function writeToHandle(handle: any): Promise<void> {
  const SQL = await ensureSqlJs();
  const db = buildDatabase(SQL);
  const data = db.export();
  db.close();
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Sauvegarde la base dans un fichier.
 *
 * ─ Natif  : écrit dans Directory.External (même chemin qu'exportToSQLiteFile).
 *            Pas de boîte de dialogue — sauvegarde directe et silencieuse.
 * ─ Web    : comportement INCHANGÉ.
 *   · Handle d'écriture existant → sauvegarde directe (sans dialog).
 *   · Sinon → showSaveFilePicker pré-positionné dans le dossier source.
 */
export async function saveToFilePicker(_filename?: string): Promise<void> {
  // ── Branche NATIF (Android/iOS) ──────────────────────────────────────────
  if (isNative()) {
    const SQL = await ensureSqlJs();
    const db = buildDatabase(SQL);
    const data = db.export();
    db.close();
    const { Filesystem, Directory } = await loadFilesystem();
    await Filesystem.writeFile({
      path: _importedFileName,
      data: uint8ArrayToBase64(data),
      directory: Directory.External,
    });
    return; // ← sort ici sur natif, ne touche pas au code web ci-dessous
  }

  // ── Branche WEB (comportement INCHANGÉ) ──────────────────────────────────
  if (!("showSaveFilePicker" in window)) {
    throw new Error("File System Access API non supportée par ce navigateur.");
  }

  // Sauvegarde directe si on a déjà un handle d'écriture valide
  if (_writeHandle) {
    try {
      await writeToHandle(_writeHandle);
      return;
    } catch {
      _writeHandle = null; // Handle invalide → en obtenir un nouveau
    }
  }

  // Ouvrir le sélecteur dans le même dossier que le fichier importé (si disponible)
  const options: Record<string, unknown> = {
    suggestedName: _importedFileName,
    types: [
      {
        description: "Base de données SQLite",
        accept: { "application/octet-stream": [".db", ".sqlite", ".sqlite3"] },
      },
    ],
  };
  if (_readHandle) {
    options.startIn = _readHandle; // Ouvre directement dans le dossier source
  }

  const handle = await (window as any).showSaveFilePicker(options);
  _writeHandle = handle;
  await writeToHandle(handle);
}

// ─── Import SQLite ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    initSqlJs?: () => Promise<SqlJsStatic>;
    __sqlJs?: SqlJsStatic;
  }
}

interface SqlJsStatic {
  // Constructeur : sans arg (nouvelle DB vide) ou avec Uint8Array (DB existante)
  Database: new (data?: Uint8Array) => SqlDatabase;
}

interface SqlDatabase {
  run(sql: string, params?: any[]): SqlDatabase; // ← ajout (manquait dans l'interface)
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  export(): Uint8Array;                           // ← ajout (manquait dans l'interface)
  close(): void;
}

// ─── sql.js — chargement platform-aware ──────────────────────────────────────
//
// Version utilisée : sql-asm.js (pure JavaScript, SANS WebAssembly).
//   · Sur web        : chargé depuis le CDN (comportement inchangé).
//   · Sur Android    : chargé depuis /sql-asm.js bundlé localement.
//                      → fonctionne HORS LIGNE, pas de dépendance réseau.
//                      → le fichier est copié par vite.mobile.config.ts
//                        depuis node_modules/sql.js/dist/sql-asm.js vers App/www/.
//
// ⚠️  sql-asm.js = 1 seul fichier JS (~9 Mo). Pas de .wasm associé.
//     (La version WASM serait sql-wasm.js + sql-wasm.wasm — NON utilisée ici.)

const SQL_JS_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-asm.js";

function ensureSqlJs(): Promise<SqlJsStatic> {
  if (window.__sqlJs) return Promise.resolve(window.__sqlJs);

  // Sur Android natif : utiliser le fichier bundlé localement (offline-first).
  // Sur web           : charger depuis le CDN (comportement INCHANGÉ).
  const sqlJsUrl = isNative() ? "/sql-asm.js" : SQL_JS_CDN_URL;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sqlJsUrl;
    script.onload = () => {
      // sql-asm.js n'a pas besoin de locateFile (pas de WASM)
      (window as any)
        .initSqlJs()
        .then((SQL: SqlJsStatic) => {
          window.__sqlJs = SQL;
          resolve(SQL);
        })
        .catch(reject);
    };
    script.onerror = () =>
      reject(
        new Error(
          isNative()
            ? "Impossible de charger sql.js local (/sql-asm.js). Vérifiez le build mobile."
            : "Impossible de charger sql.js depuis le CDN.",
        ),
      );
    document.head.appendChild(script);
  });
}

export async function importFromSQLiteFile(file: File): Promise<void> {
  _importedFileName = file.name;
  const SQL = await ensureSqlJs();
  const buf = await file.arrayBuffer();

  // ── Vérifications diagnostiques ──────────────────────────────────────────
  if (buf.byteLength === 0) {
    throw new Error(
      `Le fichier "${file.name}" est vide (0 octet). Vérifiez qu'il est bien téléchargé depuis OneDrive.`,
    );
  }

  // Vérifier l'en-tête SQLite ("SQLite format 3")
  const header = new Uint8Array(buf.slice(0, 15));
  const headerStr = Array.from(header)
    .map((b) => String.fromCharCode(b))
    .join("");
  if (!headerStr.startsWith("SQLite format 3")) {
    throw new Error(
      `"${file.name}" n'est pas un fichier SQLite valide (taille: ${buf.byteLength} octets, en-tête: "${headerStr.slice(0, 15)}").`,
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  const db = new SQL.Database(new Uint8Array(buf));

  // Lire les noms de tables réels (insensible à la casse)
  const masterRes = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table'",
  );
  const tableNames: string[] = (masterRes[0]?.values ?? []).map(
    (r) => r[0] as string,
  );

  const findTable = (target: string): string | null =>
    tableNames.find((n) => n.toLowerCase() === target.toLowerCase()) ?? null;

  const tEtageres = findTable("Etageres");
  const tLivres = findTable("Livres");
  const tPositions = findTable("Positions");

  if (!tEtageres || !tLivres || !tPositions) {
    db.close();
    throw new Error(
      `Tables introuvables. Trouvé : [${tableNames.join(", ") || "aucune"}]. Attendu : Etageres, Livres, Positions.`,
    );
  }

  const etageres: Etagere[] = [];
  const livres: Livre[] = [];
  const positions: Position[] = [];

  const etRes = db.exec(
    `SELECT id, label, nb_livres_attendus FROM "${tEtageres}"`,
  );
  for (const row of etRes[0]?.values ?? []) {
    etageres.push({
      id: row[0] as number,
      label: row[1] as string,
      nb_livres_attendus: (row[2] as number) ?? 0,
    });
  }

  const livRes = db.exec(`SELECT id, titre, auteur FROM "${tLivres}"`);
  for (const row of livRes[0]?.values ?? []) {
    livres.push({
      id: row[0] as number,
      titre: row[1] as string,
      auteur: (row[2] as string) ?? "",
    });
  }

  const posRes = db.exec(
    `SELECT etagere_id, position_index, livre_id FROM "${tPositions}"`,
  );
  for (const row of posRes[0]?.values ?? []) {
    positions.push({
      etagere_id: row[0] as number,
      position_index: row[1] as number,
      livre_id: row[2] as number,
    });
  }

  db.close();

  save(KEYS.etageres, etageres);
  save(KEYS.livres, livres);
  save(KEYS.positions, positions);
}
