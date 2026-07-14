import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calculateBp } from './bp-calculator';
import { continueBonusGrant, grantBonus } from './bonus-grant';
import { applyQualityBonus } from './improvement-handlers';
import { ImprovementManager } from './improvement-manager';
import {
  calculateMartialArtBp,
  countPositiveQualityBp,
} from './martial-art-calculator';
import {
  getEffectiveSkillRating,
  getSkillRatingMaximum,
} from './skill-totals';
import { listSelectableSkills, parseSkillSelectionConfig } from './selection-handlers';
import { createEmptyCharacter } from '../models/character';
import { DEFAULT_CHARACTER_OPTIONS } from '../models/character-options';
import { buildQualityCatalog } from '../models/economy';
import { ImprovementSource, ImprovementType } from '../models/improvement';
import { importChumDocument } from '../persistence/chum-importer';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../public/data');

interface QualityRecord {
  name: string;
  bp?: string;
  bonus?: Record<string, unknown>;
}

function loadQualities(): QualityRecord[] {
  const raw = readFileSync(join(dataDir, 'qualities.json'), 'utf8');
  return (JSON.parse(raw) as { qualities: QualityRecord[] }).qualities;
}

function findQuality(name: string): QualityRecord {
  const quality = loadQualities().find((item) => item.name === name);
  if (!quality) throw new Error(`Quality not found: ${name}`);
  return quality;
}

describe('milestone 7 — skill totals', () => {
  it('Aptitude raises skill rating maximum and allows rating 7', () => {
    const character = createEmptyCharacter({
      skills: [
        {
          name: 'Pistols',
          rating: 7,
          skillGroup: 'Firearms',
          skillCategory: 'Combat Active',
        },
      ],
    });
    const manager = new ImprovementManager(character);

    const { result: initial, session } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: 'Aptitude',
      bonus: { selectskill: { max: '1' } },
    });
    expect(initial.status).toBe('pending');

    continueBonusGrant(manager, session, {
      requestId: 'Aptitude:selectskill',
      value: 'Pistols',
    });

    const skill = character.skills[0];
    expect(getSkillRatingMaximum(character, skill)).toBe(7);
    expect(getEffectiveSkillRating(character, skill)).toBe(7);
  });

  it('College Education adds +1 to Academic knowledge skill effective rating', () => {
    const quality = findQuality('College Education');
    const character = createEmptyCharacter({
      knowledgeSkills: [
        {
          name: 'Biology',
          rating: 3,
          knowledge: true,
          skillCategory: 'Academic',
        },
      ],
    });
    const manager = new ImprovementManager(character);
    applyQualityBonus(character, manager, quality.name, quality.bonus);

    const skill = character.knowledgeSkills[0];
    expect(getEffectiveSkillRating(character, skill)).toBe(4);
  });
});

describe('milestone 7 — martial arts BP', () => {
  it('charges 5 BP per martial art rating', () => {
    const breakdown = calculateMartialArtBp(
      [{ name: 'Boxing', rating: 3 }],
      [],
      DEFAULT_CHARACTER_OPTIONS,
    );
    expect(breakdown.styles).toBe(15);
    expect(breakdown.total).toBe(15);
  });

  it('counts martial art BP toward positive quality budget with qualities', () => {
    const positiveQualities = 30;
    const martialStyles = 10;
    expect(countPositiveQualityBp(positiveQualities, martialStyles)).toBe(40);
  });

  it('includes martial arts in BP breakdown', () => {
    const catalog = buildQualityCatalog(loadQualities());
    const character = createEmptyCharacter({
      martialArts: [{ name: 'Boxing', rating: 2 }],
      martialArtManeuvers: [{ id: 'm1', name: 'Disarm' }],
    });
    const manager = new ImprovementManager(character);

    const bp = calculateBp(character, manager, DEFAULT_CHARACTER_OPTIONS, catalog);
    expect(bp.martialArts).toBe(10);
    expect(bp.martialArtManeuvers).toBe(2);
    expect(bp.remaining).toBe(388);
  });
});

describe('milestone 7 — skill selection helpers', () => {
  it('offers character skills for quality pickers when present', () => {
    const config = parseSkillSelectionConfig({ max: '1' });
    const options = listSelectableSkills(
      config,
      [
        { name: 'Pistols', skillGroup: 'Firearms', skillCategory: 'Combat Active' },
        { name: 'Automatics', skillGroup: 'Firearms', skillCategory: 'Combat Active' },
      ],
      [{ name: 'Pistols', skillGroup: 'Firearms', skillCategory: 'Combat Active' }],
    );

    expect(options).toEqual(['Pistols']);
  });
});

describe('milestone 7 — chum import martial arts', () => {
  it('imports martial arts and maneuvers from chum sections', () => {
    const result = importChumDocument({
      alias: 'Test',
      metatype: 'Human',
      martialarts: {
        martialart: {
          name: 'Boxing',
          rating: '2',
          source: 'AR',
          page: '157',
        },
      },
      martialartmaneuvers: {
        martialartmaneuver: {
          guid: 'abc-123',
          name: 'Disarm',
          source: 'AR',
          page: '159',
        },
      },
    });

    expect(result.character.martialArts).toHaveLength(1);
    expect(result.character.martialArts[0].rating).toBe(2);
    expect(result.character.martialArtManeuvers).toHaveLength(1);
    expect(result.character.martialArtManeuvers[0].name).toBe('Disarm');
    expect(result.warnings.some((warning) => warning.includes('martialarts'))).toBe(false);
  });
});

describe('milestone 7 — Aptitude improvement type', () => {
  it('creates a maximum improvement on the selected skill', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);
    const { session } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: 'Aptitude',
      bonus: { selectskill: { max: '1' } },
    });

    continueBonusGrant(manager, session, {
      requestId: 'Aptitude:selectskill',
      value: 'Pistols',
    });

    expect(character.improvements).toHaveLength(1);
    expect(character.improvements[0].type).toBe(ImprovementType.Skill);
    expect(character.improvements[0].maximum).toBe(1);
  });
});
