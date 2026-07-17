import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { ImprovementManager } from './improvement-manager';
import { createStreetItemFromCatalog } from './gear-calculator';
import { createWareFromCatalog } from './ware-calculator';
import { applyBonusHandlers } from './improvement-handlers';
import { ImprovementSource } from '../models/improvement';
import { wareSourceName } from './ware-calculator';
import { calculateEssence } from './essence-calculator';
import { validateCharacter } from './character-validator';
import { buildQualityCatalog } from '../models/economy';
import { exportChumDocument } from '../persistence/chum-exporter';
import { importChumDocument } from '../persistence/chum-importer';
import { createCharacterId } from '../persistence/character-serializer';
import { XMLParser } from 'fast-xml-parser';

const wiredReflexes = {
  name: 'Wired Reflexes',
  rating: '3',
  ess: 'FixedValues(2,3,5)',
  avail: 'FixedValues(8R,12R,20R)',
  cost: ['FixedValues(11000,32000,100000)'],
  bonus: {
    initiativepass: 'Rating',
    specificattribute: {
      name: { value: 'REA', precedence: '1' },
      val: 'Rating',
    },
  },
};

const grades = new Map([
  ['Standard', { name: 'Standard', ess: '1', cost: '1', avail: '0' }],
]);

function parseExported(xml: string): Record<string, unknown> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    isArray: (_name, jpath) =>
      /(skill|quality|cyberware|weapon|spell|power|attribute|improvement|skillgroup)$/.test(jpath),
  });
  return (parser.parse(xml) as { character: Record<string, unknown> }).character;
}

describe('creation parity — street samurai vertical slice', () => {
  it('builds Human street sam with Pistols 4, Wired Reflexes 1, Ares Predator IV and round-trips', () => {
    const character = createEmptyCharacter({
      name: 'Street Sam',
      metatype: 'Human',
      nuyenBpSpent: 50,
      skills: [
        {
          name: 'Pistols',
          rating: 4,
          skillGroup: 'Firearms',
          skillCategory: 'Combat',
          defaultSkill: true,
        },
      ],
      weapons: [
        createStreetItemFromCatalog(
          { name: 'Ares Predator IV', cost: ['350'], avail: ['4R'] },
          { kind: 'weapon' },
        ),
      ],
    });

    const manager = new ImprovementManager(character);
    const ware = createWareFromCatalog(wiredReflexes, grades, manager, {
      kind: 'cyberware',
      grade: 'Standard',
      rating: 1,
      id: createCharacterId(),
    });
    character.cyberware.push(ware);
    applyBonusHandlers(wiredReflexes.bonus, {
      character,
      manager,
      source: ImprovementSource.Cyberware,
      sourceName: wareSourceName(ware.id),
      rating: 1,
      uniqueName: '',
    });

    const essence = calculateEssence(character, manager);
    expect(essence.lost).toBe(2);
    expect(essence.current).toBe(4);

    const validation = validateCharacter({
      character,
      manager,
      options: DEFAULT_CHARACTER_OPTIONS,
      qualityCatalog: buildQualityCatalog([]),
    });
    expect(validation.issues.filter((i) => i.code === 'bp-overspend')).toHaveLength(0);

    const xml = exportChumDocument(character);
    expect(xml).toContain('Pistols');
    expect(xml).toContain('Wired Reflexes');
    expect(xml).toContain('Ares Predator IV');

    const reimported = importChumDocument(parseExported(xml)).character;
    expect(reimported.name).toBe('Street Sam');
    expect(reimported.skills.some((s) => s.name === 'Pistols' && s.rating === 4)).toBe(true);
    expect(reimported.cyberware.some((c) => c.name === 'Wired Reflexes' && c.rating === 1)).toBe(
      true,
    );
    expect(reimported.weapons.some((w) => w.name === 'Ares Predator IV')).toBe(true);
  });
});

describe('creation parity — magician vertical slice', () => {
  it('builds magician with tradition, spell, spirit and round-trips', () => {
    const character = createEmptyCharacter({
      name: 'Hermetic Mage',
      flags: {
        ...createEmptyCharacter().flags,
        magicianEnabled: true,
        magEnabled: true,
      },
      attributes: {
        ...createEmptyCharacter().attributes,
        MAG: { base: 4, min: 1, max: 6, augMax: 6 },
      },
      magicTradition: 'Hermetic',
      skills: [
        {
          name: 'Spellcasting',
          rating: 4,
          skillGroup: 'Sorcery',
          skillCategory: 'Magical',
          defaultSkill: true,
        },
      ],
      spells: [
        {
          id: createCharacterId(),
          name: 'Manabolt',
          category: 'Combat',
          limited: false,
          extended: false,
        },
      ],
      spirits: [
        {
          id: createCharacterId(),
          name: 'Spirit of Fire',
          force: 3,
          servicesOwed: 2,
          bound: true,
          sprite: false,
        },
      ],
      powers: [
        {
          id: createCharacterId(),
          name: 'Astral Perception',
          rating: 0,
          levels: false,
          pointsPerLevel: 1,
          totalPoints: 1,
        },
      ],
    });
    character.flags.adeptEnabled = true;

    const manager = new ImprovementManager(character);
    const validation = validateCharacter({
      character,
      manager,
      options: DEFAULT_CHARACTER_OPTIONS,
      qualityCatalog: buildQualityCatalog([]),
    });
    expect(validation.issues.some((i) => i.code === 'missing-tradition')).toBe(false);

    const xml = exportChumDocument(character);
    expect(xml).toContain('Hermetic');
    expect(xml).toContain('Manabolt');
    expect(xml).toContain('Spirit of Fire');

    const reimported = importChumDocument(parseExported(xml)).character;
    expect(reimported.magicTradition).toBe('Hermetic');
    expect(reimported.spells.some((s) => s.name === 'Manabolt')).toBe(true);
    expect(reimported.spirits.some((s) => s.name === 'Spirit of Fire' && s.servicesOwed === 2)).toBe(
      true,
    );
    expect(reimported.flags.magicianEnabled).toBe(true);
  });
});
