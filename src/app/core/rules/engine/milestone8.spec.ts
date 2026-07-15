import { describe, expect, it } from 'vitest';
import { validateCharacter } from './character-validator';
import { calculateNuyen } from './nuyen-calculator';
import {
  calculateStreetItemCost,
  calculateStreetItemAvailability,
  calculateTotalStreetCost,
  collectAvailabilityItems,
  createStreetItemFromCatalog,
} from './gear-calculator';
import { validateAvailability } from './availability-validator';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementManager } from './improvement-manager';
import { importChumDocument } from '../persistence/chum-importer';

describe('milestone 8 — street gear', () => {
  it('calculates rating-based gear cost and availability', () => {
    const entry = {
      name: 'Expendable Jammer, Area',
      cost: ['Rating * 50'],
      avail: ['(Rating * 3)F'],
      rating: '10',
    };

    expect(calculateStreetItemCost(entry, 4)).toBe(200);
    expect(calculateStreetItemAvailability(entry, 4)).toBe('12F');
  });

  it('detects availability violations for purchased gear', () => {
    const character = createEmptyCharacter({
      maximumAvailability: 12,
      weapons: [
        createStreetItemFromCatalog(
          { name: 'Restricted Pistol', cost: ['500'], avail: ['16F'] },
          { kind: 'weapon' },
        ),
      ],
    });

    const violations = validateAvailability(collectAvailabilityItems(character), 12);
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe('Restricted Pistol');
  });

  it('flags nuyen overspend during validation', () => {
    const character = createEmptyCharacter({
      nuyenBpSpent: 10,
      gear: [
        createStreetItemFromCatalog(
          { name: 'Expensive Kit', cost: ['60000'], avail: ['8'] },
          { kind: 'gear' },
        ),
      ],
    });
    const manager = new ImprovementManager(character);

    const nuyen = calculateNuyen(character, manager, DEFAULT_CHARACTER_OPTIONS);
    expect(nuyen.remaining).toBeLessThan(0);

    const validation = validateCharacter({
      character,
      manager,
      options: DEFAULT_CHARACTER_OPTIONS,
      qualityCatalog: buildQualityCatalog([]),
      availabilityItems: collectAvailabilityItems(character),
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === 'nuyen-overspend')).toBe(true);
  });

  it('sums nested purchase costs for nuyen breakdown', () => {
    const weapon = createStreetItemFromCatalog(
      { name: 'Colt America L36', cost: ['150'], avail: ['4R'] },
      { kind: 'weapon' },
    );
    weapon.children.push(
      createStreetItemFromCatalog(
        { name: 'Silencer', cost: ['500'], avail: ['6F'] },
        { kind: 'accessory', parentCost: weapon.cost },
      ),
    );

    const character = createEmptyCharacter({ weapons: [weapon] });
    expect(calculateTotalStreetCost(character)).toBe(650);
  });

  it('imports gear, weapons, and armor from legacy .chum XML sections', () => {
    const { character, warnings } = importChumDocument({
      gameedition: 'SR4',
      bp: '400',
      maxavail: '12',
      gears: {
        gear: {
          name: 'Commlink',
          rating: '3',
          avail: '4',
          cost: '500',
          children: {},
        },
      },
      weapons: {
        weapon: {
          name: 'Colt America L36',
          avail: '4R',
          cost: '150',
          accessories: {
            accessory: {
              name: 'Silencer',
              avail: '6F',
              cost: '500',
            },
          },
        },
      },
      armors: {
        armor: {
          name: 'Leather Jacket',
          avail: '0',
          cost: '200',
          armormods: {},
        },
      },
    });

    expect(character.gear).toHaveLength(1);
    expect(character.gear[0].name).toBe('Commlink');
    expect(character.weapons).toHaveLength(1);
    expect(character.weapons[0].children).toHaveLength(1);
    expect(character.armors).toHaveLength(1);
    expect(warnings.some((warning) => warning.includes('gears'))).toBe(false);
  });
});
