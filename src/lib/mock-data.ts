export type Book = {
  id: string;
  title: string;
  author: string;
  shelfId: string;
  position: number;
};

export type Shelf = { id: string; name: string };

export type Loan = {
  id: string;
  bookId: string;
  bookTitle: string;
  borrower: string;
  borrowedAt: string;
};

export type ScanHistory = {
  id: string;
  shelfName: string;
  date: string;
  status: "ok" | "error";
};

export const shelves: Shelf[] = [
  { id: "E1", name: "Étagère 1" },
  { id: "E2", name: "Étagère 2" },
  { id: "E3", name: "Étagère 3" },
  { id: "E4", name: "Étagère 4" },
];

export const books: Book[] = [
  { id: "b1", title: "L'Étranger", author: "Albert Camus", shelfId: "E1", position: 1 },
  { id: "b2", title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", shelfId: "E1", position: 2 },
  { id: "b3", title: "Madame Bovary", author: "Gustave Flaubert", shelfId: "E1", position: 3 },
  { id: "b4", title: "Les Misérables", author: "Victor Hugo", shelfId: "E1", position: 4 },
  { id: "b5", title: "Notre-Dame de Paris", author: "Victor Hugo", shelfId: "E2", position: 1 },
  { id: "b6", title: "Germinal", author: "Émile Zola", shelfId: "E2", position: 2 },
  { id: "b7", title: "Bel-Ami", author: "Guy de Maupassant", shelfId: "E2", position: 3 },
  { id: "b8", title: "Le Comte de Monte-Cristo", author: "Alexandre Dumas", shelfId: "E3", position: 1 },
  { id: "b9", title: "Les Trois Mousquetaires", author: "Alexandre Dumas", shelfId: "E3", position: 2 },
  { id: "b10", title: "Voyage au bout de la nuit", author: "Louis-Ferdinand Céline", shelfId: "E3", position: 3 },
  { id: "b11", title: "À la recherche du temps perdu", author: "Marcel Proust", shelfId: "E4", position: 1 },
  { id: "b12", title: "L'Assommoir", author: "Émile Zola", shelfId: "E4", position: 2 },
];

export const loans: Loan[] = [
  { id: "l1", bookId: "b2", bookTitle: "Le Petit Prince", borrower: "Marie Dupont", borrowedAt: "2026-05-12" },
  { id: "l2", bookId: "b8", bookTitle: "Le Comte de Monte-Cristo", borrower: "Jean Martin", borrowedAt: "2026-05-15" },
];

export const scanHistory: ScanHistory[] = [
  { id: "s1", shelfName: "Étagère 1", date: "2026-05-19", status: "ok" },
  { id: "s2", shelfName: "Étagère 3", date: "2026-05-18", status: "error" },
  { id: "s3", shelfName: "Étagère 2", date: "2026-05-17", status: "ok" },
  { id: "s4", shelfName: "Étagère 4", date: "2026-05-15", status: "ok" },
];
