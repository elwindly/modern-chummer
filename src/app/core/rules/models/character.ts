import { AttributeCode, createDefaultAttributes } from './attribute';
import { Improvement } from './improvement';

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
  metavariant?: string;
  buildPoints: number;
  attributes: ReturnType<typeof createDefaultAttributes>;
  improvements: Improvement[];
  flags: CharacterFlags;
}

export function createEmptyCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: overrides.id ?? 'character-1',
    name: '',
    metatype: 'Human',
    buildPoints: 400,
    attributes: createDefaultAttributes({
      BOD: { min: 1, max: 6, augMax: 9, base: 4 },
      AGI: { min: 1, max: 6, augMax: 9, base: 4 },
      REA: { min: 1, max: 6, augMax: 9, base: 4 },
      STR: { min: 1, max: 6, augMax: 9, base: 4 },
      CHA: { min: 1, max: 6, augMax: 9, base: 4 },
      INT: { min: 1, max: 6, augMax: 9, base: 4 },
      LOG: { min: 1, max: 6, augMax: 9, base: 4 },
      WIL: { min: 1, max: 6, augMax: 9, base: 4 },
      EDG: { min: 2, max: 7, augMax: 7, base: 2 },
      MAG: { min: 0, max: 0, augMax: 0, base: 0 },
      RES: { min: 0, max: 0, augMax: 0, base: 0 },
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

export function getAttributeTotal(character: Character, code: AttributeCode): number {
  return character.attributes[code].value;
}
