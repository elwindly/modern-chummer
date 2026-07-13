import { AttributeCode, ATTRIBUTE_CODES, createDefaultAttributes } from '../models/attribute';
import { Character, CharacterFlags } from '../models/character';
import { createEmptyProfile } from '../models/character-profile';
import { CharacterContact } from '../models/economy';
import { CharacterSkill, CharacterSkillGroup } from '../models/skill';
import { Improvement, ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import { createCharacterId } from './character-serializer';

export interface ChumImportResult {
  character: Character;
  warnings: string[];
}

type ChumNode = unknown;

function text(value: ChumNode): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('#text' in record) return String(record['#text'] ?? '');
    if ('value' in record) return String(record['value'] ?? '');
  }
  return String(value);
}

function number(value: ChumNode, fallback = 0): number {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: ChumNode, fallback = false): boolean {
  if (value === null || value === undefined) return fallback;
  const raw = text(value).toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function mapImprovementSource(source: string): ImprovementSource {
  const normalized = source.trim();
  const match = (Object.values(ImprovementSource) as string[]).find(
    (entry) => entry.toLowerCase() === normalized.toLowerCase(),
  );
  return (match as ImprovementSource) ?? ImprovementSource.Custom;
}

function mapImprovementType(type: string): ImprovementType {
  const normalized = type.trim();
  const match = (Object.values(ImprovementType) as string[]).find(
    (entry) => entry.toLowerCase() === normalized.toLowerCase(),
  );
  return (match as ImprovementType) ?? ImprovementType.Attribute;
}

function parseAttributes(attributesNode: ChumNode, warnings: string[]): Character['attributes'] {
  const attributes = createDefaultAttributes();
  const attributeNodes = asArray(
    (attributesNode as Record<string, unknown> | undefined)?.['attribute'] as ChumNode,
  );

  for (const node of attributeNodes) {
    if (!node || typeof node !== 'object') continue;
    const record = node as Record<string, unknown>;
    const code = text(record['name']).toUpperCase() as AttributeCode;
    if (!ATTRIBUTE_CODES.includes(code)) {
      warnings.push(`Skipped unknown attribute: ${text(record['name'])}`);
      continue;
    }

    attributes[code] = {
      min: number(record['metatypemin'], attributes[code].min),
      max: number(record['metatypemax'], attributes[code].max),
      augMax: number(record['metatypeaugmax'], attributes[code].augMax),
      base: number(record['value'], attributes[code].base),
      value: number(record['totalvalue'], number(record['value'], attributes[code].value)),
    };
  }

  return attributes;
}

function parseImprovements(root: Record<string, unknown>): Improvement[] {
  const improvementsNode = root['improvements'] as Record<string, unknown> | undefined;
  const improvementNodes = asArray(improvementsNode?.['improvement'] as ChumNode);

  return improvementNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) =>
      createImprovement({
        improvedName: text(node['improvedname']),
        source: mapImprovementSource(text(node['improvementsource'])),
        sourceName: text(node['sourcename']),
        type: mapImprovementType(text(node['improvementttype'] || node['improvementtype'])),
        uniqueName: text(node['unique']),
        value: number(node['val']),
        rating: number(node['rating'], 1),
        minimum: number(node['min']),
        maximum: number(node['max']),
        augmented: number(node['aug']),
        augmentedMaximum: number(node['augmax']),
        exclude: text(node['exclude']),
        custom: bool(node['custom']),
      }),
    );
}

function parseQualities(root: Record<string, unknown>): {
  names: string[];
  origins: Record<string, import('../models/character-quality').QualityOrigin>;
  adjustments: Record<string, import('../models/character-quality').QualityAdjustment>;
} {
  const qualitiesNode = root['qualities'] as Record<string, unknown> | undefined;
  const qualityNodes = asArray(qualitiesNode?.['quality'] as ChumNode);

  const names: string[] = [];
  const origins: Record<string, import('../models/character-quality').QualityOrigin> = {};
  const adjustments: Record<string, import('../models/character-quality').QualityAdjustment> = {};

  for (const node of qualityNodes) {
    if (!node || typeof node !== 'object') continue;
    const record = node as Record<string, unknown>;
    const name = text(record['name']);
    if (!name) continue;

    names.push(name);

    const source = text(record['qualitysource']).toLowerCase();
    if (source === 'metatype') {
      origins[name] = 'metatype';
    } else if (source === 'metatyperemovable') {
      origins[name] = 'metatypeRemovable';
    } else {
      origins[name] = 'selected';
    }

    const bp = Number(text(record['bp']));
    const contributeToLimit = text(record['contributetolimit']).toLowerCase();
    if (
      origins[name] === 'selected' &&
      contributeToLimit === 'false' &&
      Number.isFinite(bp) &&
      bp !== 0
    ) {
      adjustments[name] = { bp, excludeFromLimit: true };
    }
  }

  return { names, origins, adjustments };
}

function parseContacts(root: Record<string, unknown>): CharacterContact[] {
  const contactsNode = root['contacts'] as Record<string, unknown> | undefined;
  const contactNodes = asArray(contactsNode?.['contact'] as ChumNode);

  return contactNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => {
      const type = text(node['type']).toLowerCase();
      return {
        name: text(node['name']) || 'Unnamed contact',
        connection: number(node['connection'], 1),
        loyalty: number(node['loyalty'], 1),
        group: number(node['membership']),
        free: bool(node['free']),
        enemy: type === 'enemy',
      };
    });
}

