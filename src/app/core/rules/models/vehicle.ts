export interface CharacterVehicleMod {
  id: string;
  name: string;
  rating: number;
  availability: string;
  cost: number;
}

export interface CharacterVehicle {
  id: string;
  name: string;
  category: string;
  handling: number;
  accel: string;
  speed: number;
  pilot: number;
  body: number;
  armor: number;
  sensor: number;
  deviceRating: number;
  availability: string;
  cost: number;
  vehicleName?: string;
  mods: CharacterVehicleMod[];
}

export interface VehicleCatalogEntry {
  name: string;
  category?: string | string[];
  handling?: unknown;
  accel?: unknown;
  speed?: unknown;
  pilot?: unknown;
  body?: unknown;
  armor?: unknown;
  sensor?: unknown;
  devicerating?: unknown;
  avail?: unknown;
  cost?: unknown;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}

export interface VehicleModCatalogEntry {
  name: string;
  rating?: unknown;
  avail?: unknown;
  cost?: unknown;
  source?: string;
  page?: string | number;
  [key: string]: unknown;
}
