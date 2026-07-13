export interface CharacterSkill {
  name: string;
  rating: number;
  ratingMax?: number;
  skillGroup?: string;
  skillCategory?: string;
  attribute?: string;
  defaultSkill?: boolean;
  grouped?: boolean;
  specialization?: string;
  knowledge?: boolean;
  exotic?: boolean;
}

export interface CharacterSkillGroup {
  name: string;
  rating: number;
  ratingMax?: number;
  broken?: boolean;
}

export type CharacterKnowledgeSkill = CharacterSkill;

export interface SkillBpBreakdown {
  activeSkills: number;
  skillGroups: number;
  knowledgeSkills: number;
  total: number;
}
