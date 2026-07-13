import { ChummerItem } from '../models/chummer-data.types';
import { ContentSourceScope, isBaseGameSource } from '../models/content-source-scope';

export function categoryLabel(item: ChummerItem): string {
  const category = item['category'] as unknown;
  if (typeof category === 'string') return category;
  if (Array.isArray(category)) {
    return category.map((c) => scalarValue(c)).filter(Boolean).join(', ');
  }
  if (category && typeof category === 'object' && 'value' in category) {
    return String((category as { value: string }).value);
  }
  return '';
}

function scalarValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return String((value as { value: unknown }).value);
  }
  return String(value);
}

function formatCost(value: unknown): string {
  if (Array.isArray(value)) return value.map(scalarValue).filter(Boolean).join(' / ');
  return scalarValue(value);
}

export function itemSummary(item: ChummerItem): string {
  const parts: string[] = [];

  if (item['min'] !== undefined) {
    parts.push(
      `Ranges: ${scalarValue(item['min'])}/${scalarValue(item['short'])}/${scalarValue(item['medium'])}/${scalarValue(item['long'])}/${scalarValue(item['extreme'])}`,
    );
  }

  const cost = item['cost'] ?? item['bp'] ?? item['karma'];
  if (cost !== undefined && cost !== null && cost !== '') {
    const label = item['bp'] !== undefined ? 'BP' : item['karma'] !== undefined ? 'Karma' : 'Cost';
    parts.push(`${label}: ${formatCost(cost)}`);
  }

  if (item['lp'] !== undefined && item['name'] && !String(item['name']).startsWith('LP ')) {
    parts.push(`LP: ${scalarValue(item['lp'])}`);
  }

  const avail = item['avail'];
  if (typeof avail === 'string' && avail) parts.push(`Avail: ${avail}`);

  const rating = item['rating'];
  if (rating !== undefined && rating !== null && rating !== '') {
    parts.push(`Rating: ${scalarValue(rating)}`);
  }

  if (item['id'] && item['name'] !== item['id']) {
    parts.push(`ID: ${scalarValue(item['id'])}`);
  }

  if (item['drain']) parts.push(`Drain: ${scalarValue(item['drain'])}`);
  if (item['dice']) parts.push(`Dice: ${scalarValue(item['dice'])}`);

  return parts.join(' · ');
}

export function matchesSourceScope(item: ChummerItem, scope: ContentSourceScope): boolean {
  if (scope === 'all') return true;
  return isBaseGameSource(item.source);
}

export function matchesSearch(item: ChummerItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const name = item.name?.toLowerCase() ?? '';
  const category = categoryLabel(item).toLowerCase();
  const source = String(item.source ?? '').toLowerCase();
  const id = String(item['id'] ?? '').toLowerCase();
  const page = String(item.page ?? '').toLowerCase();
  return (
    name.includes(q) ||
    category.includes(q) ||
    source.includes(q) ||
    id.includes(q) ||
    page.includes(q)
  );
}

export function sortByName(items: ChummerItem[]): ChummerItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
