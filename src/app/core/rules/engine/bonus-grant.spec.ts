import { describe, expect, it } from 'vitest';
import {
  continueBonusGrant,
  createBonusGrantSession,
  grantBonus,
} from './bonus-grant';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';
import { listSelectableAttributes, parseAttributeSelectionConfig } from './selection-handlers';

describe('selection-handlers', () => {
  it('lists attributes excluding EDG, MAG, RES for Exceptional Attribute', () => {
    const config = parseAttributeSelectionConfig({
      excludeattribute: ['EDG', 'MAG', 'RES'],
      max: '1',
    });

    const attributes = listSelectableAttributes(config, false, false);
    expect(attributes).toContain('BOD');
    expect(attributes).not.toContain('EDG');
    expect(attributes).not.toContain('MAG');
    expect(attributes).not.toContain('RES');
  });
});

describe('bonus-grant', () => {
  it('returns pending selection for Aptitude before applying bonus', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const { result } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: 'Aptitude',
      bonus: { selectskill: { max: '1' } },
    });

    expect(result.status).toBe('pending');
    expect(result.pending?.kind).toBe('skill');
    expect(result.pending?.id).toBe('Aptitude:selectskill');
    expect(character.improvements).toHaveLength(0);
  });

  it('completes Aptitude grant after skill selection', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const { result: initial, session } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: 'Aptitude',
      bonus: { selectskill: { max: '1' } },
    });

    expect(initial.status).toBe('pending');

    const { result: completed } = continueBonusGrant(manager, session, {
      requestId: 'Aptitude:selectskill',
      value: 'Pistols',
    });

    expect(completed.status).toBe('complete');
    expect(character.improvements).toHaveLength(1);
    expect(character.improvements[0].improvedName).toBe('Pistols');
    expect(character.improvements[0].type).toBe(ImprovementType.Skill);
    expect(character.improvements[0].maximum).toBe(1);
  });

  it('applies Exceptional Attribute after attribute selection', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const context = {
      source: ImprovementSource.Quality,
      sourceName: 'Exceptional Attribute',
      bonus: {
        selectattribute: {
          excludeattribute: ['EDG', 'MAG', 'RES'],
          max: '1',
        },
      },
    };

    const session = createBonusGrantSession(context);
    const { result: completed } = continueBonusGrant(manager, session, {
      requestId: 'Exceptional Attribute:selectattribute',
      value: 'BOD',
    });

    expect(completed.status).toBe('complete');
    expect(character.improvements[0].improvedName).toBe('BOD');
    expect(character.improvements[0].maximum).toBe(1);
  });

  it('applies static handlers when no selection is required', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    const { result } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: 'Tough as Nails (Rating 1)',
      bonus: { conditionmonitor: { physical: '1' } },
    });

    expect(result.status).toBe('complete');
    expect(manager.valueOf(ImprovementType.PhysicalCM)).toBe(1);
  });
});
