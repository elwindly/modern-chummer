import { evaluateAvailability } from './formula-evaluator';
import { ImprovementType } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';

export interface AvailabilityItem {
  name: string;
  availability: string;
  includedInParent?: boolean;
}

export interface AvailabilityViolation {
  name: string;
  availability: number;
  maximum: number;
}

export function parseAvailabilityInt(availability: string): number {
  const trimmed = availability.trim();
  if (!trimmed || trimmed.startsWith('+')) {
    return 0;
  }

  const { value } = evaluateAvailability(trimmed);
  return value;
}

export function isOverAvailability(availability: string, maximum: number): boolean {
  if (availability.trim().startsWith('+')) {
    return false;
  }

  return parseAvailabilityInt(availability) > maximum;
}

export function validateAvailability(
  items: AvailabilityItem[],
  maximumAvailability: number,
): AvailabilityViolation[] {
  const violations: AvailabilityViolation[] = [];

  for (const item of items) {
    if (item.includedInParent) continue;
    if (item.availability.trim().startsWith('+')) continue;

    const value = parseAvailabilityInt(item.availability);
    if (value > maximumAvailability) {
      violations.push({
        name: item.name,
        availability: value,
        maximum: maximumAvailability,
      });
    }
  }

  return violations;
}

export function hasAvailabilityViolations(
  items: AvailabilityItem[],
  maximumAvailability: number,
  manager: ImprovementManager,
): boolean {
  const violations = validateAvailability(items, maximumAvailability);
  const allowedOver = manager.valueOf(ImprovementType.RestrictedItemCount);
  return violations.length > allowedOver;
}
