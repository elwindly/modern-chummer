import { Character } from '../models/character';
import { CharacterVehicle, CharacterVehicleMod, VehicleCatalogEntry, VehicleModCatalogEntry } from '../models/vehicle';
import { AvailabilityItem } from './availability-validator';
import { evaluateFormula, evaluateAvailability } from './formula-evaluator';
import { scalarCatalogValue } from './gear-calculator';
import { createCharacterId } from '../persistence/character-serializer';

function parseNumeric(value: unknown, fallback = 0): number {
  const raw = scalarCatalogValue(value);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createVehicleFromCatalog(
  entry: VehicleCatalogEntry,
  options: Partial<CharacterVehicle> = {},
): CharacterVehicle {
  const category = Array.isArray(entry.category)
    ? String(entry.category[0] ?? '')
    : String(entry.category ?? '');

  const costRaw = scalarCatalogValue(entry.cost);
  const cost = Number(evaluateFormula(costRaw || '0', { rating: 1 })) || 0;
  const availRaw = scalarCatalogValue(entry.avail) || '0';
  const { value, suffix } = evaluateAvailability(availRaw, { rating: 1 });

  return {
    id: options.id ?? createCharacterId(),
    name: entry.name,
    category,
    handling: parseNumeric(entry.handling),
    accel: scalarCatalogValue(entry.accel) || '0',
    speed: parseNumeric(entry.speed),
    pilot: parseNumeric(entry.pilot),
    body: parseNumeric(entry.body),
    armor: parseNumeric(entry.armor),
    sensor: parseNumeric(entry.sensor),
    deviceRating: parseNumeric(entry.devicerating),
    availability: `${value}${suffix}`,
    cost,
    vehicleName: options.vehicleName,
    mods: options.mods ?? [],
  };
}

export function createVehicleModFromCatalog(
  entry: VehicleModCatalogEntry,
  rating = 0,
): CharacterVehicleMod {
  const maxRating = Number(scalarCatalogValue(entry.rating)) || 0;
  const effectiveRating = maxRating > 0 ? Math.min(Math.max(1, rating), maxRating) : 0;
  const costRaw = scalarCatalogValue(entry.cost);
  const cost = Number(evaluateFormula(costRaw || '0', { rating: effectiveRating || 1 })) || 0;
  const availRaw = scalarCatalogValue(entry.avail) || '0';
  const { value, suffix } = evaluateAvailability(availRaw, { rating: effectiveRating || 1 });

  return {
    id: createCharacterId(),
    name: entry.name,
    rating: effectiveRating,
    availability: `${value}${suffix}`,
    cost,
  };
}

export function calculateTotalVehicleCost(character: Character): number {
  let total = 0;
  for (const vehicle of character.vehicles) {
    total += vehicle.cost;
    for (const mod of vehicle.mods) {
      total += mod.cost;
    }
  }
  return total;
}

export function collectVehicleAvailabilityItems(character: Character): AvailabilityItem[] {
  const items: AvailabilityItem[] = [];
  for (const vehicle of character.vehicles) {
    items.push({ name: vehicle.name, availability: vehicle.availability });
    for (const mod of vehicle.mods) {
      items.push({ name: `${vehicle.name}: ${mod.name}`, availability: mod.availability });
    }
  }
  return items;
}
