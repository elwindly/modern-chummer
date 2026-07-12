import { AttributeCode } from '../models/attribute';
import { Character } from '../models/character';
import { getAttributeTotal } from './attribute-totals';
import { ImprovementType } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';

export interface DerivedStats {
  physicalCm: number;
  stunCm: number;
  cmThreshold: number;
  cmThresholdOffset: number;
  cmOverflow: number;
  damageResistance: number;
  initiativeBonus: number;
}

export interface DerivedStatsOptions {
  moreLethalGameplay?: boolean;
}

export function deriveStats(
  character: Character,
  manager: ImprovementManager,
  options: DerivedStatsOptions = {},
): DerivedStats {
  const bod = getEffectiveAttribute(character, manager, 'BOD');
  const wil = getEffectiveAttribute(character, manager, 'WIL');

  const physicalCm =
    Math.ceil(bod / 2) + 8 + manager.valueOf(ImprovementType.PhysicalCM);
  const stunCm = Math.ceil(wil / 2) + 8 + manager.valueOf(ImprovementType.StunCM);

  const baseThreshold = options.moreLethalGameplay ? 2 : 3;

  return {
    physicalCm,
    stunCm,
    cmThreshold: baseThreshold + manager.valueOf(ImprovementType.CMThreshold),
    cmThresholdOffset: manager.valueOf(ImprovementType.CMThresholdOffset),
    cmOverflow: bod + manager.valueOf(ImprovementType.CMOverflow) + 1,
    damageResistance: manager.valueOf(ImprovementType.DamageResistance),
    initiativeBonus: manager.valueOf(ImprovementType.Initiative),
  };
}

function getEffectiveAttribute(
  character: Character,
  manager: ImprovementManager,
  code: AttributeCode,
): number {
  return getAttributeTotal(character, code);
}
