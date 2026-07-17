import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import {
  CharacterSkill,
  CharacterSkillGroup,
  SkillBpBreakdown,
} from '../models/skill';

export function getFreeKnowledgeSkillPoints(character: Character, options?: CharacterOptions): number {
  if (character.knowledgeSkillPoints !== undefined) {
    return character.knowledgeSkillPoints;
  }
  if (options?.buildMethod === 'Karma' && !options.freeKarmaKnowledge) {
    return 0;
  }
  const int = character.attributes.INT.base;
  const log = character.attributes.LOG.base;
  return (int + log) * 3;
}

export function calculateActiveSkillBp(
  skill: CharacterSkill,
  options: CharacterOptions,
): number {
  if (skill.grouped || skill.knowledge) return 0;
  if (skill.rating <= 0) return 0;

  if (options.buildMethod === 'Karma') {
    let total = 0;
    for (let rating = 1; rating <= skill.rating; rating++) {
      total += rating * options.karmaActiveSkill;
    }
    if (skill.specialization?.trim()) {
      total += options.karmaSpecialization;
    }
    return total;
  }

  let total = skill.rating * options.bpActiveSkill;
  if (skill.rating > 6) {
    total += (skill.rating - 6) * options.bpActiveSkill;
  }
  return total;
}

export function calculateSkillGroupBp(
  group: CharacterSkillGroup,
  options: CharacterOptions,
): number {
  if (group.rating <= 0) return 0;
  if (options.buildMethod === 'Karma') {
    let total = 0;
    for (let rating = 1; rating <= group.rating; rating++) {
      total += rating * options.karmaSkillGroup;
    }
    return total;
  }
  return group.rating * options.bpSkillGroup;
}

export function countKnowledgeSkillPoints(skills: CharacterSkill[]): number {
  let points = 0;
  for (const skill of skills) {
    if (!skill.knowledge) continue;
    points += skill.rating;
    if (skill.specialization?.trim()) {
      points += 1;
    }
  }
  return points;
}

export function calculateKnowledgeSkillsBp(
  character: Character,
  options: CharacterOptions,
): number {
  const used = countKnowledgeSkillPoints(character.knowledgeSkills ?? []);
  const free = getFreeKnowledgeSkillPoints(character, options);
  const over = Math.max(0, used - free);
  const rate =
    options.buildMethod === 'Karma' ? options.karmaKnowledgeSkill : options.bpKnowledgeSkill;
  return over * rate;
}

export function calculateSkillBp(
  character: Character,
  options: CharacterOptions,
): SkillBpBreakdown {
  let activeSkills = 0;
  for (const skill of character.skills ?? []) {
    activeSkills += calculateActiveSkillBp(skill, options);
  }

  let skillGroups = 0;
  for (const group of character.skillGroups ?? []) {
    skillGroups += calculateSkillGroupBp(group, options);
  }

  const knowledgeSkills = calculateKnowledgeSkillsBp(character, options);

  return {
    activeSkills,
    skillGroups,
    knowledgeSkills,
    total: activeSkills + skillGroups + knowledgeSkills,
  };
}
