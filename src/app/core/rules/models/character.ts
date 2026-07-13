import { createDefaultAttributes } from './attribute';
import { CharacterContact, PurchasedItem } from './economy';
import { Improvement } from './improvement';
import { QualityAdjustment, QualityOrigin } from './character-quality';

export type BonusNode = Record<string, unknown>;

export interface CharacterFlags {
  magicianEnabled: boolean;
  adeptEnabled: boolean;
  technomancerEnabled: boolean;
  critterEnabled: boolean;
  initiationEnabled: boolean;
  magEnabled: boolean;
  resEnabled: boolean;
}

export interface Character {
  id: string;
  name: string;
  metatype: string;
  metatypeCategory?: string;
  metavariant?: string;
  metatypeBp: number;
  buildPoints: number;
  maximumAvailability: number;
  nuyenBpSpent: number;
  ignoreRules?: boolean;
  magicTradition?: string;
  technomancerStream?: string;
  qualities: string[];
  qualityOrigins?: Record<string, QualityOrigin>;
  qualityAdjustments?: Record<string, QualityAdjustment>;
  contacts: CharacterContact[];
  purchases: PurchasedItem[];
  attributes: ReturnType<typeof createDefaultAttributes>;
  improvements: Improvement[];
  flags: CharacterFlags;
}

export function createEmptyCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: overrides.id ?? 'character-1',
    name: '',
    metatype: 'Human',
    metatypeCategory: 'Metahuman',
    metatypeBp: 0,
    buildPoints: 400,
    maximumAvailability: 12,
    nuyenBpSpent: 0,
    qualities: [],
    qualityOrigins: {},
    qualityAdjustments: {},
    contacts: [],
    purchases: [],
    attributes: createDefaultAttributes({
      BOD: { min: 1, max: 6, augMax: 9 },
      AGI: { min: 1, max: 6, augMax: 9 },
      REA: { min: 1, max: 6, augMax: 9 },
      STR: { min: 1, max: 6, augMax: 9 },
      CHA: { min: 1, max: 6, augMax: 9 },
      INT: { min: 1, max: 6, augMax: 9 },
      LOG: { min: 1, max: 6, augMax: 9 },
      WIL: { min: 1, max: 6, augMax: 9 },
      EDG: { min: 2, max: 7, augMax: 7 },
      MAG: { min: 0, max: 0, augMax: 0 },
      RES: { min: 0, max: 0, augMax: 0 },
      ESS: { min: 1, max: 6, augMax: 6, base: 6 },
    }),
    improvements: [],
    flags: {
      magicianEnabled: false,
      adeptEnabled: false,
      technomancerEnabled: false,
      critterEnabled: false,
      initiationEnabled: false,
      magEnabled: false,
      resEnabled: false,
    },
    ...overrides,
  };
}

export { getAttributeTotal, getEffectiveLimits } from '../engine/attribute-totals';
