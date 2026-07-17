import { AttributeCode, ATTRIBUTE_CODES, createDefaultAttributes } from '../models/attribute';
import { Character, CharacterFlags } from '../models/character';
import { createEmptyProfile } from '../models/character-profile';
import { CharacterContact } from '../models/economy';
import { CharacterSkill, CharacterSkillGroup, CharacterMartialArt, CharacterMartialArtManeuver } from '../models/skill';
import { CharacterStreetItem, StreetItemKind } from '../models/street-gear';
import { CharacterWare, WareKind } from '../models/ware';
import {
  CharacterCritterPower,
  CharacterInitiationGrade,
  CharacterMetamagic,
  CharacterPower,
  CharacterProgram,
  CharacterSpell,
} from '../models/magic';
import { CharacterVehicle, CharacterVehicleMod } from '../models/vehicle';
import { Improvement, ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import { createCharacterId } from './character-serializer';
import { syncLegacyPurchases } from '../engine/gear-calculator';
import { createSpell, refreshPowerPoints } from '../engine/magic-calculator';

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

function parseMartialArts(root: Record<string, unknown>): {
  martialArts: CharacterMartialArt[];
  martialArtManeuvers: CharacterMartialArtManeuver[];
} {
  const artsNode = root['martialarts'] as Record<string, unknown> | undefined;
  const artNodes = asArray(artsNode?.['martialart'] as ChumNode);
  const martialArts: CharacterMartialArt[] = artNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => ({
      name: text(node['name']),
      rating: number(node['rating'], 1),
      source: text(node['source']) || undefined,
      page: text(node['page']) || undefined,
    }))
    .filter((art) => art.name);

  const maneuversNode = root['martialartmaneuvers'] as Record<string, unknown> | undefined;
  const maneuverNodes = asArray(maneuversNode?.['martialartmaneuver'] as ChumNode);
  const martialArtManeuvers: CharacterMartialArtManeuver[] = maneuverNodes
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => ({
      id: text(node['guid']) || `maneuver-${text(node['name'])}-${maneuverNodes.indexOf(node)}`,
      name: text(node['name']),
      source: text(node['source']) || undefined,
      page: text(node['page']) || undefined,
    }))
    .filter((maneuver) => maneuver.name);

  return { martialArts, martialArtManeuvers };
}

function parseStreetItemNode(
  node: Record<string, unknown>,
  kind: StreetItemKind,
  warnings: string[],
): CharacterStreetItem {
  const included =
    bool(node['includedinparent']) ||
    bool(node['includedinweapon']) ||
    bool(node['included']);

  const item: CharacterStreetItem = {
    id: text(node['guid']) || createCharacterId(),
    kind,
    name: text(node['name']),
    rating: number(node['rating']),
    availability: text(node['avail']) || '0',
    cost: number(node['cost']),
    includedInParent: included,
    children: [],
  };

  if (kind === 'gear') {
    const childrenNode = node['children'] as Record<string, unknown> | undefined;
    const childNodes = asArray(childrenNode?.['gear'] as ChumNode);
    for (const child of childNodes) {
      if (!child || typeof child !== 'object') continue;
      item.children.push(parseStreetItemNode(child as Record<string, unknown>, 'nested-gear', warnings));
    }
    if (childNodes.some((child) => child && typeof child === 'object')) {
      const nestedGear = (childNodes[0] as Record<string, unknown> | undefined)?.['children'];
      if (nestedGear) {
        warnings.push(`Nested gear under "${item.name}" may not be fully imported.`);
      }
    }
  }

  if (kind === 'weapon') {
    const accessoriesNode = node['accessories'] as Record<string, unknown> | undefined;
    const accessoryNodes = asArray(accessoriesNode?.['accessory'] as ChumNode);
    for (const child of accessoryNodes) {
      if (!child || typeof child !== 'object') continue;
      item.children.push(
        parseStreetItemNode(child as Record<string, unknown>, 'accessory', warnings),
      );
    }

    const modsNode = node['weaponmods'] as Record<string, unknown> | undefined;
    const modNodes = asArray(modsNode?.['weaponmod'] as ChumNode);
    for (const child of modNodes) {
      if (!child || typeof child !== 'object') continue;
      item.children.push(
        parseStreetItemNode(child as Record<string, unknown>, 'weapon-mod', warnings),
      );
    }

    if (node['underbarrel']) {
      warnings.push(`Underbarrel weapons on "${item.name}" were not imported.`);
    }
  }

  if (kind === 'armor') {
    const modsNode = node['armormods'] as Record<string, unknown> | undefined;
    const modNodes = asArray(modsNode?.['armormod'] as ChumNode);
    for (const child of modNodes) {
      if (!child || typeof child !== 'object') continue;
      item.children.push(
        parseStreetItemNode(child as Record<string, unknown>, 'armor-mod', warnings),
      );
    }

    if (node['gears']) {
      warnings.push(`Gear installed on armor "${item.name}" was not imported.`);
    }
  }

  return item;
}

