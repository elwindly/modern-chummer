import { describe, expect, it } from 'vitest';
import { canTakeQuality } from './requirement-validator';
import { createEmptyCharacter } from '../models/character';

describe('requirement validator', () => {
  it('blocks Adept when Magician is already taken', () => {
    const character = createEmptyCharacter({
      qualities: ['Magician'],
    });

    const result = canTakeQuality(
      {
        name: 'Adept',
        forbidden: {
          oneof: {
            quality: ['Magician', 'Mystic Adept', 'Technomancer'],
          },
        },
      },
      character,
    );

    expect(result.met).toBe(false);
  });

  it('allows Adept on a clean character', () => {
    const character = createEmptyCharacter();

    const result = canTakeQuality(
      {
        name: 'Adept',
        forbidden: {
          oneof: {
            quality: ['Magician', 'Mystic Adept', 'Technomancer'],
          },
        },
      },
      character,
    );

    expect(result.met).toBe(true);
  });

  it('requires Magician or Mystic Adept for Focused Concentration', () => {
    const withoutMagic = createEmptyCharacter();
    const withMagician = createEmptyCharacter({ qualities: ['Magician'] });

    const quality = {
      name: 'Focused Concentration (Rating 1)',
      required: {
        oneof: {
          quality: ['Magician', 'Mystic Adept'],
        },
      },
    };

    expect(canTakeQuality(quality, withoutMagic).met).toBe(false);
    expect(canTakeQuality(quality, withMagician).met).toBe(true);
  });

  it('requires Elf metatype for Infected: Banshee via allof', () => {
    const human = createEmptyCharacter({ metatype: 'Human' });
    const elf = createEmptyCharacter({ metatype: 'Elf' });

    const quality = {
      name: 'Infected: Banshee',
      required: {
        allof: {
          metatype: ['Elf'],
        },
      },
    };

    expect(canTakeQuality(quality, human).met).toBe(false);
    expect(canTakeQuality(quality, elf).met).toBe(true);
  });

  it('blocks duplicate qualities unless limit is no', () => {
    const character = createEmptyCharacter({ qualities: ['Ambidextrous'] });

    expect(
      canTakeQuality({ name: 'Ambidextrous' }, character).met,
    ).toBe(false);
    expect(
      canTakeQuality({ name: 'Ambidextrous', limit: 'no' }, character).met,
    ).toBe(true);
  });

  it('blocks In Debt when a higher tier is already taken', () => {
    const character = createEmptyCharacter({ qualities: ['In Debt (10,000¥)'] });

    const result = canTakeQuality(
      {
        name: 'In Debt (5,000¥)',
        forbidden: {
          oneof: {
            quality: [
              'In Debt (10,000¥)',
              'In Debt (15,000¥)',
              'In Debt (20,000¥)',
            ],
          },
        },
      },
      character,
    );

    expect(result.met).toBe(false);
  });
});
