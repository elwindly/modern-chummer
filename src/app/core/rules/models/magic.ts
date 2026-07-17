export interface CharacterSpell {
  id: string;
  name: string;
  category: string;
  limited?: boolean;
  extended?: boolean;
  extra?: string;
}

export interface CharacterPower {
  id: string;
  name: string;
  rating: number;
  levels: boolean;
  pointsPerLevel: number;
  totalPoints: number;
  extra?: string;
}

export interface CharacterProgramOption {
  id: string;
  name: string;
  rating: number;
}

export interface CharacterProgram {
  id: string;
  name: string;
  category: string;
  rating: number;
  maxRating: number;
  capacity: string;
  options: CharacterProgramOption[];
  extra?: string;
}

export interface CharacterSpirit {
  id: string;
  name: string;
  force: number;
  servicesOwed: number;
  bound: boolean;
  sprite: boolean;
}

export interface CharacterFocus {
  id: string;
  name: string;
  rating: number;
  bonded: boolean;
}

export interface CharacterMetamagic {
  id: string;
  name: string;
  paidWithKarma: boolean;
  source?: string;
  page?: string;
}

export interface CharacterInitiationGrade {
  id: string;
  grade: number;
  group: boolean;
  ordeal: boolean;
  technomancer: boolean;
  notes?: string;
}

export interface CharacterCritterPower {
  id: string;
  name: string;
  rating: number;
  points: number;
}

export interface SpellCatalogEntry {
  name: string;
  category?: string | string[];
  type?: string;
  range?: unknown;
  damage?: string;
  duration?: string;
  dv?: string;
  descriptor?: string;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface PowerCatalogEntry {
  name: string;
  points?: string;
  levels?: string;
  limit?: string;
  bonus?: Record<string, unknown>;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface ProgramCatalogEntry {
  name: string;
  category?: string | string[];
  rating?: unknown;
  maxrating?: unknown;
  capacity?: unknown;
  complexform?: string;
  skill?: unknown;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface MetamagicCatalogEntry {
  name: string;
  adept?: string;
  magician?: string;
  limit?: string;
  bonus?: Record<string, unknown>;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface TraditionEntry {
  name: string;
  drain?: string;
  spirits?: string[];
  source?: string;
  page?: string | number;
}

export interface CritterPowerCatalogEntry {
  name: string;
  category?: string | string[];
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}
