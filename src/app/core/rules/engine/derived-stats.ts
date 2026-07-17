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
  initiativePasses: number;
  composure: number;
  judgeIntentions: number;
  liftCarry: number;
  memory: number;
  walking: number;
  running: number;
  matrixInitiativeBonus: number;
  unarmedDV: number;
  reach: number;
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
  const cha = getEffectiveAttribute(character, manager, 'CHA');
  const intAttr = getEffectiveAttribute(character, manager, 'INT');
  const log = getEffectiveAttribute(character, manager, 'LOG');
  const agi = getEffectiveAttribute(character, manager, 'AGI');
  const str = getEffectiveAttribute(character, manager, 'STR');

  const physicalCm =
    Math.ceil(bod / 2) + 8 + manager.valueOf(ImprovementType.PhysicalCM);
  const stunCm = Math.ceil(wil / 2) + 8 + manager.valueOf(ImprovementType.StunCM);

  const baseThreshold = options.moreLethalGameplay ? 2 : 3;

  const movementPercent = manager.valueOf(ImprovementType.MovementPercent);
  const movementMultiplier = 1 + movementPercent / 100;
  const walking = agi * 2 * movementMultiplier;
  const running = agi * 4;

  return {
    physicalCm,
    stunCm,
    cmThreshold: baseThreshold + manager.valueOf(ImprovementType.CMThreshold),
    cmThresholdOffset: manager.valueOf(ImprovementType.CMThresholdOffset),
    cmOverflow: bod + manager.valueOf(ImprovementType.CMOverflow) + 1,
    damageResistance: manager.valueOf(ImprovementType.DamageResistance),
    initiativeBonus: manager.valueOf(ImprovementType.Initiative),
    initiativePasses:
      1 +
      manager.valueOf(ImprovementType.InitiativePass) +
      manager.valueOf(ImprovementType.InitiativePassAdd),
    composure: cha + wil,
    judgeIntentions: intAttr + cha,
    liftCarry: str * 15,
    memory: log + wil,
    walking,
    running,
    matrixInitiativeBonus: manager.valueOf(ImprovementType.MatrixInitiative),
    unarmedDV: manager.valueOf(ImprovementType.UnarmedDV),
    reach: manager.valueOf(ImprovementType.Reach),
  };
}

function getEffectiveAttribute(
  character: Character,
  manager: ImprovementManager,
  code: AttributeCode,
): number {
  return getAttributeTotal(character, code);
}
