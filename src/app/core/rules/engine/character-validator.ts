import { Character } from '../models/character';
import { CharacterOptions } from '../models/character-options';
import { QualityCatalogEntry } from '../models/economy';
import { ImprovementType } from '../models/improvement';
import { getAttributeTotal } from './attribute-totals';
import { collectAllAvailabilityItems } from './ware-calculator';
import { calculateEssence, getEffectiveMagicAfterEssenceLoss } from './essence-calculator';
import { AvailabilityItem, validateAvailability } from './availability-validator';
import { calculateBp, isAttributeBpWithinLimit } from './bp-calculator';
import { ImprovementManager } from './improvement-manager';
import { calculateNuyen } from './nuyen-calculator';
import {
  calculatePowerPointRemaining,
  getSpellLimit,
} from './magic-calculator';

export interface ValidationIssue {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface CharacterValidationContext {
  character: Character;
  manager: ImprovementManager;
  options: CharacterOptions;
  qualityCatalog: Map<string, QualityCatalogEntry>;
  availabilityItems?: AvailabilityItem[];
}

export function validateCharacter(ctx: CharacterValidationContext): ValidationResult {
  if (ctx.character.ignoreRules) {
    return { valid: true, issues: [] };
  }

  const issues: ValidationIssue[] = [];
  const bp = calculateBp(
    ctx.character,
    ctx.manager,
    ctx.options,
    ctx.qualityCatalog,
  );

  if (bp.remaining < 0) {
    issues.push({
      code: 'bp-overspend',
      message: `Build points overspent by ${Math.abs(bp.remaining)}`,
    });
  }

  const nuyen = calculateNuyen(ctx.character, ctx.manager, ctx.options);
  if (nuyen.remaining < 0) {
    issues.push({
      code: 'nuyen-overspend',
      message: `Nuyen overspent by ${Math.abs(nuyen.remaining)}`,
    });
  }

  const essence = calculateEssence(ctx.character, ctx.manager);
  if (essence.current < essence.minimum && ctx.character.attributes.ESS.max > 0) {
    issues.push({
      code: 'essence-floor',
      message: 'Essence is below 0.01',
    });
  }

  if (ctx.character.flags.magEnabled) {
    const effectiveMag = getEffectiveMagicAfterEssenceLoss(ctx.character, ctx.manager, 'MAG');
    if (effectiveMag < 1) {
      issues.push({
        code: 'magic-essence-loss',
        message: 'Magic rating would be reduced below 1 by essence loss',
      });
    }
  }

  if (ctx.character.flags.resEnabled) {
    const effectiveRes = getEffectiveMagicAfterEssenceLoss(ctx.character, ctx.manager, 'RES');
    if (effectiveRes < 1) {
      issues.push({
        code: 'resonance-essence-loss',
        message: 'Resonance rating would be reduced below 1 by essence loss',
      });
    }
  }

  if (ctx.character.flags.magicianEnabled && !ctx.character.magicTradition) {
    issues.push({
      code: 'missing-tradition',
      message: 'Magician requires a tradition',
    });
  }

  if (ctx.character.flags.resEnabled && !ctx.character.technomancerStream) {
    issues.push({
      code: 'missing-stream',
      message: 'Technomancer requires a stream',
    });
  }

  if (ctx.character.flags.adeptEnabled) {
    const remainingPoints = calculatePowerPointRemaining(ctx.character, ctx.manager);
    if (remainingPoints < 0) {
      issues.push({
        code: 'power-points-overspend',
        message: `Adept power points overspent by ${Math.abs(remainingPoints)}`,
      });
    }
  }

  if (ctx.character.flags.magicianEnabled && ctx.character.spells.length > 0) {
    const limit = getSpellLimit(ctx.character, ctx.manager);
    if (ctx.character.spells.length > limit) {
      issues.push({
        code: 'spell-limit',
        message: `Spell count ${ctx.character.spells.length} exceeds limit ${limit}`,
      });
    }
  }

  if (!isAttributeBpWithinLimit(ctx.character, ctx.options)) {
    issues.push({
      code: 'attribute-bp-cap',
      message: 'Primary attribute BP exceeds half of build pool',
    });
  }

  if (ctx.availabilityItems?.length) {
    const violations = validateAvailability(
      ctx.availabilityItems,
      ctx.character.maximumAvailability,
    );
    const allowedOver = ctx.manager.valueOf(ImprovementType.RestrictedItemCount);

    if (violations.length > allowedOver) {
      for (const violation of violations) {
        issues.push({
          code: 'availability-exceeded',
          message: `${violation.name} availability ${violation.availability} exceeds ${violation.maximum}`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
