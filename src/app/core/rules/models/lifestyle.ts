export interface CharacterLifestyle {
  id: string;
  name: string;
  cost: number;
  months: number;
  lifestyleType?: string;
}

export interface LifestyleCatalogEntry {
  name: string;
  cost?: unknown;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface CharacterPet {
  id: string;
  name: string;
}
