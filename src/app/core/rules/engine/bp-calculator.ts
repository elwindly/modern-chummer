import { AttributeCode } from '../models/attribute';
import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import {
  getQualityAdjustment,
  getQualityOrigin,
  isMetatypeBundledOrigin,
} from '../models/character-quality';
import {
  QualityCatalogEntry,
  isNegativeQuality,
  isPositiveQuality,
} from '../models/economy';
import { ImprovementType } from '../models/improvement';
import { getTotalMaximum } from './attribute-totals';
import { ImprovementManager } from './improvement-manager';
import { calculateSkillBp } from './skill-calculator';
import { calculateMartialArtBp } from './martial-art-calculator';
import { calculateMagicBp } from './magic-calculator';

const PRIMARY_ATTRIBUTES: AttributeCode[] = [
  'BOD',
  'AGI',
  'REA',
  'STR',
  'CHA',
  'INT',
  'LOG',
  'WIL',
];

const SPECIAL_ATTRIBUTES: AttributeCode[] = ['EDG', 'MAG', 'RES'];

export interface BpBreakdown {
  remaining: number;
  metatype: number;
  contacts: number;
  enemies: number;
  positiveQualities: number;
  negativeQualities: number;
  primaryAttributes: number;
  specialAttributes: number;
  activeSkills: number;
  skillGroups: number;
  knowledgeSkills: number;
  martialArts: number;
  martialArtManeuvers: number;
  spells: number;
  complexForms: number;
  initiation: number;
  nuyenBp: number;
}

function contactCost(contact: Character['contacts'][number], bpContact: number): number {
  return (contact.connection + contact.loyalty + contact.group) * bpContact;
}

function calculateAttributeBp(
  character: Character,
  codes: AttributeCode[],
  options: CharacterOptions,
): number {
  let total = 0;

  for (const code of codes) {
    const state = character.attributes[code];
    const raises = Math.max(0, state.base - state.min);
    total += raises * options.bpAttribute;

    const racialMax = getTotalMaximum(character, code);
    if (state.base === racialMax && racialMax > 0 && state.min !== racialMax) {
      total += options.bpAttributeMax;
    }
  }

  return total;
}

function applyFreeContacts(
  contactSpent: number,
  character: Character,
  options: CharacterOptions,
): number {
  let remaining = contactSpent;

  if (options.freeContacts) {
    const cha = character.attributes.CHA.base;
    const freePoints = cha * options.freeContactsMultiplier;
    const refund = Math.min(remaining, freePoints);
    remaining -= refund;
  }

  if (options.freeContactsFlat) {
    const refund = Math.min(remaining, options.freeContactsFlatNumber);
    remaining -= refund;
  }

  return remaining;
}

export function calculateBp(
  character: Character,
  manager: ImprovementManager,
  options: CharacterOptions,
  qualityCatalog: Map<string, QualityCatalogEntry>,
): BpBreakdown {
  let remaining = character.buildPoints;

  const metatype = character.metatypeBp;
  remaining -= metatype;

  let contacts = 0;
  let enemies = 0;
  let grossContactCost = 0;

  for (const contact of character.contacts) {
    if (contact.free) continue;

    const cost = contactCost(contact, options.bpContact);
    if (contact.enemy) {
      remaining += cost;
      enemies += cost;
    } else {
      grossContactCost += cost;
    }
  }

  contacts = applyFreeContacts(grossContactCost, character, options);
  remaining -= contacts;

  let positiveQualities = 0;
  let negativeQualities = 0;

  for (const qualityName of character.qualities) {
    const entry = qualityCatalog.get(qualityName);
    if (!entry) continue;

    const origin = getQualityOrigin(character, qualityName);
    const adjustment = getQualityAdjustment(character, qualityName);

    if (isMetatypeBundledOrigin(origin) && !adjustment) continue;

    const bp = adjustment?.bp ?? entry.bp;

    if (adjustment) {
      remaining -= bp;
      continue;
    }

    if (entry.contributetolimit === 'no') continue;

    if (isPositiveQuality(entry)) {
      remaining -= bp;
      positiveQualities += bp;
    } else if (isNegativeQuality(entry)) {
      remaining -= bp;
      negativeQualities += bp;
    }
  }

  const freePositive = manager.valueOf(ImprovementType.FreePositiveQualities);
  const freeNegative = manager.valueOf(ImprovementType.FreeNegativeQualities);
  remaining += freePositive;
  positiveQualities -= freePositive;
  remaining += freeNegative;
  negativeQualities -= freeNegative;

  if (options.exceedNegativeQualitiesLimit && negativeQualities < -35) {
    const adjustment = negativeQualities + 35;
    remaining -= adjustment;
    negativeQualities = -35;
  }

  const primaryAttributes = calculateAttributeBp(character, PRIMARY_ATTRIBUTES, options);
  const specialAttributes = calculateAttributeBp(character, SPECIAL_ATTRIBUTES, options);
  remaining -= primaryAttributes + specialAttributes;

  const skillBp = calculateSkillBp(character, options);
  remaining -= skillBp.total;

  const martialBp = calculateMartialArtBp(
    character.martialArts ?? [],
    character.martialArtManeuvers ?? [],
    options,
  );
  remaining -= martialBp.total;

  const magicBp = calculateMagicBp(character, options);
  remaining -= magicBp.total;

  const nuyenBp = character.nuyenBpSpent;
  remaining -= nuyenBp;

  return {
    remaining,
    metatype,
    contacts,
    enemies,
    positiveQualities,
    negativeQualities,
    primaryAttributes,
    specialAttributes,
    activeSkills: skillBp.activeSkills,
    skillGroups: skillBp.skillGroups,
    knowledgeSkills: skillBp.knowledgeSkills,
    martialArts: martialBp.styles,
    martialArtManeuvers: martialBp.maneuvers,
    spells: magicBp.spells,
    complexForms: magicBp.complexForms,
    initiation: magicBp.initiation,
    nuyenBp,
  };
}

export function calculateRemainingBp(
  character: Character,
  manager: ImprovementManager,
  options: CharacterOptions,
  qualityCatalog: Map<string, QualityCatalogEntry>,
): number {
  return calculateBp(character, manager, options, qualityCatalog).remaining;
}

export function isAttributeBpWithinLimit(
  character: Character,
  options: CharacterOptions,
): boolean {
  if (options.allowExceedAttributeBp || character.ignoreRules) {
    return true;
  }

  const primaryBp = calculateAttributeBp(character, PRIMARY_ATTRIBUTES, options);
  return primaryBp <= character.buildPoints / 2;
}
