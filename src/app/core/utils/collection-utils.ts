import { ChummerItem } from '../models/chummer-data.types';

/** Unwrap `{ item: [...] }` wrappers left by some JSON collections. */
export function extractCollection(raw: unknown): unknown[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && Array.isArray(obj[keys[0]])) {
      return obj[keys[0]] as unknown[];
    }
  }

  return [raw];
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(scalar).filter(Boolean).join(', ');
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return scalar((value as { value: unknown }).value);
  }
  return String(value);
}

/** Normalize raw JSON items into browseable ChummerItem rows. */
export function normalizeCollectionItems(raw: unknown[]): ChummerItem[] {
  return raw.map((entry) => normalizeItem(entry));
}

function normalizeItem(entry: unknown): ChummerItem {
  if (!entry || typeof entry !== 'object') {
    return { name: 'Unknown' };
  }

  const record = { ...(entry as Record<string, unknown>) };

  if (!record['name']) {
    if (record['category']) {
      record['name'] = scalar(record['category']);
    } else if (record['lp'] !== undefined) {
      record['name'] = `LP ${scalar(record['lp'])}`;
    } else if (record['id']) {
      record['name'] = scalar(record['id']);
    }
  }

  if (Array.isArray(record['name'])) {
    record['name'] = record['name'][0];
  }

  return record as ChummerItem;
}
