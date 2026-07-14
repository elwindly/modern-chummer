import { ATTRIBUTE_CODES } from '../models/attribute';
import { BonusNode } from '../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import {
  AttributeSelectionConfig,
  SelectionKind,
  SelectionRequest,
  SkillSelectionConfig,
} from '../models/selection-request';
import { ImprovementManager } from './improvement-manager';
import { asBonusArray, nodeHasKey, nodeText } from './improvement-handlers/types';

export const INTERACTIVE_BONUS_KEYS = [
  'selecttext',
  'selectskill',
  'selectskillgroup',
  'selectattribute',
] as const;

export type InteractiveBonusKey = (typeof INTERACTIVE_BONUS_KEYS)[number];

const SELECTION_KIND_BY_KEY: Record<InteractiveBonusKey, SelectionKind> = {
  selecttext: 'text',
  selectskill: 'skill',
  selectskillgroup: 'skill-group',
  selectattribute: 'attribute',
};

const PROMPTS: Record<InteractiveBonusKey, string> = {
  selecttext: 'Enter a value',
  selectskill: 'Choose a skill',
  selectskillgroup: 'Choose a skill group',
  selectattribute: 'Choose an attribute',
};

export function buildSelectionRequest(
  key: InteractiveBonusKey,
  bonus: BonusNode,
  source: ImprovementSource,
  sourceName: string,
  rating: number,
  forcedValue?: string,
): SelectionRequest {
  return {
    id: `${sourceName}:${key}`,
    kind: SELECTION_KIND_BY_KEY[key],
    source,
    sourceName,
    rating,
    prompt: PROMPTS[key],
    config: { [key]: bonus[key] },
    forcedValue,
  };
}

function asStringList(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node.map((item) => nodeText(item));
  return [nodeText(node)];
}

export function parseAttributeSelectionConfig(node: BonusNode): AttributeSelectionConfig {
  return {
    allowedAttributes: node['attribute'] ? asStringList(node['attribute']).map((v) => v.toUpperCase()) : undefined,
    excludedAttributes: node['excludeattribute']
      ? asStringList(node['excludeattribute']).map((v) => v.toUpperCase())
      : undefined,
    min: node['min'] !== undefined ? Number(nodeText(node['min'])) : undefined,
    max: node['max'] !== undefined ? Number(nodeText(node['max'])) : undefined,
    augmented: node['val'] !== undefined ? Number(nodeText(node['val'])) : undefined,
    augmentedMaximum: node['aug'] !== undefined ? Number(nodeText(node['aug'])) : undefined,
    affectBase: node['affectbase'] !== undefined,
  };
}

export function parseSkillSelectionConfig(node: BonusNode): SkillSelectionConfig {
  return {
    max: node['max'] !== undefined ? Number(nodeText(node['max'])) : undefined,
    val: node['val'] !== undefined ? Number(nodeText(node['val'])) : undefined,
    applyToRating: nodeText(node['applytorating']).toLowerCase() === 'yes',
    skillGroup: nodeText(node['@_skillgroup'] || node['skillgroup']) || undefined,
    skillCategory: nodeText(node['@_skillcategory'] || node['skillcategory']) || undefined,
    excludeCategory: nodeText(node['@_excludecategory'] || node['excludecategory']) || undefined,
    limitToSkill: nodeText(node['@_limittoskill'] || node['limittoskill']) || undefined,
  };
}

export function listSelectableAttributes(
  config: AttributeSelectionConfig,
  magEnabled: boolean,
  resEnabled: boolean,
): string[] {
  let attributes = [...ATTRIBUTE_CODES].filter(
    (code) => code !== 'INI' && code !== 'ESS',
  );

  if (!magEnabled) {
    attributes = attributes.filter((code) => code !== 'MAG');
  }
  if (!resEnabled) {
    attributes = attributes.filter((code) => code !== 'RES');
  }

  if (config.allowedAttributes?.length) {
    attributes = attributes.filter((code) => config.allowedAttributes!.includes(code));
  }

  if (config.excludedAttributes?.length) {
    attributes = attributes.filter((code) => !config.excludedAttributes!.includes(code));
  }

  return attributes;
}

export function listSelectableSkillGroups(
  config: SkillSelectionConfig,
  skillGroupNames: string[],
): string[] {
  let groups = [...skillGroupNames];

  if (config.skillGroup) {
    groups = groups.filter((name) => name === config.skillGroup);
  }

  return groups.sort((a, b) => a.localeCompare(b));
}

export interface SelectableSkillEntry {
  name: string;
  skillGroup?: string;
  skillCategory?: string;
}

