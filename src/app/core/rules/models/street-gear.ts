export type StreetItemKind =
  | 'gear'
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'weapon-mod'
  | 'armor-mod'
  | 'nested-gear';

export interface CharacterStreetItem {
  id: string;
  kind: StreetItemKind;
  name: string;
  rating: number;
  availability: string;
  cost: number;
  includedInParent?: boolean;
  children: CharacterStreetItem[];
}

export interface StreetCatalogEntry {
  name: string;
  cost?: unknown;
  avail?: unknown;
  rating?: unknown;
  maxrating?: unknown;
  accessories?: unknown;
  source?: string;
  page?: string | number;
  category?: string | string[];
  [key: string]: unknown;
}
