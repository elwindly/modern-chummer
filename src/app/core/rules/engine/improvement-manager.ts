import { AttributeCode } from '../models/attribute';
import { Character, getAttributeTotal } from '../models/character';
import { Improvement, ImprovementSource, ImprovementType } from '../models/improvement';
import { evaluateFormula } from './formula-evaluator';

export interface ValueOfOptions {
  addToRating?: boolean;
  improvedName?: string;
  resEnabled?: boolean;
}

export function valueOf(
  improvements: Improvement[],
  type: ImprovementType,
  options: ValueOfOptions = {},
): number {
  const { addToRating = false, improvedName, resEnabled = false } = options;

  const sumNonCustom = aggregateImprovements(
    improvements.filter((item) => item.enabled && !item.custom),
    type,
    addToRating,
    improvedName,
    resEnabled,
  );

  const sumCustom = aggregateImprovements(
    improvements.filter((item) => item.enabled && item.custom),
    type,
    addToRating,
    improvedName,
    resEnabled,
  );

  return sumNonCustom + sumCustom;
}

function aggregateImprovements(
  improvements: Improvement[],
  type: ImprovementType,
  addToRating: boolean,
  improvedName: string | undefined,
  resEnabled: boolean,
): number {
  const uniqueNames = new Set<string>();
  const uniquePairs: Array<{ uniqueName: string; value: number }> = [];
  let total = 0;

  for (const improvement of improvements) {
    if (!matchesValueOfFilter(improvement, type, addToRating, improvedName, resEnabled)) {
      continue;
    }

    if (improvement.uniqueName) {
      uniqueNames.add(improvement.uniqueName);
      uniquePairs.push({ uniqueName: improvement.uniqueName, value: improvement.value });
    } else {
      total += improvement.value;
    }
  }

  for (const uniqueName of uniqueNames) {
    const highest = Math.max(
      -999,
      ...uniquePairs.filter((pair) => pair.uniqueName === uniqueName).map((pair) => pair.value),
    );
    total += highest;
  }

  if (uniqueNames.has('precedence1')) {
    total = uniquePairs
      .filter((pair) => pair.uniqueName === 'precedence1')
      .reduce((sum, pair) => sum + pair.value, 0);
  }

  if (uniqueNames.has('precedence0')) {
    total = Math.max(
      -999,
      ...uniquePairs.filter((pair) => pair.uniqueName === 'precedence0').map((pair) => pair.value),
    );
  }

  return total;
}

function matchesValueOfFilter(
  improvement: Improvement,
  type: ImprovementType,
  addToRating: boolean,
  improvedName: string | undefined,
  resEnabled: boolean,
): boolean {
  if (improvement.type !== type) return false;
  if (improvement.addToRating !== addToRating) return false;
  if (improvedName !== undefined && improvement.improvedName !== improvedName) return false;

  if (
    resEnabled &&
    improvement.source === ImprovementSource.Gear &&
    type === ImprovementType.MatrixInitiativePass
  ) {
    return false;
  }

  return true;
}

export function valueToInt(character: Character, expression: string, rating = 1): number {
  const attributes = Object.fromEntries(
    (['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES'] as AttributeCode[]).map(
      (code) => [code, getAttributeTotal(character, code)],
    ),
  ) as Partial<Record<AttributeCode, number>>;

  return evaluateFormula(expression, { rating, attributes });
}

export class ImprovementManager {
  private transaction: Improvement[] = [];

  constructor(private readonly character: Character) {}

  beginTransaction(): void {
    this.transaction = [];
  }

  commit(): void {
    this.transaction = [];
  }

  rollback(): void {
    if (this.transaction.length === 0) return;

    this.character.improvements = this.character.improvements.filter(
      (improvement) => !this.transaction.includes(improvement),
    );
    this.transaction = [];
  }

  addImprovement(improvement: Improvement): void {
    this.character.improvements.push(improvement);
    this.transaction.push(improvement);
  }

  removeImprovements(sourceName: string): void {
    this.character.improvements = this.character.improvements.filter(
      (improvement) => improvement.sourceName !== sourceName,
    );
  }

  valueOf(type: ImprovementType, options: ValueOfOptions = {}): number {
    return valueOf(this.character.improvements, type, {
      ...options,
      resEnabled: this.character.flags.resEnabled,
    });
  }

  valueToInt(expression: string, rating = 1): number {
    return valueToInt(this.character, expression, rating);
  }
}