export function listSelectableSkills(
  config: SkillSelectionConfig,
  catalogSkills: SelectableSkillEntry[],
  characterSkills: SelectableSkillEntry[],
): string[] {
  const merged = new Map<string, SelectableSkillEntry>();
  for (const skill of [...catalogSkills, ...characterSkills]) {
    merged.set(skill.name, skill);
  }

  let skills = [...merged.values()];

  if (config.limitToSkill) {
    skills = skills.filter((skill) => skill.name === config.limitToSkill);
  }

  if (config.skillGroup) {
    skills = skills.filter((skill) => skill.skillGroup === config.skillGroup);
  }

  if (config.skillCategory) {
    skills = skills.filter((skill) => skill.skillCategory === config.skillCategory);
  }

  if (config.excludeCategory) {
    skills = skills.filter((skill) => skill.skillCategory !== config.excludeCategory);
  }

  const names = skills.map((skill) => skill.name);
  const characterNames = new Set(characterSkills.map((skill) => skill.name));
  const onCharacter = names.filter((name) => characterNames.has(name));
  const source = onCharacter.length ? onCharacter : names;

  return [...new Set(source)].sort((a, b) => a.localeCompare(b));
}

export function applySelectText(
  manager: ImprovementManager,
  source: ImprovementSource,
  sourceName: string,
  value: string,
  uniqueName = '',
): void {
  manager.addImprovement(
    createImprovement({
      improvedName: value,
      source,
      sourceName,
      type: ImprovementType.Text,
      uniqueName,
    }),
  );
}

export function applySelectAttribute(
  manager: ImprovementManager,
  source: ImprovementSource,
  sourceName: string,
  rating: number,
  configNode: BonusNode,
  selectedAttribute: string,
  uniqueName = '',
): void {
  const config = parseAttributeSelectionConfig(configNode);
  let improvedName = selectedAttribute.toUpperCase();

  if (config.affectBase) {
    improvedName += 'Base';
  }

  manager.addImprovement(
    createImprovement({
      improvedName,
      source,
      sourceName,
      type: ImprovementType.Attribute,
      uniqueName,
      rating: 1,
      minimum: config.min ?? 0,
      maximum: config.max ?? 0,
      augmented: config.augmented ?? 0,
      augmentedMaximum: config.augmentedMaximum ?? 0,
    }),
  );
}

export function applySelectSkill(
  manager: ImprovementManager,
  source: ImprovementSource,
  sourceName: string,
  rating: number,
  configNode: BonusNode,
  selectedSkill: string,
  uniqueName = '',
): void {
  const config = parseSkillSelectionConfig(configNode);

  if (config.val !== undefined) {
    manager.addImprovement(
      createImprovement({
        improvedName: selectedSkill,
        source,
        sourceName,
        type: ImprovementType.Skill,
        uniqueName,
        value: manager.valueToInt(String(config.val), rating),
        addToRating: config.applyToRating ?? false,
      }),
    );
  }

  if (config.max !== undefined) {
    manager.addImprovement(
      createImprovement({
        improvedName: selectedSkill,
        source,
        sourceName,
        type: ImprovementType.Skill,
        uniqueName,
        maximum: manager.valueToInt(String(config.max), rating),
        rating: 1,
        addToRating: config.applyToRating ?? false,
      }),
    );
  }
}

export function applySelectSkillGroup(
  manager: ImprovementManager,
  source: ImprovementSource,
  sourceName: string,
  rating: number,
  configNode: BonusNode,
  selectedGroup: string,
  uniqueName = '',
): void {
  const bonus = nodeText(configNode['bonus']);
  const exclude = nodeText(configNode['exclude']);
  const applyToRating = nodeText(configNode['applytorating']).toLowerCase() === 'yes';

  manager.addImprovement(
    createImprovement({
      improvedName: selectedGroup,
      source,
      sourceName,
      type: ImprovementType.SkillGroup,
      uniqueName,
      value: manager.valueToInt(bonus, rating),
      exclude,
      addToRating: applyToRating,
    }),
  );
}

export function applyInteractiveSelection(
  key: InteractiveBonusKey,
  manager: ImprovementManager,
  source: ImprovementSource,
  sourceName: string,
  rating: number,
  configNode: BonusNode,
  value: string,
  uniqueName = '',
): void {
  switch (key) {
    case 'selecttext':
      applySelectText(manager, source, sourceName, value, uniqueName);
      break;
    case 'selectattribute':
      applySelectAttribute(manager, source, sourceName, rating, configNode, value, uniqueName);
      break;
    case 'selectskill':
      applySelectSkill(manager, source, sourceName, rating, configNode, value, uniqueName);
      break;
    case 'selectskillgroup':
      applySelectSkillGroup(manager, source, sourceName, rating, configNode, value, uniqueName);
      break;
  }
}

export function findInteractiveBonusKeys(bonus: BonusNode): InteractiveBonusKey[] {
  return INTERACTIVE_BONUS_KEYS.filter((key) => nodeHasKey(bonus, key));
}
