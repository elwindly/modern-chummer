import { Character } from '../models/character';
import { ImprovementType } from '../models/improvement';
import { getAttributeTotal } from './attribute-totals';
import { ImprovementManager } from './improvement-manager';
import { roundEssence, sumWareEssenceByKind } from './ware-calculator';

export interface EssenceBreakdown {
  base: number;
  current: number;
  lost: number;
  cyberware: number;
  bioware: number;
  essenceHole: number;
  minimum: number;
  penalty: number;
}

export function getEssenceMaximum(character: Character, manager: ImprovementManager): number {
  return character.attributes.ESS.max + manager.valueOf(ImprovementType.Essence);
}

export function calculateEssence(
  character: Character,
  manager: ImprovementManager,
): EssenceBreakdown {
  const base = getEssenceMaximum(character, manager);
  const { cyberware, bioware, essenceHole } = sumWareEssenceByKind(character);

  let deduction: number;
  if (cyberware > bioware) {
    deduction = cyberware + bioware / 2;
  } else {
    deduction = bioware + cyberware / 2;
  }
  deduction += essenceHole;

  const current = roundEssence(Math.max(0, base - deduction));
  const minimum = Math.max(0.01, character.attributes.ESS.min);
  const penalty = Math.max(0, Math.ceil(base - current));

  return {
    base,
    current,
    lost: roundEssence(deduction),
    cyberware: roundEssence(cyberware),
    bioware: roundEssence(bioware),
    essenceHole: roundEssence(essenceHole),
    minimum,
    penalty,
  };
}

export function calculateEssencePenalty(
  character: Character,
  manager: ImprovementManager,
): number {
  return calculateEssence(character, manager).penalty;
}

export function wouldExceedEssenceMinimum(
  character: Character,
  manager: ImprovementManager,
  additionalCyberware = 0,
  additionalBioware = 0,
): boolean {
  const base = getEssenceMaximum(character, manager);
  const totals = sumWareEssenceByKind(character);
  const cyberware = totals.cyberware + additionalCyberware;
  const bioware = totals.bioware + additionalBioware;
  const essenceHole = totals.essenceHole;

  let deduction: number;
  if (cyberware > bioware) {
    deduction = cyberware + bioware / 2;
  } else {
    deduction = bioware + cyberware / 2;
  }
  deduction += essenceHole;

  const projected = roundEssence(base - deduction);
  return projected < Math.max(0.01, character.attributes.ESS.min);
}

export function getEffectiveMagicAfterEssenceLoss(
  character: Character,
  manager: ImprovementManager,
  code: 'MAG' | 'RES',
): number {
  if (!character.flags.magEnabled && code === 'MAG') return 0;
  if (!character.flags.resEnabled && code === 'RES') return 0;

  const total = getAttributeTotal(character, code);
  const penalty = calculateEssencePenalty(character, manager);
  return Math.max(0, total - penalty);
}
