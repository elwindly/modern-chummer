/** Source codes for the Shadowrun 4 core rulebook. */
export const BASE_GAME_SOURCE_CODES = ['SR4'] as const;

export type ContentSourceScope = 'all' | 'base';

export function isBaseGameSource(source: string | undefined): boolean {
  if (!source?.trim()) return true;
  return (BASE_GAME_SOURCE_CODES as readonly string[]).includes(source.trim());
}

export function contentSourceScopeLabel(scope: ContentSourceScope): string {
  return scope === 'base' ? 'Core rulebook (SR4)' : 'All sourcebooks';
}
