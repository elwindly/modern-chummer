import { describe, expect, it } from 'vitest';
import {
  getAttributeAugmentedModifiers,
  getAttributeTotal,
  getEffectiveLimits,
  getTotalMaximum,
  repairEnabledSpecialAttributes,
} from './attribute-totals';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';

describe('attribute totals', () => {
  it('returns base value when no improvements exist', () => {
    const character = createEmptyCharacter();
    expect(getAttributeTotal(character, 'BOD')).toBe(1);
    expect(getAttributeTotal(character, 'WIL')).toBe(1);
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
    expect(getAttributeTotal(character, 'BOD')).toBe(3);
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
    expect(getAttributeTotal(character, 'STR')).toBe(4);
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

  it('repairs MAG enabled without metatype limits', () => {
    const character = createEmptyCharacter();
    character.flags.magEnabled = true;
    character.attributes.MAG = { min: 0, max: 0, augMax: 0, base: 0 };

    expect(repairEnabledSpecialAttributes(character)).toBe(true);
    expect(character.attributes.MAG).toEqual({ min: 1, max: 6, augMax: 6, base: 1 });
    expect(repairEnabledSpecialAttributes(character)).toBe(false);
  });
});
