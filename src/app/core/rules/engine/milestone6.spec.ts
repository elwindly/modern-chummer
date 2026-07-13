import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { initializeMetatype } from './metatype-initializer';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { ImprovementManager } from './improvement-manager';
import { getQualityOrigin } from '../models/character-quality';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

function loadGameData() {
  const metatypes = JSON.parse(readFileSync(join(dataDir, 'metatypes.json'), 'utf8')) as {
    metatypes: Parameters<typeof initializeMetatype>[2]['metatypes'];
  };
  const qualities = JSON.parse(readFileSync(join(dataDir, 'qualities.json'), 'utf8')) as {
    qualities: Parameters<typeof initializeMetatype>[2]['qualities'];
  };
  return { metatypes: metatypes.metatypes, qualities: qualities.qualities };
}

describe('metavariant initialization', () => {
  it('applies Ork metavariant BP and bundled qualities', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Ork',
      metavariantName: 'Hobgoblin',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(character.metavariant).toBe('Hobgoblin');
    expect(character.metatypeBp).toBe(20);
    expect(getQualityOrigin(character, 'Fangs')).toBe('metatype');
    expect(character.qualities).toContain('Poor Self Control (Vindictive)');
  });
});