function parseStreetGear(root: Record<string, unknown>, warnings: string[]): {
  gear: CharacterStreetItem[];
  weapons: CharacterStreetItem[];
  armors: CharacterStreetItem[];
} {
  const gearNode = root['gears'] as Record<string, unknown> | undefined;
  const gearItems = asArray(gearNode?.['gear'] as ChumNode)
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => parseStreetItemNode(node, 'gear', warnings))
    .filter((item) => item.name);

  const weaponsNode = root['weapons'] as Record<string, unknown> | undefined;
  const weaponItems = asArray(weaponsNode?.['weapon'] as ChumNode)
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => parseStreetItemNode(node, 'weapon', warnings))
    .filter((item) => item.name);

  const armorsNode = root['armors'] as Record<string, unknown> | undefined;
  const armorItems = asArray(armorsNode?.['armor'] as ChumNode)
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => parseStreetItemNode(node, 'armor', warnings))
    .filter((item) => item.name);

  return { gear: gearItems, weapons: weaponItems, armors: armorItems };
}

function parseWareNode(
  node: Record<string, unknown>,
  kind: WareKind,
  warnings: string[],
): CharacterWare {
  const item: CharacterWare = {
    id: text(node['guid']) || createCharacterId(),
    kind,
    name: text(node['name']),
    grade: text(node['grade']) || 'Standard',
    rating: number(node['rating'], 1),
    availability: text(node['avail']) || '0',
    cost: number(node['cost']),
    essence: number(node['ess']),
    capacity: text(node['capacity']) || '0',
    capacityUsed: 0,
    children: [],
  };

  const childrenNode = node['children'] as Record<string, unknown> | undefined;
  const childNodes = asArray(childrenNode?.['cyberware'] as ChumNode);
  for (const child of childNodes) {
    if (!child || typeof child !== 'object') continue;
    item.children.push(parseWareNode(child as Record<string, unknown>, kind, warnings));
  }

  if (node['gears']) {
    warnings.push(`Gear installed on ${kind} "${item.name}" was not imported.`);
  }

  return item;
}

function parseWareSections(root: Record<string, unknown>, warnings: string[]): {
  cyberware: CharacterWare[];
  bioware: CharacterWare[];
} {
  const cyberwareNode = root['cyberwares'] as Record<string, unknown> | undefined;
  const cyberware = asArray(cyberwareNode?.['cyberware'] as ChumNode)
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => parseWareNode(node, 'cyberware', warnings))
    .filter((item) => item.name);

  const biowareNode = root['biowares'] as Record<string, unknown> | undefined;
  const bioware = asArray(biowareNode?.['bioware'] as ChumNode)
    .filter((node): node is Record<string, unknown> => !!node && typeof node === 'object')
    .map((node) => parseWareNode(node, 'bioware', warnings))
    .filter((item) => item.name);

  return { cyberware, bioware };
}

function parseSpells(root: Record<string, unknown>): CharacterSpell[] {
  const node = root['spells'] as Record<string, unknown> | undefined;
  return asArray(node?.['spell'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) =>
      createSpell(text(entry['name']), text(entry['category']), {
        id: text(entry['guid']) || undefined,
        limited: bool(entry['limited']),
        extended: bool(entry['extended']),
        extra: text(entry['extra']) || undefined,
      }),
    )
    .filter((spell) => spell.name);
}

function parsePowers(root: Record<string, unknown>): CharacterPower[] {
  const node = root['powers'] as Record<string, unknown> | undefined;
  return asArray(node?.['power'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => {
      const rating = number(entry['rating']);
      const pointsPerLevel = number(entry['pointsperlevel']);
      const levels = rating > 0;
      return refreshPowerPoints({
        id: text(entry['guid']) || createCharacterId(),
        name: text(entry['name']),
        rating,
        levels,
        pointsPerLevel,
        totalPoints: number(entry['totalpoints'], levels ? pointsPerLevel * rating : pointsPerLevel),
        extra: text(entry['extra']) || undefined,
      });
    })
    .filter((power) => power.name);
}

function parsePrograms(root: Record<string, unknown>): CharacterProgram[] {
  const node = (root['techprograms'] ?? root['programs']) as Record<string, unknown> | undefined;
  return asArray(node?.['techprogram'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      name: text(entry['name']),
      category: text(entry['category']),
      rating: number(entry['rating'], 1),
      maxRating: number(entry['maxrating'], 6),
      capacity: text(entry['capacity']),
      extra: text(entry['extra']) || undefined,
    }))
    .filter((program) => program.name);
}

