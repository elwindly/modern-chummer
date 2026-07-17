export type BuildMethod = 'BP' | 'Karma';

export interface CharacterOptions {
  name: string;
  buildMethod: BuildMethod;
  buildPoints: number;
  buildKarma: number;
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
  bpSpell: number;
  bpComplexForm: number;
  bpSpirit: number;
  bpFocus: number;
  karmaAttribute: number;
  karmaActiveSkill: number;
  karmaSkillGroup: number;
  karmaKnowledgeSkill: number;
  karmaSpecialization: number;
  karmaSpell: number;
  karmaNewComplexForm: number;
  karmaImproveComplexForm: number;
  karmaSpirit: number;
  karmaFocus: number;
  karmaInitiation: number;
  karmaMetamagic: number;
  karmaNuyen: number;
  freeKarmaKnowledge: boolean;
  alternateComplexFormCost: boolean;
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
  buildMethod: 'BP',
  buildPoints: 400,
  buildKarma: 750,
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
  bpSpell: 3,
  bpComplexForm: 1,
  bpSpirit: 1,
  bpFocus: 1,
  karmaAttribute: 5,
  karmaActiveSkill: 2,
  karmaSkillGroup: 5,
  karmaKnowledgeSkill: 1,
  karmaSpecialization: 2,
  karmaSpell: 5,
  karmaNewComplexForm: 2,
  karmaImproveComplexForm: 1,
  karmaSpirit: 1,
  karmaFocus: 1,
  karmaInitiation: 3,
  karmaMetamagic: 15,
  karmaNuyen: 2500,
  freeKarmaKnowledge: false,
  alternateComplexFormCost: false,
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
