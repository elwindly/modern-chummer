import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import {
  CharacterSkill,
  CharacterSkillGroup,
  SkillBpBreakdown,
} from '../models/skill';

export function getFreeKnowledgeSkillPoints(character: Character): number {
  if (character.knowledgeSkillPoints !== undefined) {
    return character.knowledgeSkillPoints;
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
  const free = getFreeKnowledgeSkillPoints(character);
  const over = Math.max(0, used - free);
  return over * options.bpKnowledgeSkill;
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
