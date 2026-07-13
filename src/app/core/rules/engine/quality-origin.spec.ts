import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateBp } from './bp-calculator';
import { initializeMetatype } from './metatype-initializer';
import { createEmptyCharacter } from '../models/character';
import { getQualityOrigin } from '../models/character-quality';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementManager } from './improvement-manager';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

function loadGameData() {
  const metatypes = JSON.parse(readFileSync(join(dataDir, 'metatypes.json'), 'utf8')) as {
    metatypes: Parameters<typeof initializeMetatype>[2]['metatypes'];
  };
  const qualities = JSON.parse(readFileSync(join(dataDir, 'qualities.json'), 'utf8')) as {
    qualities: Parameters<typeof initializeMetatype>[2]['qualities'];
  };
  return {
    metatypes: metatypes.metatypes,
    qualities: qualities.qualities,
    catalog: buildQualityCatalog(qualities.qualities),
  };
}

describe('metatype quality origins', () => {
  it('marks bundled metatype positives as non-removable metatype origin', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Ork',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(getQualityOrigin(character, 'Low-Light Vision')).toBe('metatype');
  });

  it('marks removable metavariant negatives as metatypeRemovable origin', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Centaur',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(getQualityOrigin(character, 'Uncouth')).toBe('metatypeRemovable');
    expect(getQualityOrigin(character, 'Distinctive Style')).toBe('metatype');
  });

  it('does not charge BP for bundled metatype qualities', () => {
    const { metatypes, qualities, catalog } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Ork',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.remaining).toBe(380);
    expect(bp.positiveQualities).toBe(0);
  });
});
