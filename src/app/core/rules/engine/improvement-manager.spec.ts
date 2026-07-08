import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import { ImprovementManager, valueOf } from '../engine/improvement-manager';

describe('valueOf', () => {
  it('sums improvements of the same type', () => {
    const improvements = [
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'A',
        type: ImprovementType.PhysicalCM,
        value: 1,
      }),
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'B',
        type: ImprovementType.PhysicalCM,
        value: 2,
      }),
    ];

    expect(valueOf(improvements, ImprovementType.PhysicalCM)).toBe(3);
  });

  it('uses highest value per unique name', () => {
    const improvements = [
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'A',
        type: ImprovementType.DamageResistance,
        uniqueName: 'toughness',
        value: 1,
      }),
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'B',
        type: ImprovementType.DamageResistance,
        uniqueName: 'toughness',
        value: 3,
      }),
    ];

    expect(valueOf(improvements, ImprovementType.DamageResistance)).toBe(3);
  });

  it('replaces total with precedence0 highest only', () => {
    const improvements = [
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'Low',
        type: ImprovementType.CMThresholdOffset,
        uniqueName: 'precedence0',
        value: 1,
      }),
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'High',
        type: ImprovementType.CMThresholdOffset,
        uniqueName: 'precedence0',
        value: 3,
      }),
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'Other',
        type: ImprovementType.CMThresholdOffset,
        uniqueName: 'other',
        value: 99,
      }),
    ];

    expect(valueOf(improvements, ImprovementType.CMThresholdOffset)).toBe(3);
  });
});

describe('ImprovementManager transactions', () => {
  it('rolls back transaction improvements', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    manager.beginTransaction();
    manager.addImprovement(
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'Temp',
        type: ImprovementType.PhysicalCM,
        value: 5,
      }),
    );
    expect(character.improvements).toHaveLength(1);

    manager.rollback();
    expect(character.improvements).toHaveLength(0);
  });
});
