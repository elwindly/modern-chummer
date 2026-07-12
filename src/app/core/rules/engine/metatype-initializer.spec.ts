import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { initializeMetatype } from './metatype-initializer';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { ImprovementManager } from './improvement-manager';
import { ImprovementType } from '../models/improvement';

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

describe('metatype-initializer', () => {
  it('initializes Human with minimum attributes and zero metatype BP', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Human',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(character.metatype).toBe('Human');
    expect(character.metatypeBp).toBe(0);
    expect(character.metatypeCategory).toBe('Metahuman');
    expect(character.attributes.BOD.base).toBe(1);
    expect(character.attributes.EDG.base).toBe(2);
  });

  it('initializes Ork with metatype BP and bundled quality', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Ork',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(character.metatypeBp).toBe(20);
    expect(character.attributes.BOD.base).toBe(4);
    expect(character.attributes.STR.base).toBe(3);
    expect(character.qualities).toContain('Low-Light Vision');
  });

  it('applies Troll natural armor bonus from metatypes.json', () => {
    const { metatypes, qualities } = loadGameData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Troll',
      metatypes,
      qualities,
      options: DEFAULT_CHARACTER_OPTIONS,
    });

    expect(character.metatypeBp).toBe(40);
    expect(manager.valueOf(ImprovementType.BallisticArmor)).toBe(1);
    expect(manager.valueOf(ImprovementType.ImpactArmor)).toBe(1);
  });
});
