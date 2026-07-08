import { describe, expect, it } from 'vitest';
import {
  evaluateAvailability,
  evaluateDamageFormula,
  evaluateFormula,
} from '../engine/formula-evaluator';

describe('evaluateFormula', () => {
  it('parses plain integers', () => {
    expect(evaluateFormula('500')).toBe(500);
  });

  it('substitutes Rating', () => {
    expect(evaluateFormula('Rating * 3000', { rating: 5 })).toBe(15000);
  });

  it('uses integer division for slashes', () => {
    expect(evaluateFormula('STR/2+1', { attributes: { STR: 7 } })).toBe(4);
    expect(evaluateFormula('STR/2+1', { attributes: { STR: 6 } })).toBe(4);
  });

  it('parses FixedValues by rating index', () => {
    expect(evaluateFormula('FixedValues(100,200,300)', { rating: 2 })).toBe(200);
    expect(evaluateFormula('FixedValues(100,200,300)', { rating: 5 })).toBe(300);
  });

  it('combines attributes in expressions', () => {
    expect(
      evaluateFormula('BOD + WIL', {
        attributes: { BOD: 4, WIL: 5 },
      }),
    ).toBe(9);
  });
});

describe('evaluateDamageFormula', () => {
  it('splits damage value and type', () => {
    expect(
      evaluateDamageFormula('(STR/2+1)P', { attributes: { STR: 6 } }),
    ).toEqual({ value: 4, type: 'P' });
  });
});

describe('evaluateAvailability', () => {
  it('parses availability with restricted suffix', () => {
    expect(evaluateAvailability('8R')).toEqual({ value: 8, suffix: 'R' });
    expect(evaluateAvailability('12F')).toEqual({ value: 12, suffix: 'F' });
  });
});
