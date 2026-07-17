import { createDefaultAttributes } from './attribute';
import { CharacterContact, PurchasedItem } from './economy';
import { Improvement } from './improvement';
import { QualityAdjustment, QualityOrigin } from './character-quality';
import { createEmptyProfile, CharacterProfile } from './character-profile';
import {
  CharacterMartialArt,
  CharacterMartialArtManeuver,
  CharacterSkill,
  CharacterSkillGroup,
} from './skill';
import { CharacterStreetItem } from './street-gear';
import { CharacterWare } from './ware';
import {
  CharacterCritterPower,
  CharacterInitiationGrade,
  CharacterMetamagic,
  CharacterPower,
  CharacterProgram,
  CharacterSpell,
} from './magic';
import { CharacterVehicle } from './vehicle';

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
  created?: boolean;
  magicTradition?: string;
  technomancerStream?: string;
  magAdept?: number;
  qualities: string[];
  qualityOrigins?: Record<string, QualityOrigin>;
  qualityAdjustments?: Record<string, QualityAdjustment>;
  skills: CharacterSkill[];
  skillGroups: CharacterSkillGroup[];
  knowledgeSkills: CharacterSkill[];
  martialArts: CharacterMartialArt[];
  martialArtManeuvers: CharacterMartialArtManeuver[];
  gear: CharacterStreetItem[];
  weapons: CharacterStreetItem[];
  armors: CharacterStreetItem[];
  cyberware: CharacterWare[];
  bioware: CharacterWare[];
  spells: CharacterSpell[];
  powers: CharacterPower[];
  programs: CharacterProgram[];
  metamagics: CharacterMetamagic[];
  initiationGrades: CharacterInitiationGrade[];
  critterPowers: CharacterCritterPower[];
  vehicles: CharacterVehicle[];
  knowledgeSkillPoints?: number;
  profile: CharacterProfile;
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
    skills: [],
    skillGroups: [],
    knowledgeSkills: [],
    martialArts: [],
    martialArtManeuvers: [],
    gear: [],
    weapons: [],
    armors: [],
    cyberware: [],
    bioware: [],
    spells: [],
    powers: [],
    programs: [],
    metamagics: [],
    initiationGrades: [],
    critterPowers: [],
    vehicles: [],
    created: false,
    profile: createEmptyProfile(),
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
