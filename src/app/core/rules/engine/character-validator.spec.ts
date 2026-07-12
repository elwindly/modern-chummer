import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateCharacter } from './character-validator';
import { initializeMetatype } from './metatype-initializer';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS, loadCharacterOptions } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementManager } from './improvement-manager';
import { applyQualityBonus } from './improvement-handlers';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

function loadFixtureData() {
  const metatypes = JSON.parse(readFileSync(join(dataDir, 'metatypes.json'), 'utf8')) as {
    metatypes: Parameters<typeof initializeMetatype>[2]['metatypes'];
  };
  const qualities = JSON.parse(readFileSync(join(dataDir, 'qualities.json'), 'utf8')) as {
    qualities: Array<{ name: string; bp?: string; category?: string[]; bonus?: Record<string, unknown> }>;
  };
  const settings = JSON.parse(readFileSync(join(dataDir, 'settings/default.json'), 'utf8'));
  return {
    metatypes: metatypes.metatypes,
    qualities: qualities.qualities,
    catalog: buildQualityCatalog(qualities.qualities),
    options: loadCharacterOptions(settings),
  };
}

describe('character-validator', () => {
  it('passes a minimal valid Human at attribute minimums', () => {
    const { metatypes, qualities, catalog, options } = loadFixtureData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    initializeMetatype(character, manager, {
      metatypeName: 'Human',
      metatypes,
      qualities,
      options,
    });

    const result = validateCharacter({
      character,
      manager,
      options,
      qualityCatalog: catalog,
    });

    expect(result.valid).toBe(true);
  });

  it('fails when build points are overspent', () => {
    const { catalog, options } = loadFixtureData();
    const character = createEmptyCharacter({
      buildPoints: 50,
    });
    const manager = new ImprovementManager(character);

    const result = validateCharacter({
      character,
      manager,
      options: { ...options, buildPoints: 50 },
      qualityCatalog: catalog,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'bp-overspend')).toBe(true);
  });

  it('fails when magician has no tradition', () => {
    const { catalog, options, qualities } = loadFixtureData();
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const magician = qualities.find((q) => q.name === 'Magician');
    applyQualityBonus(character, manager, 'Magician', magician?.bonus);
    character.qualities.push('Magician');

    const result = validateCharacter({
      character,
      manager,
      options,
      qualityCatalog: catalog,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'missing-tradition')).toBe(true);
  });

  it('fails when nuyen purchases exceed budget', () => {
    const { catalog, options } = loadFixtureData();
    const character = createEmptyCharacter({
      nuyenBpSpent: 1,
      purchases: [{ name: 'Expensive Drone', availability: '8', cost: 10000 }],
    });
    const manager = new ImprovementManager(character);

    const result = validateCharacter({
      character,
      manager,
      options,
      qualityCatalog: catalog,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'nuyen-overspend')).toBe(true);
  });

  it('loads CharacterOptions from settings/default.json', () => {
    const settings = JSON.parse(
      readFileSync(join(dataDir, 'settings/default.json'), 'utf8'),
    );
    const options = loadCharacterOptions(settings);
    expect(options.buildPoints).toBe(400);
    expect(options.nuyenPerBp).toBe(5000);
    expect(options.bpAttribute).toBe(10);
  });
});
