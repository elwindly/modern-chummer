import { BonusNode, Character } from '../models/character';
import { ImprovementSource } from '../models/improvement';
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

export function touchCharacter(character: Character): Character {
  return {
    ...character,
    qualities: [...character.qualities],
    contacts: [...character.contacts],
    purchases: [...character.purchases],
    improvements: [...character.improvements],
    flags: { ...character.flags },
    attributes: { ...character.attributes },
  };
}
