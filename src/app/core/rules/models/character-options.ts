export interface CharacterOptions {
  name: string;
  buildPoints: number;
  maximumAvailability: number;
  nuyenPerBp: number;
  bpAttribute: number;
  bpAttributeMax: number;
  bpContact: number;
  bpMartialArt: number;
  bpMartialArtManeuver: number;
  bpSkillGroup: number;
  bpActiveSkill: number;
  bpKnowledgeSkill: number;
  freeContacts: boolean;
  freeContactsMultiplier: number;
  freeContactsFlat: boolean;
  freeContactsFlatNumber: number;
  exceedNegativeQualities: boolean;
  exceedNegativeQualitiesLimit: boolean;
  allowExceedAttributeBp: boolean;
  moreLethalGameplay: boolean;
}

export const DEFAULT_CHARACTER_OPTIONS: CharacterOptions = {
  name: 'SR4 Default',
  buildPoints: 400,
  maximumAvailability: 12,
  nuyenPerBp: 5000,
  bpAttribute: 10,
  bpAttributeMax: 15,
  bpContact: 1,
  bpMartialArt: 5,
  bpMartialArtManeuver: 2,
  bpSkillGroup: 10,
  bpActiveSkill: 4,
  bpKnowledgeSkill: 1,
  freeContacts: false,
  freeContactsMultiplier: 2,
  freeContactsFlat: false,
  freeContactsFlatNumber: 0,
  exceedNegativeQualities: false,
  exceedNegativeQualitiesLimit: false,
  allowExceedAttributeBp: false,
  moreLethalGameplay: false,
};

export function loadCharacterOptions(data: Partial<CharacterOptions>): CharacterOptions {
  return { ...DEFAULT_CHARACTER_OPTIONS, ...data };
}
