import { AttributeCode } from '../models/attribute';
import { Character } from '../models/character';
import { QualityOrigin } from '../models/character-quality';
import { CharacterOptions } from '../models/character-options';
import { createAttributeState } from '../models/attribute';
import { ImprovementSource } from '../models/improvement';
import { evaluateFormula } from './formula-evaluator';
import {
  applyBonusHandlers,
  applyQualityBonus,
} from './improvement-handlers';
import { ImprovementManager } from './improvement-manager';

export interface MetatypeRecord {
  name: string;
  category?: string | string[];
  bp?: string;
  bonus?: Record<string, unknown>;
  qualities?: {
    positive?: { quality?: string | Array<string | MetatypeQualityRef> };
    negative?: { quality?: string | Array<string | MetatypeQualityRef> };
  };
  metavariants?: MetavariantRecord[];
  [key: string]: unknown;
}

export interface MetavariantRecord {
  name: string;
  bp?: string;
  bonus?: Record<string, unknown>;
  qualities?: MetatypeRecord['qualities'];
}

interface MetatypeQualityRef {
  value: string;
  select?: string;
  removable?: string;
}

interface BundledQualityEntry {
  name: string;
  origin: QualityOrigin;
}

export interface QualityRecord {
  name: string;
  bonus?: Record<string, unknown>;
}

export interface MetatypeInitOptions {
  metatypeName: string;
  metavariantName?: string;
  force?: number;
  metatypes: MetatypeRecord[];
  qualities?: QualityRecord[];
  options?: CharacterOptions;
}

const ATTRIBUTE_LIMIT_KEYS: Array<{ code: AttributeCode; min: string; max: string; aug: string }> = [
  { code: 'BOD', min: 'bodmin', max: 'bodmax', aug: 'bodaug' },
  { code: 'AGI', min: 'agimin', max: 'agimax', aug: 'agiaug' },
  { code: 'REA', min: 'reamin', max: 'reamax', aug: 'reaaug' },
  { code: 'STR', min: 'strmin', max: 'strmax', aug: 'straug' },
  { code: 'CHA', min: 'chamin', max: 'chamax', aug: 'chaaug' },
  { code: 'INT', min: 'intmin', max: 'intmax', aug: 'intaug' },
  { code: 'LOG', min: 'logmin', max: 'logmax', aug: 'logaug' },
  { code: 'WIL', min: 'wilmin', max: 'wilmax', aug: 'wilaug' },
  { code: 'INI', min: 'inimin', max: 'inimax', aug: 'iniaug' },
  { code: 'EDG', min: 'edgmin', max: 'edgmax', aug: 'edgaug' },
  { code: 'MAG', min: 'magmin', max: 'magmax', aug: 'magaug' },
  { code: 'RES', min: 'resmin', max: 'resmax', aug: 'resaug' },
  { code: 'ESS', min: 'essmin', max: 'essmax', aug: 'essaug' },
];

function resolveLimit(expression: string, force: number): number {
  return evaluateFormula(expression, { rating: force });
}

function extractBundledQualities(
  node: string | Array<string | MetatypeQualityRef> | undefined,
): BundledQualityEntry[] {
  if (!node) return [];
  const items = Array.isArray(node) ? node : [node];
  return items.map((item) => {
    if (typeof item === 'string') {
      return { name: item, origin: 'metatype' as const };
    }
    const removable = item.removable === 'true';
    return {
      name: item.value,
      origin: removable ? ('metatypeRemovable' as const) : ('metatype' as const),
    };
  });
}

function findMetatype(metatypes: MetatypeRecord[], name: string): MetatypeRecord | undefined {
  return metatypes.find((item) => item.name === name);
}

function findMetavariant(
  metatype: MetatypeRecord,
  name: string,
): MetavariantRecord | undefined {
  return metatype.metavariants?.find((item) => item.name === name);
}

