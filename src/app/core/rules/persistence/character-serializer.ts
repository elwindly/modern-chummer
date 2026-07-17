import { Character } from '../models/character';
import { Improvement } from '../models/improvement';
import { CharacterStreetItem } from '../models/street-gear';
import { CharacterWare } from '../models/ware';
import {
  CharacterCritterPower,
  CharacterInitiationGrade,
  CharacterMetamagic,
  CharacterPower,
  CharacterProgram,
  CharacterSpell,
} from '../models/magic';
import { CharacterVehicle, CharacterVehicleMod } from '../models/vehicle';

export interface StoredCharacterDocument {
  version: 1;
  id: string;
  name: string;
  metatype: string;
  createdAt: string;
  updatedAt: string;
  character: Character;
}

export interface CharacterListEntry {
  id: string;
  name: string;
  metatype: string;
  updatedAt: string;
}

export function serializeCharacter(
  character: Character,
  meta: { createdAt?: string; updatedAt?: string } = {},
): StoredCharacterDocument {
  const now = new Date().toISOString();

  return {
    version: 1,
    id: character.id,
    name: character.name || 'Unnamed character',
    metatype: character.metatype,
    createdAt: meta.createdAt ?? now,
    updatedAt: meta.updatedAt ?? now,
    character: cloneCharacter(character),
  };
}

export function deserializeCharacter(document: StoredCharacterDocument): Character {
  const character = cloneCharacter(document.character);
  character.martialArts ??= [];
  character.martialArtManeuvers ??= [];
  character.gear ??= [];
  character.weapons ??= [];
  character.armors ??= [];
  character.cyberware ??= [];
  character.bioware ??= [];
  character.spells ??= [];
  character.powers ??= [];
  character.programs ??= [];
  character.metamagics ??= [];
  character.initiationGrades ??= [];
  character.critterPowers ??= [];
  character.vehicles ??= [];
  character.created ??= false;
  return character;
}

export function toListEntry(document: StoredCharacterDocument): CharacterListEntry {
  return {
    id: document.id,
    name: document.name,
    metatype: document.metatype,
    updatedAt: document.updatedAt,
  };
}

function cloneCharacter(character: Character): Character {
  return {
    ...character,
    qualities: [...character.qualities],
    qualityOrigins: character.qualityOrigins ? { ...character.qualityOrigins } : {},
    qualityAdjustments: character.qualityAdjustments
      ? Object.fromEntries(
          Object.entries(character.qualityAdjustments).map(([name, adjustment]) => [
            name,
            { ...adjustment },
          ]),
        )
      : {},
    contacts: character.contacts.map((contact) => ({ ...contact })),
    skills: (character.skills ?? []).map((skill) => ({ ...skill })),
    skillGroups: (character.skillGroups ?? []).map((group) => ({ ...group })),
    knowledgeSkills: (character.knowledgeSkills ?? []).map((skill) => ({ ...skill })),
    martialArts: (character.martialArts ?? []).map((art) => ({ ...art })),
    martialArtManeuvers: (character.martialArtManeuvers ?? []).map((maneuver) => ({
      ...maneuver,
    })),
    gear: (character.gear ?? []).map(cloneStreetItem),
    weapons: (character.weapons ?? []).map(cloneStreetItem),
    armors: (character.armors ?? []).map(cloneStreetItem),
    cyberware: (character.cyberware ?? []).map(cloneWare),
    bioware: (character.bioware ?? []).map(cloneWare),
    spells: (character.spells ?? []).map((spell) => ({ ...spell })),
    powers: (character.powers ?? []).map((power) => ({ ...power })),
    programs: (character.programs ?? []).map((program) => ({ ...program })),
    metamagics: (character.metamagics ?? []).map((metamagic) => ({ ...metamagic })),
    initiationGrades: (character.initiationGrades ?? []).map((grade) => ({ ...grade })),
    critterPowers: (character.critterPowers ?? []).map((power) => ({ ...power })),
    vehicles: (character.vehicles ?? []).map(cloneVehicle),
    profile: { ...(character.profile ?? {}) },
    purchases: character.purchases.map((purchase) => ({ ...purchase })),
    improvements: character.improvements.map(cloneImprovement),
    flags: { ...character.flags },
    attributes: Object.fromEntries(
      Object.entries(character.attributes).map(([code, state]) => [code, { ...state }]),
    ) as Character['attributes'],
  };
}

function cloneStreetItem(item: CharacterStreetItem): CharacterStreetItem {
  return {
    ...item,
    children: item.children.map(cloneStreetItem),
  };
}

function cloneWare(item: CharacterWare): CharacterWare {
  return {
    ...item,
    children: item.children.map(cloneWare),
  };
}

function cloneVehicle(item: CharacterVehicle): CharacterVehicle {
  return {
    ...item,
    mods: item.mods.map((mod: CharacterVehicleMod) => ({ ...mod })),
  };
}

function cloneImprovement(improvement: Improvement): Improvement {
  return { ...improvement };
}

export function createCharacterId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `character-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
