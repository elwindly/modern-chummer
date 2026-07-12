import { AttributeCode } from '../models/attribute';
import { Character } from '../models/character';
import { Improvement, ImprovementType } from '../models/improvement';

export interface AttributeLimits {
  min: number;
  max: number;
  augMax: number;
}

function aggregateAugmentedModifiers(
  improvements: Improvement[],
  improvedName: string,
  custom: boolean,
): number {
  const filtered = improvements.filter(
    (item) =>
      item.enabled &&
      item.custom === custom &&
      item.type === ImprovementType.Attribute &&
      item.improvedName === improvedName,
  );

  const uniqueNames = new Set<string>();
  const uniquePairs: Array<{ uniqueName: string; value: number }> = [];
  let total = 0;

  for (const improvement of filtered) {
    const modifier = improvement.augmented * improvement.rating;

    if (improvement.uniqueName) {
      uniqueNames.add(improvement.uniqueName);
      uniquePairs.push({ uniqueName: improvement.uniqueName, value: modifier });
    } else {
      total += modifier;
    }
  }

  for (const uniqueName of uniqueNames) {
    const highest = Math.max(
      -999,
      ...uniquePairs.filter((pair) => pair.uniqueName === uniqueName).map((pair) => pair.value),
    );
    total += highest;
  }

  if (uniqueNames.has('precedence1')) {
    total = uniquePairs
      .filter((pair) => pair.uniqueName === 'precedence1')
      .reduce((sum, pair) => sum + pair.value, 0);
  }

  if (uniqueNames.has('precedence0')) {
    total = Math.max(
      -999,
      ...uniquePairs.filter((pair) => pair.uniqueName === 'precedence0').map((pair) => pair.value),
    );
  }

  return total;
}

export function getAttributeAugmentedModifiers(
  improvements: Improvement[],
  code: AttributeCode,
): number {
  const regular = aggregateAugmentedModifiers(improvements, code, false);
  const custom = aggregateAugmentedModifiers(improvements, code, true);
  const baseModifiers = aggregateAugmentedModifiers(improvements, `${code}Base`, false);
  return regular + custom + baseModifiers;
}

function sumFieldModifiers(
  improvements: Improvement[],
  code: AttributeCode,
  field: 'minimum' | 'maximum' | 'augmentedMaximum',
): number {
  return improvements
    .filter(
      (item) =>
        item.enabled &&
        item.type === ImprovementType.Attribute &&
        (item.improvedName === code || item.improvedName === `${code}Base`),
    )
    .reduce((sum, item) => sum + item[field] * item.rating, 0);
}

export function getTotalMinimum(character: Character, code: AttributeCode): number {
  const state = character.attributes[code];
  let total = state.min + sumFieldModifiers(character.improvements, code, 'minimum');

  if (state.max === 0) {
    return Math.max(0, total);
  }

  return Math.max(1, total);
}

export function getTotalMaximum(character: Character, code: AttributeCode): number {
  const state = character.attributes[code];
  const total = state.max + sumFieldModifiers(character.improvements, code, 'maximum');
  return Math.max(0, total);
}

export function getTotalAugmentedMaximum(character: Character, code: AttributeCode): number {
  const totalMax = getTotalMaximum(character, code);
  const augMod = sumFieldModifiers(character.improvements, code, 'augmentedMaximum');

  let total: number;
  if (code === 'EDG' || code === 'MAG' || code === 'RES') {
    total = totalMax + augMod;
  } else {
    total = totalMax + Math.floor(totalMax / 2) + augMod;
  }

  return Math.max(0, total);
}

export function getEffectiveLimits(character: Character, code: AttributeCode): AttributeLimits {
  return {
    min: getTotalMinimum(character, code),
    max: getTotalMaximum(character, code),
    augMax: getTotalAugmentedMaximum(character, code),
  };
}

export function getAttributeTotal(character: Character, code: AttributeCode): number {
  const state = character.attributes[code];
  const modifiers = getAttributeAugmentedModifiers(character.improvements, code);
  let total = state.base + modifiers;

  const augMax = getTotalAugmentedMaximum(character, code);
  if (total > augMax) {
    total = augMax;
  }

  if (state.max === 0 || code === 'EDG') {
    return Math.max(0, total);
  }

  return Math.max(1, total);
}
