import { describe, expect, it } from 'vitest';
import {
  hasAvailabilityViolations,
  isOverAvailability,
  parseAvailabilityInt,
  validateAvailability,
} from './availability-validator';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';

describe('availability-validator', () => {
  it('parses numeric and restricted availability', () => {
    expect(parseAvailabilityInt('8')).toBe(8);
    expect(parseAvailabilityInt('12R')).toBe(12);
    expect(parseAvailabilityInt('14F')).toBe(14);
    expect(parseAvailabilityInt('+2')).toBe(0);
  });

  it('ignores child availability prefixed with +', () => {
    expect(isOverAvailability('+2', 12)).toBe(false);
    expect(isOverAvailability('14R', 12)).toBe(true);
  });

  it('flags items above maximum availability', () => {
    const violations = validateAvailability(
      [
        { name: 'Legal Item', availability: '8' },
        { name: 'Illegal Item', availability: '16F' },
      ],
      12,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe('Illegal Item');
  });

  it('allows items over max when Restricted Gear quality grants allowance', () => {
    const character = createEmptyCharacter({ maximumAvailability: 12 });
    const manager = new ImprovementManager(character);
    manager.addImprovement(
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'Restricted Gear',
        type: ImprovementType.RestrictedItemCount,
        value: 1,
      }),
    );

    const items = [
      { name: 'Restricted Cyberware', availability: '16R' },
    ];

    expect(hasAvailabilityViolations(items, 12, manager)).toBe(false);
  });
});
