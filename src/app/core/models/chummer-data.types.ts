/** Shared fields present on most Chummer game data items. */
export interface ChummerItem {
  name: string;
  source?: string;
  page?: string | number;
  category?: string;
  [key: string]: unknown;
}

export interface ChummerDataDocument {
  version?: number;
  categories?: Array<string | CategoryEntry>;
  [collection: string]: unknown;
}

export interface CategoryEntry {
  value?: string;
  type?: string;
  translate?: string;
}

export interface Book {
  name: string;
  code: string;
}

export interface BooksDocument extends ChummerDataDocument {
  books: Book[];
}

export interface DataManifest {
  generatedAt: string;
  source: string;
  files: Array<{
    source: string;
    output: string;
    items?: number;
  }>;
}
