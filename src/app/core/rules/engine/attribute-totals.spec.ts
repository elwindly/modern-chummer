import { describe, expect, it } from 'vitest';
import {
  getAttributeAugmentedModifiers,
  getAttributeTotal,
  getEffectiveLimits,
  getTotalMaximum,
} from './attribute-totals';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';

describe('attribute totals', () => {
  it('returns base value when no improvements exist', () => {
    const character = createEmptyCharacter();
    expect(getAttributeTotal(character, 'BOD')).toBe(4);
    expect(getAttributeTotal(character, 'WIL')).toBe(4);
  });

  it('adds augmented attribute improvements to base', () => {
    const character = createEmptyCharacter();
    character.improvements.push(
      createImprovement({
        improvedName: 'BOD',
        source: ImprovementSource.Quality,
        sourceName: 'Test',
        type: ImprovementType.Attribute,
        augmented: 2,
      }),
    );

    expect(getAttributeAugmentedModifiers(character.improvements, 'BOD')).toBe(2);
    expect(getAttributeTotal(character, 'BOD')).toBe(6);
  });

  it('caps total at augmented maximum', () => {
    const character = createEmptyCharacter();
    character.improvements.push(
      createImprovement({
        improvedName: 'BOD',
        source: ImprovementSource.Quality,
        sourceName: 'Test',
        type: ImprovementType.Attribute,
        augmented: 10,
      }),
    );

    expect(getAttributeTotal(character, 'BOD')).toBe(9);
  });

  it('uses highest value per unique name for augmented modifiers', () => {
    const character = createEmptyCharacter();
    character.improvements.push(
      createImprovement({
        improvedName: 'STR',
        source: ImprovementSource.Quality,
        sourceName: 'Low',
        type: ImprovementType.Attribute,
        uniqueName: 'boost',
        augmented: 1,
      }),
      createImprovement({
        improvedName: 'STR',
        source: ImprovementSource.Quality,
        sourceName: 'High',
        type: ImprovementType.Attribute,
        uniqueName: 'boost',
        augmented: 3,
      }),
    );

    expect(getAttributeAugmentedModifiers(character.improvements, 'STR')).toBe(3);
    expect(getAttributeTotal(character, 'STR')).toBe(7);
  });

  it('applies maximum modifiers to effective limits', () => {
    const character = createEmptyCharacter();
    character.improvements.push(
      createImprovement({
        improvedName: 'INT',
        source: ImprovementSource.Quality,
        sourceName: 'Infected: Banshee',
        type: ImprovementType.Attribute,
        maximum: 1,
        minimum: 1,
      }),
    );

    expect(getTotalMaximum(character, 'INT')).toBe(7);
    expect(getEffectiveLimits(character, 'INT')).toEqual({
      min: 2,
      max: 7,
      augMax: 10,
    });
  });
});
