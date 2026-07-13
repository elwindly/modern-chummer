import { describe, expect, it } from 'vitest';
import { ChummerItem } from '../models/chummer-data.types';
import { matchesSourceScope } from './item-helpers';

function item(source?: string): ChummerItem {
  return { name: 'Test', source };
}

describe('matchesSourceScope', () => {
  it('includes every item when scope is all', () => {
    expect(matchesSourceScope(item('RC'), 'all')).toBe(true);
    expect(matchesSourceScope(item('SR4'), 'all')).toBe(true);
  });

  it('includes SR4 and missing-source items in base scope', () => {
    expect(matchesSourceScope(item('SR4'), 'base')).toBe(true);
    expect(matchesSourceScope(item(), 'base')).toBe(true);
    expect(matchesSourceScope(item(''), 'base')).toBe(true);
  });

  it('excludes non-core sourcebooks in base scope', () => {
    expect(matchesSourceScope(item('RC'), 'base')).toBe(false);
    expect(matchesSourceScope(item('AR'), 'base')).toBe(false);
  });
});
