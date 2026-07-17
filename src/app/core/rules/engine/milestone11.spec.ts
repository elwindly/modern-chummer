import { describe, expect, it } from 'vitest';
import { deriveStats } from './derived-stats';
import { applyBonusHandlers } from './improvement-handlers';
import { ImprovementManager } from './improvement-manager';
import { createEmptyCharacter } from '../models/character';
import { ImprovementSource, ImprovementType } from '../models/improvement';
import { exportChumDocument } from '../persistence/chum-exporter';

describe('milestone 11 — improvement handlers & derived stats', () => {
  it('applies spelllimit handler improvements', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyBonusHandlers(
      { spelllimit: '3' },
      {
        character,
        manager,
        source: ImprovementSource.Metamagic,
        sourceName: 'Test Metamagic',
        rating: 1,
        uniqueName: '',
      },
    );

    expect(manager.valueOf(ImprovementType.SpellLimit)).toBe(3);
    expect(character.improvements).toHaveLength(1);
    expect(character.improvements[0].type).toBe(ImprovementType.SpellLimit);
  });

  it('applies adeptpowerpoints and powerpoints handler improvements', () => {
    const character = createEmptyCharacter();
    const manager = new ImprovementManager(character);

    applyBonusHandlers(
      { adeptpowerpoints: '2' },
      {
        character,
        manager,
        source: ImprovementSource.Metamagic,
        sourceName: 'Power Point',
        rating: 1,
        uniqueName: '',
      },
    );

    expect(manager.valueOf(ImprovementType.AdeptPowerPoints)).toBe(2);

    applyBonusHandlers(
      { powerpoints: '1' },
      {
        character,
        manager,
        source: ImprovementSource.Metamagic,
        sourceName: 'Extra PP',
        rating: 1,
        uniqueName: '',
      },
    );

    expect(manager.valueOf(ImprovementType.AdeptPowerPoints)).toBe(3);
  });

  it('derives composure and initiative passes from attributes and improvements', () => {
    const character = createEmptyCharacter();
    character.attributes.CHA.base = 4;
    character.attributes.WIL.base = 3;
    const manager = new ImprovementManager(character);

    applyBonusHandlers(
      { initiativepass: '1' },
      {
        character,
        manager,
        source: ImprovementSource.Cyberware,
        sourceName: 'Wired Reflexes',
        rating: 1,
        uniqueName: '',
      },
    );

    const stats = deriveStats(character, manager);

    expect(stats.composure).toBe(7);
    expect(stats.initiativePasses).toBe(2);
  });

  it('exports skillgroups separately and includes profile notes', () => {
    const character = createEmptyCharacter({
      skillGroups: [{ name: 'Firearms', rating: 3 }],
    });
    character.profile = {
      sex: 'M',
      age: '30',
      height: '1.80m',
      weight: '80kg',
      description: 'A test runner',
      notes: 'Exported profile notes',
    };

    const xml = exportChumDocument(character);

    expect(xml).toContain('<skillgroups>');
    expect(xml).toContain('<skillgroup>');
    expect(xml).toContain('<name>Firearms</name>');
    expect(xml).toContain('<notes>Exported profile notes</notes>');
    expect(xml).toContain('<description>A test runner</description>');
    expect(xml).toContain('<sex>M</sex>');
  });
});
