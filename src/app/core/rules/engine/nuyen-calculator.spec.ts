import { describe, expect, it } from 'vitest';
import { calculateNuyen, getMaxNuyenBp } from './nuyen-calculator';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { ImprovementSource, ImprovementType, createImprovement } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';

describe('nuyen-calculator', () => {
  it('converts nuyen BP to nuyen at 5000 per BP', () => {
    const character = createEmptyCharacter({ nuyenBpSpent: 10 });
    const manager = new ImprovementManager(character);

    const result = calculateNuyen(character, manager, DEFAULT_CHARACTER_OPTIONS);
    expect(result.fromBp).toBe(50000);
    expect(result.remaining).toBe(50000);
  });

  it('adds nuyen improvements and subtracts purchases', () => {
    const character = createEmptyCharacter({
      nuyenBpSpent: 5,
      purchases: [{ name: 'Commlink', availability: '2', cost: 1000 }],
    });
    const manager = new ImprovementManager(character);
    manager.addImprovement(
      createImprovement({
        source: ImprovementSource.Quality,
        sourceName: 'In Debt (5,000¥)',
        type: ImprovementType.Nuyen,
        value: 5000,
      }),
    );

    const result = calculateNuyen(character, manager, DEFAULT_CHARACTER_OPTIONS);
    expect(result.fromBp).toBe(25000);
    expect(result.fromImprovements).toBe(5000);
    expect(result.spent).toBe(1000);
    expect(result.remaining).toBe(29000);
  });

  it('calculates max nuyen BP as buildPoints/10', () => {
    const character = createEmptyCharacter({ buildPoints: 400 });
    const manager = new ImprovementManager(character);
    expect(getMaxNuyenBp(character, manager)).toBe(40);
  });
});
