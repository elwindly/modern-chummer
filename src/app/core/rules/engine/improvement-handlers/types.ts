import { BonusNode } from '../models/character';
import { Character } from '../models/character';
import { Improvement, ImprovementSource } from '../models/improvement';
import { ImprovementManager } from './improvement-manager';

export interface BonusHandlerContext {
  character: Character;
  manager: ImprovementManager;
  source: ImprovementSource;
  sourceName: string;
  rating: number;
  uniqueName: string;
}

export type BonusHandler = (bonus: BonusNode, ctx: BonusHandlerContext) => void;

export function nodeText(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return nodeText(node[0]);
  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if ('value' in record) return nodeText(record['value']);
    if ('#text' in record) return nodeText(record['#text']);
    if ('name' in record) return nodeText(record['name']);
  }
  return '';
}

export function asBonusArray<T = BonusNode>(node: unknown): T[] {
  if (node === null || node === undefined) return [];
  if (Array.isArray(node)) return node as T[];
  return [node as T];
}

export function nodeHasKey(node: BonusNode, key: string): boolean {
  return key in node && node[key] !== null && node[key] !== undefined;
}
