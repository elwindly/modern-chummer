import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateBp, isAttributeBpWithinLimit } from './bp-calculator';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementManager } from './improvement-manager';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

function loadQualityCatalog() {
  const raw = readFileSync(join(dataDir, 'qualities.json'), 'utf8');
  const data = JSON.parse(raw) as { qualities: Array<{ name: string; bp?: string; category?: string[] }> };
  return buildQualityCatalog(data.qualities);
}

describe('bp-calculator', () => {
  it('returns full pool for a blank Human', () => {
    const character = createEmptyCharacter({
      attributes: {
        ...createEmptyCharacter().attributes,
        BOD: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        AGI: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        REA: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        STR: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        CHA: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        INT: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        LOG: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        WIL: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        EDG: { min: 2, max: 7, augMax: 7, base: 2, value: 2 },
      },
    });
    const manager = new ImprovementManager(character);
    const catalog = loadQualityCatalog();

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.remaining).toBe(400);
  });

  it('subtracts metatype and quality costs', () => {
    const character = createEmptyCharacter({
      metatypeBp: 20,
      qualities: ['Adept'],
      attributes: {
        ...createEmptyCharacter().attributes,
        BOD: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        AGI: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        REA: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        STR: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        CHA: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        INT: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        LOG: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        WIL: { min: 1, max: 6, augMax: 9, base: 1, value: 1 },
        EDG: { min: 2, max: 7, augMax: 7, base: 2, value: 2 },
      },
    });
    const manager = new ImprovementManager(character);
    const catalog = loadQualityCatalog();

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.remaining).toBe(375);
    expect(bp.metatype).toBe(20);
    expect(bp.positiveQualities).toBe(5);
  });

  it('charges 10 BP per attribute raise and 15 at racial max', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);
    const catalog = loadQualityCatalog();

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.primaryAttributes).toBe(240);
    expect(bp.remaining).toBe(160);
  });

  it('enforces half-pool primary attribute cap', () => {
    const character = createEmptyCharacter();
    expect(isAttributeBpWithinLimit(character, DEFAULT_CHARACTER_OPTIONS)).toBe(false);
    expect(
      isAttributeBpWithinLimit(character, {
        ...DEFAULT_CHARACTER_OPTIONS,
        allowExceedAttributeBp: true,
      }),
    ).toBe(true);
  });
});
