import { describe, expect, it } from 'vitest';
import { validateCharacter } from './character-validator';
import { calculateEssence } from './essence-calculator';
import {
  calculateWareEssenceCost,
  createWareFromCatalog,
  getAllowedGrades,
  getGradeRecord,
  wareSourceName,
} from './ware-calculator';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementManager } from './improvement-manager';
import { getAttributeTotal } from './attribute-totals';
import { applyBonusHandlers } from './improvement-handlers';
import { ImprovementSource } from '../models/improvement';
import { createCharacterId } from '../persistence/character-serializer';
import { importChumDocument } from '../persistence/chum-importer';

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

const attentionCoprocessor = {
  name: 'Attention Coprocessor',
  rating: '3',
  ess: '0.3',
  avail: '8',
  cost: ['Rating * 3000'],
  bonus: {
    specificskill: {
      name: 'Perception',
      bonus: 'Rating',
    },
  },
};

const standardGrade = { name: 'Standard', ess: '1', cost: '1', avail: '0' };
const alphawareGrade = { name: 'Alphaware', ess: '0.8', cost: '2', avail: '0' };
const grades = new Map([
  [standardGrade.name, standardGrade],
  [alphawareGrade.name, alphawareGrade],
]);

describe('milestone 9 — cyberware & bioware', () => {
  it('applies grade multipliers to cyberware essence cost', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const standardEss = calculateWareEssenceCost(
      wiredReflexes,
      getGradeRecord(grades, 'Standard'),
      1,
      'cyberware',
      manager,
    );
    const alphaEss = calculateWareEssenceCost(
      wiredReflexes,
      getGradeRecord(grades, 'Alphaware'),
      1,
      'cyberware',
      manager,
    );

    expect(standardEss).toBe(2);
    expect(alphaEss).toBe(1.6);
  });

  it('calculates mixed cyberware/bioware essence using the higher stack at full cost', () => {
    const character = createEmptyCharacter({
      cyberware: [
        {
          id: 'c1',
          kind: 'cyberware',
          name: 'Wired Reflexes',
          grade: 'Standard',
          rating: 1,
          availability: '8R',
          cost: 11000,
          essence: 2,
          capacity: '0',
          capacityUsed: 0,
          children: [],
        },
      ],
      bioware: [
        {
          id: 'b1',
          kind: 'bioware',
          name: 'Bone Density Augmentation',
          grade: 'Standard',
          rating: 1,
          availability: '4',
          cost: 4000,
          essence: 1,
          capacity: '0',
          capacityUsed: 0,
          children: [],
        },
      ],
    });
    const manager = new ImprovementManager(character);

    const essence = calculateEssence(character, manager);
    expect(essence.lost).toBe(2.5);
    expect(essence.current).toBe(3.5);
  });

  it('applies ware bonuses through the improvement system', () => {
    const character = createEmptyCharacter({
      skills: [{ name: 'Perception', rating: 2, skillGroup: 'Physical', skillCategory: 'Active' }],
    });
    const manager = new ImprovementManager(character);
    const wareId = createCharacterId();

    applyBonusHandlers(attentionCoprocessor.bonus, {
      character,
      manager,
      source: ImprovementSource.Cyberware,
      sourceName: wareSourceName(wareId),
      rating: 2,
      uniqueName: '',
    });

    const perceptionBonus = character.improvements.find(
      (improvement) => improvement.improvedName === 'Perception',
    );
    expect(perceptionBonus?.value).toBe(2);

    const baseRea = getAttributeTotal(character, 'REA');
    const wired = createWareFromCatalog(wiredReflexes, grades, manager, {
      kind: 'cyberware',
      grade: 'Standard',
      rating: 2,
      id: createCharacterId(),
    });
    applyBonusHandlers(wiredReflexes.bonus, {
      character,
      manager,
      source: ImprovementSource.Cyberware,
      sourceName: wareSourceName(wired.id),
      rating: wired.rating,
      uniqueName: '',
    });

    expect(getAttributeTotal(character, 'REA')).toBeGreaterThan(baseRea);
  });

  it('flags magic reduced below 1 by essence loss during validation', () => {
    const character = createEmptyCharacter({
      flags: { ...createEmptyCharacter().flags, magEnabled: true, magicianEnabled: true },
      attributes: {
        ...createEmptyCharacter().attributes,
        MAG: { base: 2, min: 1, max: 6, aug: 0 },
      },
      magicTradition: 'Hermetic',
      cyberware: [
        {
          id: 'c1',
          kind: 'cyberware',
          name: 'Wired Reflexes',
          grade: 'Standard',
          rating: 3,
          availability: '20R',
          cost: 100000,
          essence: 5,
          capacity: '0',
          capacityUsed: 0,
          children: [],
        },
      ],
    });
    const manager = new ImprovementManager(character);

    const validation = validateCharacter({
      character,
      manager,
      options: DEFAULT_CHARACTER_OPTIONS,
      qualityCatalog: buildQualityCatalog([]),
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === 'magic-essence-loss')).toBe(true);
  });

  it('imports cyberware and bioware from legacy .chum XML sections', () => {
    const { character, warnings } = importChumDocument({
      gameedition: 'SR4',
      bp: '400',
      maxavail: '12',
      cyberwares: {
        cyberware: {
          name: 'Wired Reflexes',
          grade: 'Standard',
          rating: '1',
          avail: '8R',
          cost: '11000',
          ess: '2',
          capacity: '0',
          children: {
            cyberware: {
              name: 'Flare Compensation',
              grade: 'Standard',
              rating: '0',
              avail: '4',
              cost: '750',
              ess: '0.1',
              capacity: '[1]',
            },
          },
        },
      },
      biowares: {
        bioware: {
          name: 'Bone Density Augmentation',
          grade: 'Standard',
          rating: '1',
          avail: '4',
          cost: '4000',
          ess: '1',
          capacity: '0',
        },
      },
    });

    expect(warnings.some((warning) => warning.includes('cyberwares'))).toBe(false);
    expect(warnings.some((warning) => warning.includes('biowares'))).toBe(false);
    expect(character.cyberware).toHaveLength(1);
    expect(character.cyberware[0].name).toBe('Wired Reflexes');
    expect(character.cyberware[0].children).toHaveLength(1);
    expect(character.bioware).toHaveLength(1);
    expect(character.bioware[0].name).toBe('Bone Density Augmentation');
  });

  it('lists allowed grades from catalog entries', () => {
    expect(getAllowedGrades(wiredReflexes, grades)).toContain('Standard');
    expect(getAllowedGrades(wiredReflexes, grades)).toContain('Alphaware');
  });
});