function parseMetamagics(root: Record<string, unknown>): CharacterMetamagic[] {
  const node = root['metamagics'] as Record<string, unknown> | undefined;
  return asArray(node?.['metamagic'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      name: text(entry['name']),
      paidWithKarma: bool(entry['paidwithkarma']),
      source: text(entry['source']) || undefined,
      page: text(entry['page']) || undefined,
    }))
    .filter((item) => item.name);
}

function parseInitiationGrades(root: Record<string, unknown>): CharacterInitiationGrade[] {
  const node = root['initiationgrades'] as Record<string, unknown> | undefined;
  return asArray(node?.['initiationgrade'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      grade: number(entry['grade']),
      group: bool(entry['group']),
      ordeal: bool(entry['ordeal']),
      technomancer: bool(entry['res']),
      notes: text(entry['notes']) || undefined,
    }));
}

function parseCritterPowers(root: Record<string, unknown>): CharacterCritterPower[] {
  const node = root['critterpowers'] as Record<string, unknown> | undefined;
  return asArray(node?.['critterpower'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      name: text(entry['name']),
      rating: number(entry['rating']),
      points: number(entry['points']),
    }))
    .filter((power) => power.name);
}

function parseVehicleMods(node: Record<string, unknown> | undefined): CharacterVehicleMod[] {
  return asArray(node?.['mod'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      name: text(entry['name']),
      rating: number(entry['rating']),
      availability: text(entry['avail']) || '0',
      cost: number(entry['cost']),
    }))
    .filter((mod) => mod.name);
}

function parseVehicles(root: Record<string, unknown>): CharacterVehicle[] {
  const node = root['vehicles'] as Record<string, unknown> | undefined;
  return asArray(node?.['vehicle'] as ChumNode)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: text(entry['guid']) || createCharacterId(),
      name: text(entry['name']),
      category: text(entry['category']),
      handling: number(entry['handling']),
      accel: text(entry['accel']) || '0',
      speed: number(entry['speed']),
      pilot: number(entry['pilot']),
      body: number(entry['body']),
      armor: number(entry['armor']),
      sensor: number(entry['sensor']),
      deviceRating: number(entry['devicerating']),
      availability: text(entry['avail']) || '0',
      cost: number(entry['cost']),
      vehicleName: text(entry['vehiclename']) || undefined,
      mods: parseVehicleMods(entry['mods'] as Record<string, unknown> | undefined),
    }))
    .filter((vehicle) => vehicle.name);
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

  const unsupportedSections = ['lifestyles', 'foci', 'stackedfoci', 'spirits'];

  for (const section of unsupportedSections) {
    if (root[section]) {
      warnings.push(`Section "${section}" was not imported (not yet supported).`);
    }
  }

  const parsedQualities = parseQualities(root);
  const parsedSkills = parseSkills(root);
  const parsedMartialArts = parseMartialArts(root);
  const parsedStreetGear = parseStreetGear(root, warnings);
  const parsedWare = parseWareSections(root, warnings);
  const spells = parseSpells(root);
  const powers = parsePowers(root);
  const programs = parsePrograms(root);
  const metamagics = parseMetamagics(root);
  const initiationGrades = parseInitiationGrades(root);
  const critterPowers = parseCritterPowers(root);
  const vehicles = parseVehicles(root);

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
    created: bool(root['created']),
    magicTradition: text(root['tradition']) || undefined,
    technomancerStream: text(root['stream']) || undefined,
    qualities: parsedQualities.names,
    qualityOrigins: parsedQualities.origins,
    qualityAdjustments: parsedQualities.adjustments,
    skills: parsedSkills.skills,
    skillGroups: parsedSkills.skillGroups,
    knowledgeSkills: parsedSkills.knowledgeSkills,
    martialArts: parsedMartialArts.martialArts,
    martialArtManeuvers: parsedMartialArts.martialArtManeuvers,
    gear: parsedStreetGear.gear,
    weapons: parsedStreetGear.weapons,
    armors: parsedStreetGear.armors,
    cyberware: parsedWare.cyberware,
    bioware: parsedWare.bioware,
    spells,
    powers,
    programs,
    metamagics,
    initiationGrades,
    critterPowers,
    vehicles,
    knowledgeSkillPoints: number(root['knowpts']) || undefined,
    profile: parseProfile(root),
    contacts: parseContacts(root),
    purchases: [],
    attributes: parseAttributes(root['attributes'], warnings),
    improvements: parseImprovements(root),
    flags: parseFlags(root),
  };

  syncLegacyPurchases(character);

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
