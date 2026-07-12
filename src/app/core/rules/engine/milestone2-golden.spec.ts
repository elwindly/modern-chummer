import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { deriveStats } from './derived-stats';
import { ImprovementManager } from './improvement-manager';
import { applyQualityBonus } from './improvement-handlers';
import { canTakeQuality } from './requirement-validator';
import { createEmptyCharacter } from '../models/character';
import { ImprovementType } from '../models/improvement';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

interface QualityRecord {
  name: string;
  bonus?: Record<string, unknown>;
  forbidden?: Record<string, unknown>;
  required?: Record<string, unknown>;
  limit?: string;
}

interface QualitiesFile {
  qualities: QualityRecord[];
}

interface MetatypesFile {
  metatypes: Array<{
    name: string;
    category?: string[];
    bodmin?: string;
    bodmax?: string;
    bodaug?: string;
  }>;
}

function loadQualities(): QualityRecord[] {
  const raw = readFileSync(join(dataDir, 'qualities.json'), 'utf8');
  return (JSON.parse(raw) as QualitiesFile).qualities;
}

function loadMetatypes(): MetatypesFile['metatypes'] {
  const raw = readFileSync(join(dataDir, 'metatypes.json'), 'utf8');
  return (JSON.parse(raw) as MetatypesFile).metatypes;
}

function findQuality(name: string): QualityRecord {
  const quality = loadQualities().find((item) => item.name === name);
  if (!quality) {
    throw new Error(`Quality not found: ${name}`);
  }
  return quality;
}

describe('golden tests from game data fixtures', () => {
  it('Human metatype has expected attribute limits from metatypes.json', () => {
    const human = loadMetatypes().find((item) => item.name === 'Human');
    expect(human).toBeDefined();
    expect(human?.bodmin).toBe('1');
    expect(human?.bodmax).toBe('6');
    expect(human?.bodaug).toBe('9');
    expect(human?.category).toContain('Metahuman');
  });

  it('Analytical Mind grants +2 to Data Search and Software from qualities.json', () => {
    const quality = findQuality('Analytical Mind');
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    const skillImprovements = character.improvements.filter(
      (item) => item.type === ImprovementType.Skill,
    );

    expect(skillImprovements).toHaveLength(2);
    expect(skillImprovements.map((item) => item.improvedName).sort()).toEqual([
      'Data Search',
      'Software',
    ]);
    expect(skillImprovements.every((item) => item.value === 2)).toBe(true);
  });

  it('College Education applies skill category bonus with applytorating', () => {
    const quality = findQuality('College Education');
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    const improvement = character.improvements.find(
      (item) => item.type === ImprovementType.SkillCategory,
    );

    expect(improvement?.improvedName).toBe('Academic');
    expect(improvement?.value).toBe(1);
    expect(improvement?.addToRating).toBe(true);
  });

  it('Focused Concentration (Rating 1) grants drain resistance from qualities.json', () => {
    const quality = findQuality('Focused Concentration (Rating 1)');
    const character = createEmptyCharacter({ qualities: ['Magician'] });
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    expect(manager.valueOf(ImprovementType.DrainResistance)).toBe(1);
  });

  it('In Debt (5,000¥) grants nuyen from qualities.json', () => {
    const quality = findQuality('In Debt (5,000¥)');
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    expect(manager.valueOf(ImprovementType.Nuyen)).toBe(5000);
  });

  it('Natural Hardening grants living persona biofeedback from qualities.json', () => {
    const quality = findQuality('Natural Hardening');
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    expect(manager.valueOf(ImprovementType.LivingPersonaBiofeedback)).toBe(1);
  });

  it('Infected: Banshee grants initiative pass from qualities.json', () => {
    const quality = findQuality('Infected: Banshee');
    const character = createEmptyCharacter({ metatype: 'Elf' });
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    expect(manager.valueOf(ImprovementType.InitiativePass)).toBe(1);
    expect(manager.valueOf(ImprovementType.Initiative)).toBe(1);
  });

  it('Tough as Nails increases physical CM using effective BOD from qualities.json', () => {
    const quality = findQuality('Tough as Nails (Rating 1)');
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, quality.name, quality.bonus);

    const stats = deriveStats(character, manager);
    expect(stats.physicalCm).toBe(11);
  });

  it('validates Adept forbidden/requirements from qualities.json', () => {
    const adept = findQuality('Adept');
    const magicianCharacter = createEmptyCharacter({ qualities: ['Magician'] });
    const cleanCharacter = createEmptyCharacter();

    expect(canTakeQuality(adept, magicianCharacter).met).toBe(false);
    expect(canTakeQuality(adept, cleanCharacter).met).toBe(true);
  });

  it('applies fadingresist handler from inline bonus', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyQualityBonus(character, manager, 'Test Echo', { fadingresist: '2' });

    expect(manager.valueOf(ImprovementType.FadingResistance)).toBe(2);
  });
});
