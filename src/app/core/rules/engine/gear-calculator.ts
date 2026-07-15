import { Character } from '../models/character';
import { AvailabilityItem } from './availability-validator';
import { evaluateAvailability, evaluateFormula, FormulaContext } from './formula-evaluator';
import {
  CharacterStreetItem,
  StreetCatalogEntry,
  StreetItemKind,
} from '../models/street-gear';
import { createCharacterId } from '../persistence/character-serializer';

export function scalarCatalogValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return scalarCatalogValue(value[0]);
  if (typeof value === 'object' && 'value' in value) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}

export function getCatalogMaxRating(entry: StreetCatalogEntry): number {
  const maxRating = Number(scalarCatalogValue(entry.maxrating));
  if (Number.isFinite(maxRating) && maxRating > 0) return maxRating;

  const rating = Number(scalarCatalogValue(entry.rating));
  if (Number.isFinite(rating) && rating > 0) return rating;

  return 0;
}

export function isRatedCatalogEntry(entry: StreetCatalogEntry): boolean {
  return getCatalogMaxRating(entry) > 0;
}

export function calculateStreetItemCost(
  entry: StreetCatalogEntry,
  rating: number,
  context: FormulaContext & { parentCost?: number } = {},
): number {
  const costRaw = scalarCatalogValue(entry.cost);
  if (!costRaw) return 0;

  if (/^Weapon Cost$/i.test(costRaw.trim())) {
    return context.parentCost ?? 0;
  }

  const variableMatch = costRaw.match(/^Variable\((\d+)-(\d+)\)$/i);
  if (variableMatch) {
    return Number(variableMatch[1]);
  }

  return evaluateFormula(costRaw, { ...context, rating: rating || 1 });
}

export function calculateStreetItemAvailability(
  entry: StreetCatalogEntry,
  rating: number,
): string {
  const availRaw = scalarCatalogValue(entry.avail);
  if (!availRaw) return '0';

  if (availRaw.includes('Rating') || /[+\-*/()]/.test(availRaw)) {
    const { value, suffix } = evaluateAvailability(availRaw, { rating: rating || 1 });
    return `${value}${suffix}`;
  }

  return availRaw;
}

export interface CreateStreetItemOptions {
  kind: StreetItemKind;
  rating?: number;
  includedInParent?: boolean;
  parentCost?: number;
  attributes?: FormulaContext['attributes'];
  id?: string;
}

export function createStreetItemFromCatalog(
  entry: StreetCatalogEntry,
  options: CreateStreetItemOptions,
): CharacterStreetItem {
  const maxRating = getCatalogMaxRating(entry);
  const defaultRating = maxRating > 0 ? 1 : 0;
  const requestedRating = options.rating ?? defaultRating;
  const effectiveRating =
    maxRating > 0 ? Math.min(Math.max(1, requestedRating), maxRating) : 0;

  const cost = calculateStreetItemCost(entry, effectiveRating, {
    rating: effectiveRating,
    attributes: options.attributes,
    parentCost: options.parentCost,
  });

  const availability = options.includedInParent
    ? `+${calculateStreetItemAvailability(entry, effectiveRating)}`
    : calculateStreetItemAvailability(entry, effectiveRating);

  return {
    id: options.id ?? createCharacterId(),
    kind: options.kind,
    name: entry.name,
    rating: effectiveRating,
    availability,
    cost,
    includedInParent: options.includedInParent,
    children: [],
  };
}

export function refreshStreetItemFromCatalog(
  item: CharacterStreetItem,
  entry: StreetCatalogEntry,
  context: FormulaContext & { parentCost?: number } = {},
): CharacterStreetItem {
  const maxRating = getCatalogMaxRating(entry);
  const effectiveRating =
    maxRating > 0 ? Math.min(Math.max(1, item.rating), maxRating) : item.rating;

  const cost = calculateStreetItemCost(entry, effectiveRating, {
    ...context,
    rating: effectiveRating,
  });

  const availability = item.includedInParent
    ? `+${calculateStreetItemAvailability(entry, effectiveRating)}`
    : calculateStreetItemAvailability(entry, effectiveRating);

  return {
    ...item,
    rating: effectiveRating,
    cost,
    availability,
    children: item.children.map((child) => {
      if (child.kind === 'weapon-mod' && /^Weapon Cost$/i.test(scalarCatalogValue(entry.cost))) {
        return { ...child, cost: context.parentCost ?? cost };
      }
      return child;
    }),
  };
}

function walkStreetItems(
  items: CharacterStreetItem[],
  visitor: (item: CharacterStreetItem, parent?: CharacterStreetItem) => void,
  parent?: CharacterStreetItem,
): void {
  for (const item of items) {
    visitor(item, parent);
    walkStreetItems(item.children, visitor, item);
  }
}

export function calculateTotalStreetCost(character: Character): number {
  const topLevel = [...character.gear, ...character.weapons, ...character.armors];
  if (topLevel.length > 0) {
    let total = 0;
    walkStreetItems(topLevel, (item) => {
      total += item.cost;
    });
    return total;
  }

  return character.purchases.reduce((sum, item) => sum + item.cost, 0);
}

export function collectAvailabilityItems(character: Character): AvailabilityItem[] {
  const items: AvailabilityItem[] = [];

  walkStreetItems([...character.gear, ...character.weapons, ...character.armors], (item) => {
    items.push({
      name: item.name,
      availability: item.availability,
      includedInParent: item.includedInParent,
    });
  });

  if (items.length === 0) {
    return character.purchases.map((purchase) => ({
      name: purchase.name,
      availability: purchase.availability,
      includedInParent: purchase.includedInParent,
    }));
  }

  return items;
}

export function findStreetItem(
  character: Character,
  container: 'gear' | 'weapons' | 'armors',
  id: string,
): CharacterStreetItem | null {
  const list = character[container];
  return findStreetItemInList(list, id);
}

function findStreetItemInList(
  items: CharacterStreetItem[],
  id: string,
): CharacterStreetItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = findStreetItemInList(item.children, id);
    if (nested) return nested;
  }
  return null;
}

export function removeStreetItemFromList(
  items: CharacterStreetItem[],
  id: string,
): CharacterStreetItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeStreetItemFromList(item.children, id),
    }));
}

export function listWeaponAccessoryNames(
  weaponEntry: StreetCatalogEntry | undefined,
): string[] {
  if (!weaponEntry?.accessories) return [];
  const raw = weaponEntry.accessories;
  if (Array.isArray(raw)) {
    return raw.map((entry) => scalarCatalogValue(entry)).filter(Boolean);
  }
  return [scalarCatalogValue(raw)].filter(Boolean);
}

export function syncLegacyPurchases(character: Character): void {
  const flat: Character['purchases'] = [];
  walkStreetItems([...character.gear, ...character.weapons, ...character.armors], (item) => {
    flat.push({
      name: item.name,
      availability: item.availability,
      cost: item.cost,
      includedInParent: item.includedInParent,
    });
  });
  character.purchases = flat;
}
