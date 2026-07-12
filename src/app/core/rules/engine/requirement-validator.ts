import { BonusNode, Character } from '../models/character';

export interface RequirementContext {
  character: Character;
  ignoreQuality?: string;
  ignoreRules?: boolean;
}

export interface RequirementResult {
  met: boolean;
  reason?: string;
}

type RequirementNode = Record<string, unknown>;

function asRequirementBlocks(node: unknown): RequirementNode[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node as RequirementNode[];
  return [node as RequirementNode];
}

function asStringList(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node.map((item) => String(item));
  return [String(node)];
}

function matchesRequirementChild(
  childName: string,
  childValue: unknown,
  ctx: RequirementContext,
): boolean {
  const { character, ignoreQuality = '' } = ctx;

  switch (childName) {
    case 'quality': {
      const names = asStringList(childValue);
      return names.some(
        (name) => character.qualities.includes(name) && name !== ignoreQuality,
      );
    }
    case 'metatype':
      return asStringList(childValue).includes(character.metatype);
    case 'metavariant':
      return character.metavariant
        ? asStringList(childValue).includes(character.metavariant)
        : false;
    case 'metatypecategory':
      return character.metatypeCategory
        ? asStringList(childValue).includes(character.metatypeCategory)
        : false;
    default:
      return false;
  }
}

function evaluateOneOfBlock(block: RequirementNode, ctx: RequirementContext): boolean {
  for (const [childName, childValue] of Object.entries(block)) {
    if (matchesRequirementChild(childName, childValue, ctx)) {
      return true;
    }
  }
  return false;
}

function evaluateAllOfBlock(block: RequirementNode, ctx: RequirementContext): boolean {
  for (const [childName, childValue] of Object.entries(block)) {
    const values = asStringList(childValue);
    for (const value of values) {
      if (!matchesRequirementChild(childName, value, ctx)) {
        return false;
      }
    }
  }
  return true;
}

function evaluateForbidden(requirements: RequirementNode, ctx: RequirementContext): RequirementResult {
  const oneOfBlocks = asRequirementBlocks(requirements['oneof']);

  for (const block of oneOfBlocks) {
    if (evaluateOneOfBlock(block, ctx)) {
      return { met: false, reason: 'Forbidden requirement matched' };
    }
  }

  return { met: true };
}

function evaluateRequired(requirements: RequirementNode, ctx: RequirementContext): RequirementResult {
  const oneOfBlocks = asRequirementBlocks(requirements['oneof']);
  const allOfBlocks = asRequirementBlocks(requirements['allof']);

  for (const block of oneOfBlocks) {
    if (!evaluateOneOfBlock(block, ctx)) {
      return { met: false, reason: 'Required oneof not satisfied' };
    }
  }

  for (const block of allOfBlocks) {
    if (!evaluateAllOfBlock(block, ctx)) {
      return { met: false, reason: 'Required allof not satisfied' };
    }
  }

  return { met: true };
}

export function requirementsMet(
  item: { forbidden?: RequirementNode; required?: RequirementNode; limit?: string; name?: string },
  ctx: RequirementContext,
): RequirementResult {
  if (ctx.ignoreRules) {
    return { met: true };
  }

  const allowMultiple = item.limit === 'no';
  if (!allowMultiple && item.name && ctx.character.qualities.includes(item.name)) {
    return { met: false, reason: 'Quality already taken' };
  }

  if (item.forbidden) {
    const forbidden = evaluateForbidden(item.forbidden, ctx);
    if (!forbidden.met) {
      return forbidden;
    }
  }

  if (item.required) {
    const required = evaluateRequired(item.required, ctx);
    if (!required.met) {
      return required;
    }
  }

  return { met: true };
}

export function canTakeQuality(
  quality: BonusNode & { name: string; forbidden?: RequirementNode; required?: RequirementNode; limit?: string },
  character: Character,
  options: Omit<RequirementContext, 'character'> = {},
): RequirementResult {
  return requirementsMet(quality, { character, ...options });
}