function parseSkills(root: Record<string, unknown>): {
  skills: CharacterSkill[];
  skillGroups: CharacterSkillGroup[];
  knowledgeSkills: CharacterSkill[];
} {
  const skillsNode = root['skills'] as Record<string, unknown> | undefined;
  const skillNodes = asArray(skillsNode?.['skill'] as ChumNode);
  const skills: CharacterSkill[] = [];
  const knowledgeSkills: CharacterSkill[] = [];

  for (const node of skillNodes) {
    if (!node || typeof node !== 'object') continue;
    const record = node as Record<string, unknown>;
    const skill: CharacterSkill = {
      name: text(record['name']),
      rating: number(record['rating']),
      ratingMax: number(record['ratingmax'], 6),
      skillGroup: text(record['skillgroup']) || undefined,
      skillCategory: text(record['skillcategory']) || undefined,
      attribute: text(record['attribute']) || undefined,
      defaultSkill: bool(record['default']),
      grouped: bool(record['grouped']),
      specialization: text(record['spec']) || undefined,
      knowledge: bool(record['knowledge']),
      exotic: bool(record['exotic']),
    };
    if (!skill.name) continue;
    if (skill.knowledge) {
      knowledgeSkills.push(skill);
    } else {
      skills.push(skill);
    }
  }

  const groupsNode = root['skillgroups'] as Record<string, unknown> | undefined;
  const groupNodes = asArray(groupsNode?.['skillgroup'] as ChumNode);
  const skillGroups: CharacterSkillGroup[] = groupNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => ({
      name: text(node['name']),
      rating: number(node['rating']),
      ratingMax: number(node['ratingmax'], 6),
      broken: bool(node['broken']),
    }))
    .filter((group) => group.name);

  return { skills, skillGroups, knowledgeSkills };
}

function parseProfile(root: Record<string, unknown>): Character['profile'] {
  return {
    sex: text(root['sex']) || undefined,
    age: text(root['age']) || undefined,
    height: text(root['height']) || undefined,
    weight: text(root['weight']) || undefined,
    description: text(root['description']) || undefined,
    notes: text(root['notes']) || undefined,
  };
}
function parseFlags(root: Record<string, unknown>): CharacterFlags {
  return {
    magicianEnabled: bool(root['magician']),
    adeptEnabled: bool(root['adept']),
    technomancerEnabled: bool(root['technomancer']),
    critterEnabled: bool(root['critter']),
    initiationEnabled: bool(root['initiationoverride']),
    magEnabled: bool(root['magenabled']),
    resEnabled: bool(root['resenabled']),
  };
}

export function importChumDocument(root: Record<string, unknown>): ChumImportResult {
  const warnings: string[] = [];

  const edition = text(root['gameedition']);
  if (edition && edition !== 'SR4') {
    warnings.push(`Game edition "${edition}" may not be fully compatible (expected SR4).`);
  }

  if (bool(root['created'])) {
    warnings.push('Character is marked as Created (career mode). Only creation data was imported.');
  }

  const unsupportedSections = [
    'armors',
    'weapons',
    'cyberwares',
    'biowares',
    'gears',
    'vehicles',
    'spells',
    'powers',
    'programs',
    'martialarts',
    'lifestyles',
  ];

  for (const section of unsupportedSections) {
    if (root[section]) {
      warnings.push(`Section "${section}" was not imported (not yet supported).`);
    }
  }

  const parsedQualities = parseQualities(root);
  const parsedSkills = parseSkills(root);

  const character: Character = {
    id: createCharacterId(),
    name: text(root['alias']) || text(root['name']),
    metatype: text(root['metatype']) || 'Human',
    metatypeCategory: text(root['metatypecategory']) || undefined,
    metavariant: text(root['metavariant']) || undefined,
    metatypeBp: number(root['metatypebp']),
    buildPoints: number(root['bp'], 400),
    maximumAvailability: number(root['maxavail'], 12),
    nuyenBpSpent: number(root['nuyenbp']),
    ignoreRules: bool(root['ignorerules']),
    magicTradition: text(root['tradition']) || undefined,
    technomancerStream: text(root['stream']) || undefined,
    qualities: parsedQualities.names,
    qualityOrigins: parsedQualities.origins,
    qualityAdjustments: parsedQualities.adjustments,
    skills: parsedSkills.skills,
    skillGroups: parsedSkills.skillGroups,
    knowledgeSkills: parsedSkills.knowledgeSkills,
    knowledgeSkillPoints: number(root['knowpts']) || undefined,
    profile: parseProfile(root),
    contacts: parseContacts(root),
    purchases: [],
    attributes: parseAttributes(root['attributes'], warnings),
    improvements: parseImprovements(root),
    flags: parseFlags(root),
  };

  return { character, warnings };
}

export function parseChumXml(xml: string): ChumImportResult {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(parseError.textContent ?? 'Invalid XML');
    }
    const root = doc.documentElement;
    if (root.tagName.toLowerCase() !== 'character') {
      throw new Error('Root element must be <character>');
    }
    return importChumDocument(domElementToObject(root) as Record<string, unknown>);
  }

  throw new Error('XML parsing is not available in this environment');
}

function domElementToObject(element: Element): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const attr of Array.from(element.attributes)) {
    result[`@_${attr.name}`] = attr.value;
  }

  const childElements = Array.from(element.children);
  if (childElements.length === 0) {
    const value = element.textContent?.trim() ?? '';
    return value ? { '#text': value } : {};
  }

  for (const child of childElements) {
    const key = child.tagName.toLowerCase();
    const value = domElementToObject(child);
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }

  return result;
}
