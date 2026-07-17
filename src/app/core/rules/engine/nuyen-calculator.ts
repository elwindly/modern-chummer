import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import { ImprovementType } from '../models/improvement';
import { calculateTotalNuyenSpent } from './ware-calculator';
import { calculateTotalVehicleCost } from './vehicle-calculator';
import { calculateLifestyleCost } from './lifestyle-calculator';
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
  const fromBp =
    options.buildMethod === 'Karma'
      ? character.nuyenBpSpent * options.karmaNuyen
      : character.nuyenBpSpent * options.nuyenPerBp;
  const fromImprovements = manager.valueOf(ImprovementType.Nuyen);
  const total = fromBp + fromImprovements;

  const spent =
    calculateTotalNuyenSpent(character) +
    calculateTotalVehicleCost(character) +
    calculateLifestyleCost(character);

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

export function getMaxNuyenBp(character: Character, manager: ImprovementManager, options?: CharacterOptions): number {
  const bonus = manager.valueOf(ImprovementType.NuyenMaxBP);
  const pool = options?.buildMethod === 'Karma'
    ? (character.buildKarma ?? options.buildKarma)
    : character.buildPoints;
  return Math.floor(pool / 10) + bonus;
}
