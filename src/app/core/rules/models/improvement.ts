export enum ImprovementSource {
  Quality = 'Quality',
  Power = 'Power',
  Metatype = 'Metatype',
  Cyberware = 'Cyberware',
  Metavariant = 'Metavariant',
  Bioware = 'Bioware',
  Gear = 'Gear',
  Spell = 'Spell',
  MartialArtAdvantage = 'MartialArtAdvantage',
  Initiation = 'Initiation',
  Submersion = 'Submersion',
  Metamagic = 'Metamagic',
  Echo = 'Echo',
  Armor = 'Armor',
  ArmorMod = 'ArmorMod',
  CritterPower = 'CritterPower',
  ComplexForm = 'ComplexForm',
  Custom = 'Custom',
}

export enum ImprovementType {
  Attribute = 'Attribute',
  Text = 'Text',
  BallisticArmor = 'BallisticArmor',
  ImpactArmor = 'ImpactArmor',
  Reach = 'Reach',
  Nuyen = 'Nuyen',
  Essence = 'Essence',
  Reaction = 'Reaction',
  PhysicalCM = 'PhysicalCM',
  StunCM = 'StunCM',
  UnarmedDV = 'UnarmedDV',
  SkillGroup = 'SkillGroup',
  SkillCategory = 'SkillCategory',
  SkillAttribute = 'SkillAttribute',
  InitiativePass = 'InitiativePass',
  MatrixInitiative = 'MatrixInitiative',
  MatrixInitiativePass = 'MatrixInitiativePass',
  LifestyleCost = 'LifestyleCost',
  CMThreshold = 'CMThreshold',
  CMThresholdOffset = 'CMThresholdOffset',
  CMOverflow = 'CMOverflow',
  EnhancedArticulation = 'EnhancedArticulation',
  WeaponCategoryDV = 'WeaponCategoryDV',
  CyberwareEssCost = 'CyberwareEssCost',
  SpecialTab = 'SpecialTab',
  Initiative = 'Initiative',
  Uneducated = 'Uneducated',
  LivingPersonaResponse = 'LivingPersonaResponse',
  LivingPersonaSignal = 'LivingPersonaSignal',
  LivingPersonaFirewall = 'LivingPersonaFirewall',
  LivingPersonaSystem = 'LivingPersonaSystem',
  LivingPersonaBiofeedback = 'LivingPersonaBiofeedback',
  Smartlink = 'Smartlink',
  BiowareEssCost = 'BiowareEssCost',
  DamageResistance = 'DamageResistance',
  Skill = 'Skill',
  DrainResistance = 'DrainResistance',
  FadingResistance = 'FadingResistance',
  Restricted = 'Restricted',
  RestrictedItemCount = 'RestrictedItemCount',
  FreePositiveQualities = 'FreePositiveQualities',
  FreeNegativeQualities = 'FreeNegativeQualities',
  NuyenMaxBP = 'NuyenMaxBP',
  ConditionMonitor = 'ConditionMonitor',
  UnarmedDVPhysical = 'UnarmedDVPhysical',
  MovementPercent = 'MovementPercent',
  InitiativePassAdd = 'InitiativePassAdd',
  MatrixInitiativePassAdd = 'MatrixInitiativePassAdd',
  SpellLimit = 'SpellLimit',
  AdeptPowerPoints = 'AdeptPowerPoints',
}

export interface Improvement {
  improvedName: string;
  source: ImprovementSource;
  sourceName: string;
  type: ImprovementType;
  uniqueName: string;
  value: number;
  rating: number;
  minimum: number;
  maximum: number;
  augmented: number;
  augmentedMaximum: number;
  exclude: string;
  addToRating: boolean;
  enabled: boolean;
  custom: boolean;
}

export interface CreateImprovementInput {
  improvedName?: string;
  source: ImprovementSource;
  sourceName: string;
  type: ImprovementType;
  uniqueName?: string;
  value?: number;
  rating?: number;
  minimum?: number;
  maximum?: number;
  augmented?: number;
  augmentedMaximum?: number;
  exclude?: string;
  addToRating?: boolean;
  custom?: boolean;
}

export function createImprovement(input: CreateImprovementInput): Improvement {
  return {
    improvedName: input.improvedName ?? '',
    source: input.source,
    sourceName: input.sourceName,
    type: input.type,
    uniqueName: input.uniqueName ?? '',
    value: input.value ?? 0,
    rating: input.rating ?? 1,
    minimum: input.minimum ?? 0,
    maximum: input.maximum ?? 0,
    augmented: input.augmented ?? 0,
    augmentedMaximum: input.augmentedMaximum ?? 0,
    exclude: input.exclude ?? '',
    addToRating: input.addToRating ?? false,
    enabled: true,
    custom: input.custom ?? false,
  };
}
