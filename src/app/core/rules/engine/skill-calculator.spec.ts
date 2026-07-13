import { describe, expect, it } from 'vitest';
import { calculateBp } from './bp-calculator';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { createEmptyCharacter } from '../models/character';
import { ImprovementManager } from './improvement-manager';
import {
  calculateActiveSkillBp,
  calculateKnowledgeSkillsBp,
  calculateSkillGroupBp,
  getFreeKnowledgeSkillPoints,
} from './skill-calculator';

describe('skill-calculator', () => {
  it('charges 4 BP per active skill rating', () => {
    expect(calculateActiveSkillBp({ name: 'Pistols', rating: 3 }, DEFAULT_CHARACTER_OPTIONS)).toBe(
      12,
    );
  });

  it('doubles BP cost for ratings above 6', () => {
    expect(calculateActiveSkillBp({ name: 'Pistols', rating: 7 }, DEFAULT_CHARACTER_OPTIONS)).toBe(
      32,
    );
  });

  it('charges 10 BP per skill group rating', () => {
    expect(
      calculateSkillGroupBp({ name: 'Firearms', rating: 2 }, DEFAULT_CHARACTER_OPTIONS),
    ).toBe(20);
  });

  it('grants free knowledge skill points from INT + LOG', () => {
    const character = createEmptyCharacter({
      attributes: {
        ...createEmptyCharacter().attributes,
        INT: { min: 1, max: 6, augMax: 9, base: 4, value: 4 },
        LOG: { min: 1, max: 6, augMax: 9, base: 3, value: 3 },
      },
    });
    expect(getFreeKnowledgeSkillPoints(character)).toBe(21);
  });

  it('charges BP only for knowledge skills above free points', () => {
    const character = createEmptyCharacter({
      attributes: {
        ...createEmptyCharacter().attributes,
        INT: { min: 1, max: 6, augMax: 9, base: 2, value: 2 },
        LOG: { min: 1, max: 6, augMax: 9, base: 2, value: 2 },
      },
      knowledgeSkills: [
        { name: 'Street Gangs', rating: 5, knowledge: true },
        { name: 'Seattle', rating: 5, knowledge: true },
        { name: 'English', rating: 5, knowledge: true },
      ],
    });
    expect(calculateKnowledgeSkillsBp(character, DEFAULT_CHARACTER_OPTIONS)).toBe(3);
  });
});

describe('bp-calculator contacts', () => {
  const catalog = buildQualityCatalog([]);

  it('refunds CHA-based free contact points', () => {
    const character = createEmptyCharacter({
      attributes: {
        ...createEmptyCharacter().attributes,
        CHA: { min: 4, max: 6, augMax: 9, base: 4, value: 4 },
      },
      contacts: [{ name: 'Fixer', connection: 2, loyalty: 2, group: 0 }],
    });
    const manager = new ImprovementManager(character);
    const options = { ...DEFAULT_CHARACTER_OPTIONS, freeContacts: true };

    const bp = calculateBp(character, manager, options, catalog);
    expect(bp.contacts).toBe(0);
    expect(bp.remaining).toBe(400);
  });
});

describe('bp-calculator milestone 6', () => {
  const catalog = buildQualityCatalog([]);

  it('includes skills, nuyen BP, and special attributes for a typical human', () => {
    const character = createEmptyCharacter({
      attributes: {
        ...createEmptyCharacter().attributes,
        EDG: { min: 2, max: 7, augMax: 7, base: 3, value: 3 },
      },
      skills: [{ name: 'Pistols', rating: 2 }],
      contacts: [{ name: 'Fixer', connection: 3, loyalty: 2, group: 0 }],
      nuyenBpSpent: 10,
    });
    const manager = new ImprovementManager(character);

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.specialAttributes).toBe(10);
    expect(bp.activeSkills).toBe(8);
    expect(bp.contacts).toBe(5);
    expect(bp.nuyenBp).toBe(10);
    expect(bp.remaining).toBe(367);
  });
});
