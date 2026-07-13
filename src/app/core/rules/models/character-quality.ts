import { Character } from './character';

export type QualityOrigin = 'selected' | 'metatype' | 'metatypeRemovable';

export interface QualityAdjustment {
  /** Effective BP for this quality (used when buying off a metatypeRemovable quality). */
  bp: number;
  excludeFromLimit: boolean;
}

export function isMetatypeBundledOrigin(origin: QualityOrigin | undefined): boolean {
  return origin === 'metatype' || origin === 'metatypeRemovable';
}

export function getQualityOrigin(character: Character, qualityName: string): QualityOrigin {
  return character.qualityOrigins?.[qualityName] ?? 'selected';
}

export function getQualityAdjustment(
  character: Character,
  qualityName: string,
): QualityAdjustment | undefined {
  return character.qualityAdjustments?.[qualityName];
}

export function buyOffMetatypeQualityBp(catalogBp: number): number {
  return Math.abs(catalogBp);
}
