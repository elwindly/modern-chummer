export type WareKind = 'cyberware' | 'bioware';

export interface CharacterWare {
  id: string;
  kind: WareKind;
  name: string;
  grade: string;
  rating: number;
  availability: string;
  cost: number;
  essence: number;
  capacity: string;
  capacityUsed: number;
  children: CharacterWare[];
}

export interface WareCatalogEntry {
  name: string;
  cost?: unknown;
  avail?: unknown;
  ess?: unknown;
  rating?: unknown;
  maxrating?: unknown;
  capacity?: unknown;
  grade?: unknown;
  bonus?: Record<string, unknown>;
  forbidden?: Record<string, unknown>;
  required?: Record<string, unknown>;
  category?: string | string[];
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface WareGrade {
  name: string;
  ess?: string;
  cost?: string | string[];
  avail?: string;
}
