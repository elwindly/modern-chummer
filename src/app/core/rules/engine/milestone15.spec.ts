import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { ImprovementManager } from './improvement-manager';
import { calculateBp } from './bp-calculator';
import { buildQualityCatalog } from '../models/economy';
import { calculateNuyen } from './nuyen-calculator';

describe('milestone 15 — karma creation', () => {
  it('uses karma pool and karma spell rates when buildMethod is Karma', () => {
    const character = createEmptyCharacter({
      buildKarma: 750,
      flags: {
        ...createEmptyCharacter().flags,
        magicianEnabled: true,
        magEnabled: true,
      },
      magicTradition: 'Hermetic',
      spells: [
        { id: '1', name: 'Manabolt', category: 'Combat' },
        { id: '2', name: 'Heal', category: 'Health' },
      ],
    });
    const manager = new ImprovementManager(character);
    const options = {
      ...DEFAULT_CHARACTER_OPTIONS,
      buildMethod: 'Karma' as const,
      buildKarma: 750,
      karmaSpell: 5,
    };

    const bp = calculateBp(character, manager, options, buildQualityCatalog([]));
    expect(bp.spells).toBe(10);
    expect(bp.remaining).toBeLessThan(750);
  });

  it('converts nuyen spend with karmaNuyen under Karma method', () => {
    const character = createEmptyCharacter({ nuyenBpSpent: 10 });
    const manager = new ImprovementManager(character);
    const nuyen = calculateNuyen(character, manager, {
      ...DEFAULT_CHARACTER_OPTIONS,
      buildMethod: 'Karma',
      karmaNuyen: 2500,
    });
    expect(nuyen.fromBp).toBe(25000);
  });
});
