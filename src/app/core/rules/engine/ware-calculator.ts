import { Character } from '../models/character';
import { AvailabilityItem } from './availability-validator';
import { evaluateAvailability, evaluateFormula } from './formula-evaluator';
import {
  calculateTotalStreetCost,
  collectAvailabilityItems as collectStreetAvailabilityItems,
  getCatalogMaxRating,
  isRatedCatalogEntry,
  scalarCatalogValue,
} from './gear-calculator';
import { collectVehicleAvailabilityItems } from './vehicle-calculator';
import { CharacterWare, WareCatalogEntry, WareGrade, WareKind } from '../models/ware';
import { createCharacterId } from '../persistence/character-serializer';
import { ImprovementManager } from './improvement-manager';
import { ImprovementType } from '../models/improvement';

function parseFixedOrFormula(value: string, rating: number): number {
  return evaluateFormula(value, { rating: rating || 1 });
}

export function resolveWareField(
  field: unknown,
  rating: number,
): string {
  const raw = scalarCatalogValue(field);
  if (!raw) return '';
  if (raw.startsWith('FixedValues(')) {
    return String(parseFixedOrFormula(raw, rating));
  }
  if (raw.includes('Rating') || /[+\-*/()]/.test(raw)) {
    return String(parseFixedOrFormula(raw, rating));
  }
  return raw;
}

export function getGradeRecord(
  grades: Map<string, WareGrade>,
  gradeName: string,
): WareGrade {
  return grades.get(gradeName) ?? { name: gradeName, ess: '1', cost: '1', avail: '0' };
}

export function getAllowedGrades(entry: WareCatalogEntry, grades: Map<string, WareGrade>): string[] {
  const raw = entry.grade;
  if (!raw) {
    return [...grades.keys()].filter((name) => name === 'Standard' || !name.includes('Second-Hand'));
  }
  if (Array.isArray(raw)) {
    return raw.map((value) => scalarCatalogValue(value)).filter(Boolean);
  }
  return [scalarCatalogValue(raw)].filter(Boolean);
}

export function calculateBaseWareEssence(entry: WareCatalogEntry, rating: number): number {
  const essRaw = resolveWareField(entry.ess, rating);
  return Number(essRaw) || 0;
}

export function applyGradeEssenceMultiplier(baseEssence: number, grade: WareGrade): number {
  const multiplier = Number(scalarCatalogValue(grade.ess)) || 1;
  return roundEssence(baseEssence * multiplier);
}

export function calculateWareEssenceCost(
  entry: WareCatalogEntry,
  grade: WareGrade,
  rating: number,
  kind: WareKind,
  manager: ImprovementManager,
): number {
  let essence = applyGradeEssenceMultiplier(calculateBaseWareEssence(entry, rating), grade);

  if (kind === 'cyberware') {
    const reduction = manager.valueOf(ImprovementType.CyberwareEssCost);
    if (reduction) {
      essence *= 1 - reduction / 100;
    }
  } else {
    const reduction = manager.valueOf(ImprovementType.BiowareEssCost);
    if (reduction) {
      essence *= 1 - reduction / 100;
    }
  }

  return roundEssence(essence);
}

export function calculateBaseWareCost(entry: WareCatalogEntry, rating: number): number {
  const costRaw = resolveWareField(entry.cost, rating);
  return Number(costRaw) || 0;
}

export function calculateWareCost(
  entry: WareCatalogEntry,
  grade: WareGrade,
  rating: number,
): number {
  const base = calculateBaseWareCost(entry, rating);
  const multiplier = Number(scalarCatalogValue(grade.cost)) || 1;
  return Math.floor(base * multiplier);
}

export function calculateWareAvailability(
  entry: WareCatalogEntry,
  grade: WareGrade,
  rating: number,
): string {
  const availRaw = resolveWareField(entry.avail, rating);
  const gradeModifier = Number(scalarCatalogValue(grade.avail)) || 0;

  if (availRaw.includes('FixedValues(')) {
    const value = Number(parseFixedOrFormula(availRaw, rating)) + gradeModifier;
    return String(Math.max(0, value));
  }

  if (/[FR]$/i.test(availRaw.trim())) {
    const { value, suffix } = evaluateAvailability(availRaw, { rating: rating || 1 });
    return `${Math.max(0, value + gradeModifier)}${suffix}`;
  }

  const numeric = Number(availRaw);
  if (Number.isFinite(numeric)) {
    return String(Math.max(0, numeric + gradeModifier));
  }

  return availRaw;
}

export function calculateWareCapacity(entry: WareCatalogEntry, rating: number): string {
  const raw = resolveWareField(entry.capacity, rating);
  return raw || '0';
}

