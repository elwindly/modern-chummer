import { Character } from '../models/character';
import { CharacterSkill, CharacterSkillGroup } from '../models/skill';
import { Improvement, ImprovementType } from '../models/improvement';

function matchesExclude(improvement: Improvement, skill: CharacterSkill): boolean {
  if (!improvement.exclude) return false;
  return (
    improvement.exclude.includes(skill.name) ||
    (skill.skillCategory !== undefined && improvement.exclude.includes(skill.skillCategory))
  );
}

function sumRatingModifiers(
  improvements: Improvement[],
  skill: CharacterSkill,
): number {
  let total = 0;

  for (const improvement of improvements) {
    if (!improvement.enabled || !improvement.addToRating) continue;

    if (improvement.type === ImprovementType.Skill && improvement.improvedName === skill.name) {
      total += improvement.value * improvement.rating;
    }

    if (
      improvement.type === ImprovementType.SkillGroup &&
      skill.skillGroup &&
      improvement.improvedName === skill.skillGroup &&
      !matchesExclude(improvement, skill)
    ) {
      total += improvement.value * improvement.rating;
    }

    if (
      improvement.type === ImprovementType.SkillCategory &&
      skill.skillCategory &&
      improvement.improvedName === skill.skillCategory &&
      !matchesExclude(improvement, skill)
    ) {
      total += improvement.value * improvement.rating;
    }
  }

  return total;
}

export function getSkillRatingMaximumModifiers(
  improvements: Improvement[],
  skillName: string,
): number {
  return improvements
    .filter(
      (item) =>
        item.enabled &&
        item.type === ImprovementType.Skill &&
        item.improvedName === skillName,
    )
    .reduce((sum, item) => sum + item.maximum * item.rating, 0);
}

export function getSkillRatingMaximum(character: Character, skill: CharacterSkill): number {
  const baseMax = skill.ratingMax ?? 6;
  const modifiers = getSkillRatingMaximumModifiers(character.improvements, skill.name);
  return baseMax + modifiers;
}

export function getSkillRatingModifiers(character: Character, skill: CharacterSkill): number {
  return sumRatingModifiers(character.improvements, skill);
}

export function getEffectiveSkillRating(character: Character, skill: CharacterSkill): number {
  const max = getSkillRatingMaximum(character, skill);
  const total = skill.rating + getSkillRatingModifiers(character, skill);
  return Math.min(max, Math.max(0, total));
}

export function getSkillGroupRatingMaximum(group: CharacterSkillGroup): number {
  return group.ratingMax ?? 6;
}

export function isDefaultSkill(skill: CharacterSkill | { defaultSkill?: boolean }): boolean {
  return skill.defaultSkill === true;
}

export function characterHasSkillAtRating(
  character: Character,
  skillName: string,
  minRating = 1,
): boolean {
  const active = character.skills.find((skill) => skill.name === skillName);
  if (active && getEffectiveSkillRating(character, active) >= minRating) {
    return true;
  }

  const knowledge = character.knowledgeSkills.find((skill) => skill.name === skillName);
  if (knowledge && knowledge.rating >= minRating) {
    return true;
  }

  return false;
}

export function syncSkillGrouping(character: Character): void {
  const groupMap = new Map(character.skillGroups.map((group) => [group.name, group]));

  for (const skill of character.skills) {
    if (!skill.skillGroup) {
      skill.grouped = false;
      continue;
    }

    const group = groupMap.get(skill.skillGroup);
    if (!group || group.broken || group.rating <= 0) {
      skill.grouped = false;
      continue;
    }

    if (skill.rating > group.rating) {
      group.broken = true;
      skill.grouped = false;
    } else {
      skill.grouped = true;
    }
  }
}
