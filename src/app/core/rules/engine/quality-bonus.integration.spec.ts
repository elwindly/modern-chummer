import { describe, expect, it } from 'vitest';
import { deriveStats } from '../engine/derived-stats';
import { ImprovementManager } from '../engine/improvement-manager';
import { applyQualityBonus } from '../engine/improvement-handlers';
import { ImprovementType } from '../models/improvement';
import { createEmptyCharacter } from '../models/character';

describe('quality bonus integration', () => {
  it('increases physical CM from Tough as Nails (Rating 1)', () => {
    const character = createEmptyCharacter();
    character.attributes.BOD.base = 4;
    const manager = new ImprovementManager(character);

    manager.beginTransaction();
    applyQualityBonus(character, manager, 'Tough as Nails (Rating 1)', {
      conditionmonitor: { physical: '1' },
    });
    manager.commit();

    const stats = deriveStats(character, manager);
    expect(stats.physicalCm).toBe(11);
    expect(manager.valueOf(ImprovementType.PhysicalCM)).toBe(1);
  });

  it('enables adept path from Adept quality', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, 'Adept', {
      addattribute: {
        name: 'MAG',
        min: '1',
        max: '6',
        aug: '6',
        val: '1',
      },
      enabletab: { name: 'adept' },
    });

    expect(character.flags.magEnabled).toBe(true);
    expect(character.flags.adeptEnabled).toBe(true);
    expect(
      character.improvements.some(
        (item) => item.type === ImprovementType.SpecialTab && item.improvedName === 'Adept',
      ),
    ).toBe(true);
  });

  it('applies damage resistance from Toughness quality', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, 'Toughness', {
      damageresistance: '1',
    });

    const stats = deriveStats(character, manager);
    expect(stats.damageResistance).toBe(1);
  });

  it('applies High Pain Tolerance threshold offset with precedence0', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, 'High Pain Tolerance (Rating 1)', {
      conditionmonitor: {
        thresholdoffset: { value: '1', precedence: '0' },
      },
    });

    const stats = deriveStats(character, manager);
    expect(stats.cmThresholdOffset).toBe(1);
  });
});
