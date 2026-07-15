import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import { ImprovementType } from '../models/improvement';
import { calculateTotalStreetCost } from './gear-calculator';
import { ImprovementManager } from './improvement-manager';

export interface NuyenBreakdown {
  remaining: number;
  fromBp: number;
  fromImprovements: number;
  spent: number;
}

export function calculateNuyen(
  character: Character,
  manager: ImprovementManager,
  options: CharacterOptions,
): NuyenBreakdown {
  const fromBp = character.nuyenBpSpent * options.nuyenPerBp;
  const fromImprovements = manager.valueOf(ImprovementType.Nuyen);
  const total = fromBp + fromImprovements;

  const spent = calculateTotalStreetCost(character);

  return {
    remaining: total - spent,
    fromBp,
    fromImprovements,
    spent,
  };
}

export function calculateRemainingNuyen(
  character: Character,
  manager: ImprovementManager,
  options: CharacterOptions,
): number {
  return calculateNuyen(character, manager, options).remaining;
}

export function getMaxNuyenBp(character: Character, manager: ImprovementManager): number {
  const bonus = manager.valueOf(ImprovementType.NuyenMaxBP);
  return Math.floor(character.buildPoints / 10) + bonus;
}