export function parseCapacityCost(capacity: string): number {
  const trimmed = capacity.trim();
  if (!trimmed || trimmed === '0') return 0;
  const bracketMatch = trimmed.match(/^\[(\d+)\]$/);
  if (bracketMatch) return Number(bracketMatch[1]);
  const bracketStar = trimmed.match(/^\[\*\]$/);
  if (bracketStar) return 0;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function calculateParentCapacityTotal(capacity: string): number {
  const trimmed = capacity.trim();
  if (trimmed.startsWith('[')) {
    return parseCapacityCost(trimmed);
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function calculateWareCapacityUsed(ware: CharacterWare): number {
  return ware.children.reduce((sum, child) => sum + child.capacityUsed, 0);
}

export interface CreateWareOptions {
  kind: WareKind;
  grade: string;
  rating?: number;
  parentCapacity?: string;
  id?: string;
}

export function createWareFromCatalog(
  entry: WareCatalogEntry,
  grades: Map<string, WareGrade>,
  manager: ImprovementManager,
  options: CreateWareOptions,
): CharacterWare {
  const grade = getGradeRecord(grades, options.grade);
  const maxRating = getCatalogMaxRating(entry);
  const defaultRating = maxRating > 0 ? 1 : 0;
  const requestedRating = options.rating ?? defaultRating;
  const effectiveRating =
    maxRating > 0 ? Math.min(Math.max(1, requestedRating), maxRating) : 0;

  const capacity = calculateWareCapacity(entry, effectiveRating);
  const capacityUsed = options.parentCapacity
    ? parseCapacityCost(options.parentCapacity)
    : 0;

  return {
    id: options.id ?? createCharacterId(),
    kind: options.kind,
    name: entry.name,
    grade: grade.name,
    rating: effectiveRating,
    availability: calculateWareAvailability(entry, grade, effectiveRating),
    cost: calculateWareCost(entry, grade, effectiveRating),
    essence: calculateWareEssenceCost(
      entry,
      grade,
      effectiveRating,
      options.kind,
      manager,
    ),
    capacity,
    capacityUsed,
    children: [],
  };
}

export function refreshWareFromCatalog(
  item: CharacterWare,
  entry: WareCatalogEntry,
  grades: Map<string, WareGrade>,
  manager: ImprovementManager,
): CharacterWare {
  const grade = getGradeRecord(grades, item.grade);
  const maxRating = getCatalogMaxRating(entry);
  const effectiveRating =
    maxRating > 0 ? Math.min(Math.max(1, item.rating), maxRating) : item.rating;

  return {
    ...item,
    rating: effectiveRating,
    availability: calculateWareAvailability(entry, grade, effectiveRating),
    cost: calculateWareCost(entry, grade, effectiveRating),
    essence: calculateWareEssenceCost(entry, grade, effectiveRating, item.kind, manager),
    capacity: calculateWareCapacity(entry, effectiveRating),
  };
}

function walkWare(
  items: CharacterWare[],
  visitor: (item: CharacterWare) => void,
): void {
  for (const item of items) {
    visitor(item);
    walkWare(item.children, visitor);
  }
}

export function sumWareEssenceByKind(
  character: Character,
): { cyberware: number; bioware: number; essenceHole: number } {
  let cyberware = 0;
  let bioware = 0;
  let essenceHole = 0;

  const visit = (items: CharacterWare[]) => {
    for (const item of items) {
      if (item.name === 'Essence Hole') {
        essenceHole += item.essence;
      } else if (item.kind === 'cyberware') {
        cyberware += item.essence;
      } else {
        bioware += item.essence;
      }
      visit(item.children);
    }
  };

  visit(character.cyberware);
  visit(character.bioware);

  return { cyberware, bioware, essenceHole };
}

export function calculateTotalWareCost(character: Character): number {
  let total = 0;
  walkWare(character.cyberware, (item) => {
    total += item.cost;
  });
  walkWare(character.bioware, (item) => {
    total += item.cost;
  });
  return total;
}

export function collectWareAvailabilityItems(character: Character): AvailabilityItem[] {
  const items: AvailabilityItem[] = [];
  walkWare(character.cyberware, (item) => {
    items.push({ name: item.name, availability: item.availability });
  });
  walkWare(character.bioware, (item) => {
    items.push({ name: item.name, availability: item.availability });
  });
  return items;
}

export function collectAllAvailabilityItems(character: Character): AvailabilityItem[] {
  return [
    ...collectStreetAvailabilityItems(character),
    ...collectWareAvailabilityItems(character),
    ...collectVehicleAvailabilityItems(character),
  ];
}

export function calculateTotalNuyenSpent(character: Character): number {
  return calculateTotalStreetCost(character) + calculateTotalWareCost(character);
}

export function findWare(
  character: Character,
  kind: WareKind,
  id: string,
): CharacterWare | null {
  const list = kind === 'cyberware' ? character.cyberware : character.bioware;
  return findWareInList(list, id);
}

export function findWareInList(items: CharacterWare[], id: string): CharacterWare | null {
  for (const item of items) {
    if (item.id === id) return item;
    const nested = findWareInList(item.children, id);
    if (nested) return nested;
  }
  return null;
}

export function findWareParentList(
  character: Character,
  kind: WareKind,
  id: string,
): CharacterWare[] | null {
  const list = kind === 'cyberware' ? character.cyberware : character.bioware;
  if (list.some((item) => item.id === id)) return list;
  return findParentList(list, id);
}

function findParentList(items: CharacterWare[], id: string): CharacterWare[] | null {
  for (const item of items) {
    if (item.children.some((child) => child.id === id)) {
      return item.children;
    }
    const nested = findParentList(item.children, id);
    if (nested) return nested;
  }
  return null;
}

export function removeWareFromList(items: CharacterWare[], id: string): CharacterWare[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeWareFromList(item.children, id),
    }));
}

export function wareSourceName(id: string): string {
  return `ware:${id}`;
}

export function characterHasWareByName(character: Character, name: string): boolean {
  let found = false;
  walkWare(character.cyberware, (item) => {
    if (item.name === name) found = true;
  });
  walkWare(character.bioware, (item) => {
    if (item.name === name) found = true;
  });
  return found;
}

export function isRatedWareEntry(entry: WareCatalogEntry): boolean {
  return isRatedCatalogEntry(entry);
}

export function roundEssence(value: number): number {
  return Math.round(value * 100) / 100;
}