export function listMetavariants(
  metatypes: MetatypeRecord[],
  metatypeName: string,
): MetavariantRecord[] {
  const metatype = findMetatype(metatypes, metatypeName);
  return metatype?.metavariants ?? [];
}

export function listMetahumanMetatypes(metatypes: MetatypeRecord[]): MetatypeRecord[] {
  return metatypes.filter((metatype) => {
    const category = Array.isArray(metatype.category)
      ? metatype.category[0]
      : metatype.category;
    return category === 'Metahuman';
  });
}

export function initializeMetatype(
  character: Character,
  manager: ImprovementManager,
  init: MetatypeInitOptions,
): void {
  const metatype = findMetatype(init.metatypes, init.metatypeName);
  if (!metatype) {
    throw new Error(`Metatype not found: ${init.metatypeName}`);
  }

  const force = init.force ?? 0;
  const metavariantName = init.metavariantName;
  const metavariant =
    metavariantName && metavariantName !== 'None'
      ? findMetavariant(metatype, metavariantName)
      : undefined;

  character.metatype = metatype.name;
  character.metatypeCategory = Array.isArray(metatype.category)
    ? metatype.category[0]
    : metatype.category;
  character.metavariant = metavariant?.name;
  character.metatypeBp = Number(metavariant?.bp ?? metatype.bp ?? 0);

  if (init.options) {
    character.buildPoints = init.options.buildPoints;
    character.maximumAvailability = init.options.maximumAvailability;
  }

  for (const { code, min, max, aug } of ATTRIBUTE_LIMIT_KEYS) {
    const minExpr = String(metatype[min] ?? '1');
    const maxExpr = String(metatype[max] ?? '6');
    const augExpr = String(metatype[aug] ?? '9');

    character.attributes[code] = createAttributeState(
      {
        min: resolveLimit(minExpr, force),
        max: resolveLimit(maxExpr, force),
        augMax: resolveLimit(augExpr, force),
      },
      resolveLimit(minExpr, force),
    );
  }

  character.improvements = [];
  character.qualities = [];
  character.qualityOrigins = {};
  character.qualityAdjustments = {};
  character.skills = [];
  character.skillGroups = [];
  character.knowledgeSkills = [];
  character.flags = {
    magicianEnabled: false,
    adeptEnabled: false,
    technomancerEnabled: false,
    critterEnabled: false,
    initiationEnabled: false,
    magEnabled: false,
    resEnabled: false,
  };

  const qualityLookup = new Map((init.qualities ?? []).map((q) => [q.name, q]));

  if (metavariant) {
    applyBonusHandlers(metavariant.bonus, {
      character,
      manager,
      source: ImprovementSource.Metavariant,
      sourceName: metavariant.name,
      rating: 1,
      uniqueName: '',
    });
    grantBundledQualities(character, manager, metavariant.qualities, qualityLookup);
  } else {
    applyBonusHandlers(metatype.bonus, {
      character,
      manager,
      source: ImprovementSource.Metatype,
      sourceName: metatype.name,
      rating: 1,
      uniqueName: '',
    });
    grantBundledQualities(character, manager, metatype.qualities, qualityLookup);
  }
}

function grantBundledQualities(
  character: Character,
  manager: ImprovementManager,
  qualities: MetatypeRecord['qualities'] | undefined,
  catalog: Map<string, QualityRecord>,
): void {
  if (!qualities) return;

  const positive = extractBundledQualities(qualities.positive?.quality);
  const negative = extractBundledQualities(qualities.negative?.quality);

  for (const { name, origin } of [...positive, ...negative]) {
    if (!character.qualities.includes(name)) {
      character.qualities.push(name);
    }
    character.qualityOrigins ??= {};
    character.qualityOrigins[name] = origin;

    const record = catalog.get(name);
    if (record?.bonus) {
      applyQualityBonus(character, manager, name, record.bonus);
    }
  }
}
