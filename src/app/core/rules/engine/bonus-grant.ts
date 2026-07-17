import { BonusNode, Character } from '../models/character';
import { ImprovementSource } from '../models/improvement';
import { CharacterWare } from '../models/ware';
import { SelectionRequest, SelectionResolution } from '../models/selection-request';
import { applyBonusHandlers } from './improvement-handlers';
import { ImprovementManager } from './improvement-manager';
import {
  applyInteractiveSelection,
  buildSelectionRequest,
  findInteractiveBonusKeys,
  InteractiveBonusKey,
} from './selection-handlers';

export type BonusGrantStatus = 'complete' | 'pending' | 'cancelled';

export interface BonusGrantResult {
  status: BonusGrantStatus;
  pending?: SelectionRequest;
}

export interface BonusGrantContext {
  source: ImprovementSource;
  sourceName: string;
  bonus: BonusNode;
  rating?: number;
  forcedSelections?: Record<string, string>;
  uniqueName?: string;
}

export interface BonusGrantSession {
  context: BonusGrantContext;
  pendingKeys: InteractiveBonusKey[];
  resolvedKeys: Set<InteractiveBonusKey>;
  resolutions: Map<InteractiveBonusKey, string>;
}

export function createBonusGrantSession(context: BonusGrantContext): BonusGrantSession {
  const pendingKeys = findInteractiveBonusKeys(context.bonus);
  const resolutions = new Map<InteractiveBonusKey, string>();

  if (context.forcedSelections) {
    for (const key of pendingKeys) {
      const forced = context.forcedSelections[key];
      if (forced) {
        resolutions.set(key, forced);
      }
    }
  }

  return {
    context,
    pendingKeys,
    resolvedKeys: new Set(resolutions.keys()),
    resolutions,
  };
}

export function getNextSelectionRequest(session: BonusGrantSession): SelectionRequest | null {
  for (const key of session.pendingKeys) {
    if (session.resolvedKeys.has(key)) continue;

    const forced = session.context.forcedSelections?.[key];
    if (forced) {
      continue;
    }

    return buildSelectionRequest(
      key,
      session.context.bonus,
      session.context.source,
      session.context.sourceName,
      session.context.rating ?? 1,
      forced,
    );
  }

  return null;
}

export function resolveGrantSelection(
  session: BonusGrantSession,
  resolution: SelectionResolution,
): BonusGrantSession {
  const key = session.pendingKeys.find((k) => `${session.context.sourceName}:${k}` === resolution.requestId);
  if (!key) {
    return session;
  }

  const resolutions = new Map(session.resolutions);
  resolutions.set(key, resolution.value);

  const resolvedKeys = new Set(session.resolvedKeys);
  resolvedKeys.add(key);

  return { ...session, resolutions, resolvedKeys };
}

function applyInteractiveSteps(
  manager: ImprovementManager,
  session: BonusGrantSession,
): void {
  const { context, pendingKeys, resolutions } = session;
  const rating = context.rating ?? 1;
  const uniqueName = context.uniqueName ?? '';

  for (const key of pendingKeys) {
    const value = resolutions.get(key);
    if (!value) continue;

    const configNode = context.bonus[key] as BonusNode;
    applyInteractiveSelection(
      key,
      manager,
      context.source,
      context.sourceName,
      rating,
      configNode,
      value,
      uniqueName,
    );
  }
}

export function executeBonusGrant(
  manager: ImprovementManager,
  session: BonusGrantSession,
): BonusGrantResult {
  const pending = getNextSelectionRequest(session);
  if (pending) {
    return { status: 'pending', pending };
  }

  manager.beginTransaction();

  try {
    applyInteractiveSteps(manager, session);

    applyBonusHandlers(session.context.bonus, {
      character: manager.getCharacter(),
      manager,
      source: session.context.source,
      sourceName: session.context.sourceName,
      rating: session.context.rating ?? 1,
      uniqueName: session.context.uniqueName ?? '',
    });

    manager.commit();
    return { status: 'complete' };
  } catch (error) {
    manager.rollback();
    throw error;
  }
}

export function grantBonus(
  manager: ImprovementManager,
  context: BonusGrantContext,
): { result: BonusGrantResult; session: BonusGrantSession } {
  const session = createBonusGrantSession(context);
  const result = executeBonusGrant(manager, session);
  return { result, session };
}

export function continueBonusGrant(
  manager: ImprovementManager,
  session: BonusGrantSession,
  resolution: SelectionResolution,
): { result: BonusGrantResult; session: BonusGrantSession } {
  const updated = resolveGrantSelection(session, resolution);
  const result = executeBonusGrant(manager, updated);
  return { result, session: updated };
}

export function cancelBonusGrant(manager: ImprovementManager): void {
  manager.rollback();
}

function cloneWareList(items: CharacterWare[]): CharacterWare[] {
  return items.map((item) => ({
    ...item,
    children: cloneWareList(item.children),
  }));
}

export function touchCharacter(character: Character): Character {
  return {
    ...character,
    qualities: [...character.qualities],
    qualityOrigins: character.qualityOrigins ? { ...character.qualityOrigins } : {},
    qualityAdjustments: character.qualityAdjustments
      ? { ...character.qualityAdjustments }
      : {},
    skills: (character.skills ?? []).map((skill) => ({ ...skill })),
    skillGroups: (character.skillGroups ?? []).map((group) => ({ ...group })),
    knowledgeSkills: (character.knowledgeSkills ?? []).map((skill) => ({ ...skill })),
    profile: { ...(character.profile ?? {}) },
    contacts: [...character.contacts],
    purchases: [...character.purchases],
    gear: (character.gear ?? []).map((item) => ({ ...item, children: [...item.children] })),
    weapons: (character.weapons ?? []).map((item) => ({ ...item, children: [...item.children] })),
    armors: (character.armors ?? []).map((item) => ({ ...item, children: [...item.children] })),
    cyberware: cloneWareList(character.cyberware ?? []),
    bioware: cloneWareList(character.bioware ?? []),
    spells: [...(character.spells ?? [])],
    powers: [...(character.powers ?? [])],
    programs: [...(character.programs ?? [])],
    metamagics: [...(character.metamagics ?? [])],
    initiationGrades: [...(character.initiationGrades ?? [])],
    critterPowers: [...(character.critterPowers ?? [])],
    vehicles: (character.vehicles ?? []).map((vehicle) => ({
      ...vehicle,
      mods: [...vehicle.mods],
    })),
    improvements: [...character.improvements],
    flags: { ...character.flags },
    attributes: Object.fromEntries(
      Object.entries(character.attributes).map(([code, state]) => [code, { ...state }]),
    ) as Character['attributes'],
  };
}
