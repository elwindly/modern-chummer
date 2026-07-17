import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import {
  CharacterCritterPower,
  CharacterInitiationGrade,
  CharacterMetamagic,
  CharacterPower,
  CharacterProgram,
  CharacterSpell,
  PowerCatalogEntry,
  ProgramCatalogEntry,
} from '../models/magic';
import { ImprovementType } from '../models/improvement';
import { createCharacterId } from '../persistence/character-serializer';
import { getAttributeTotal } from './attribute-totals';
import { getEffectiveSkillRating } from './skill-totals';
import { ImprovementManager } from './improvement-manager';

export function createSpell(name: string, category = '', options: Partial<CharacterSpell> = {}): CharacterSpell {
  return {
    id: options.id ?? createCharacterId(),
    name,
    category,
    limited: options.limited ?? false,
    extended: options.extended ?? false,
    extra: options.extra,
  };
}

export function createPowerFromCatalog(
  entry: PowerCatalogEntry,
  rating = 1,
  options: Partial<CharacterPower> = {},
): CharacterPower {
  const levels = String(entry.levels ?? 'no').toLowerCase() === 'yes';
  const pointsPerLevel = Number(entry.points) || 0;
  const effectiveRating = levels ? Math.max(1, rating) : 0;
  const totalPoints = levels ? pointsPerLevel * effectiveRating : pointsPerLevel;

  return {
    id: options.id ?? createCharacterId(),
    name: entry.name,
    rating: effectiveRating,
    levels,
    pointsPerLevel,
    totalPoints,
    extra: options.extra,
  };
}

export function createProgramFromCatalog(
  entry: ProgramCatalogEntry,
  rating = 1,
  options: Partial<CharacterProgram> = {},
): CharacterProgram {
  const maxRating = Number(entry.maxrating ?? entry.rating ?? 6) || 6;
  const effectiveRating = Math.min(Math.max(1, rating), maxRating);
  const category = Array.isArray(entry.category)
    ? String(entry.category[0] ?? '')
    : String(entry.category ?? '');

  return {
    id: options.id ?? createCharacterId(),
    name: entry.name,
    category,
    rating: effectiveRating,
    maxRating,
    capacity: String(entry.capacity ?? ''),
    extra: options.extra,
  };
}

export function createMetamagic(name: string, paidWithKarma = false): CharacterMetamagic {
  return {
    id: createCharacterId(),
    name,
    paidWithKarma,
  };
}

export function createInitiationGrade(
  grade: number,
  options: Partial<CharacterInitiationGrade> = {},
): CharacterInitiationGrade {
  return {
    id: options.id ?? createCharacterId(),
    grade,
    group: options.group ?? false,
    ordeal: options.ordeal ?? false,
    technomancer: options.technomancer ?? false,
    notes: options.notes,
  };
}

export function createCritterPower(name: string, points = 0, rating = 0): CharacterCritterPower {
  return {
    id: createCharacterId(),
    name,
    rating,
    points,
  };
}

export function getSpellLimit(character: Character, manager: ImprovementManager): number {
  let skillValue = 0;
  for (const skill of character.skills) {
    if (skill.name === 'Spellcasting' || skill.name === 'Ritual Spellcasting') {
      skillValue = Math.max(skillValue, getEffectiveSkillRating(character, skill));
    }
  }
  return 2 * skillValue + manager.valueOf(ImprovementType.SpellLimit);
}

export function calculateSpellBp(character: Character, options: CharacterOptions): number {
  if (!character.flags.magicianEnabled) return 0;
  return character.spells.length * options.bpSpell;
}

export function getAdeptPowerPointPool(character: Character, manager: ImprovementManager): number {
  if (!character.flags.adeptEnabled) return 0;

  let mag: number;
  if (character.flags.adeptEnabled && character.flags.magicianEnabled) {
    mag = character.magAdept ?? 0;
  } else {
    mag = getAttributeTotal(character, 'MAG');
  }

  return mag + manager.valueOf(ImprovementType.AdeptPowerPoints);
}

export function calculatePowerPointsUsed(character: Character): number {
  return character.powers.reduce((sum, power) => sum + power.totalPoints, 0);
}

export function calculatePowerPointRemaining(
  character: Character,
  manager: ImprovementManager,
): number {
  return getAdeptPowerPointPool(character, manager) - calculatePowerPointsUsed(character);
}

export function calculateComplexFormBp(
  character: Character,
  options: CharacterOptions,
): number {
  if (!character.flags.technomancerEnabled) return 0;

  let total = 0;
  for (const program of character.programs) {
    if (options.alternateComplexFormCost) {
      total += options.bpSpell;
    } else {
      total += program.rating * options.bpComplexForm;
    }
  }
  return total;
}

export function calculateInitiationGradeKarmaCost(
  grade: CharacterInitiationGrade,
  options: CharacterOptions,
): number {
  const base = 10 + grade.grade * options.karmaInitiation;
  let multiplier = 1;
  if (grade.group) multiplier -= 0.2;
  if (grade.ordeal) multiplier -= 0.2;
  return Math.ceil(base * multiplier);
}

export function calculateInitiationBp(
  character: Character,
  options: CharacterOptions,
): number {
  let total = 0;
  for (const grade of character.initiationGrades) {
    total += calculateInitiationGradeKarmaCost(grade, options);
  }
  for (const metamagic of character.metamagics) {
    if (metamagic.paidWithKarma) {
      total += options.karmaMetamagic;
    }
  }
  return total;
}

export function calculateMagicBp(
  character: Character,
  options: CharacterOptions,
): {
  spells: number;
  complexForms: number;
  initiation: number;
  total: number;
} {
  const spells = calculateSpellBp(character, options);
  const complexForms = calculateComplexFormBp(character, options);
  const initiation = calculateInitiationBp(character, options);
  return {
    spells,
    complexForms,
    initiation,
    total: spells + complexForms + initiation,
  };
}

export function refreshPowerPoints(power: CharacterPower): CharacterPower {
  return {
    ...power,
    totalPoints: power.levels ? power.pointsPerLevel * Math.max(1, power.rating) : power.pointsPerLevel,
  };
}
