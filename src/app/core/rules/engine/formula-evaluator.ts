import { AttributeCode } from '../models/attribute';

export interface FormulaContext {
  rating?: number;
  attributes?: Partial<Record<AttributeCode, number>>;
}

const ATTRIBUTE_PATTERN = /\b(BOD|AGI|REA|STR|CHA|INT|LOG|WIL|EDG|MAG|RES)\b/g;

/**
 * Evaluate Chummer formula strings (cost, bonus values, damage bases).
 * Integer division uses floor(a/b) to mirror XPath div semantics.
 */
export function evaluateFormula(expression: string, context: FormulaContext = {}): number {
  const trimmed = expression.trim();
  if (!trimmed) return 0;

  const fixed = parseFixedValues(trimmed, context.rating ?? 1);
  if (fixed !== null) return fixed;

  if (!needsEvaluation(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  let expr = trimmed.replace(/Rating/g, String(context.rating ?? 1));

  const attributes = context.attributes ?? {};
  expr = expr.replace(ATTRIBUTE_PATTERN, (match) => {
    const value = attributes[match as AttributeCode];
    return value !== undefined ? String(value) : match;
  });

  expr = expr.replace(/\//g, ' div ');

  return evaluateArithmetic(expr);
}

export function evaluateAvailability(
  expression: string,
  context: FormulaContext = {},
): { value: number; suffix: string } {
  const match = expression.trim().match(/^(.+?)([FR])?$/i);
  if (!match) return { value: 0, suffix: '' };

  const numericPart = match[1].trim();
  const suffix = (match[2] ?? '').toUpperCase();
  const value = evaluateFormula(numericPart, context);
  return { value, suffix };
}

export function evaluateDamageFormula(
  expression: string,
  context: FormulaContext = {},
): { value: number; type: string } {
  const match = expression.trim().match(/^(.+?)([PS])$/i);
  if (!match) {
    return { value: evaluateFormula(expression, context), type: '' };
  }

  return {
    value: evaluateFormula(match[1], context),
    type: match[2].toUpperCase(),
  };
}

function needsEvaluation(expression: string): boolean {
  return /[+\-*/()]|Rating|BOD|AGI|REA|STR|CHA|INT|LOG|WIL|EDG|MAG|RES|div/.test(expression);
}

function parseFixedValues(expression: string, rating: number): number | null {
  const match = expression.match(/^FixedValues\((.+)\)$/i);
  if (!match) return null;

  const values = match[1].split(',').map((part) => Number(part.trim()));
  const index = Math.max(0, rating - 1);
  return values[index] ?? values[values.length - 1] ?? 0;
}

function evaluateArithmetic(expression: string): number {
  const tokens = tokenize(expression);
  const rpn = toRpn(tokens);
  return Math.floor(evaluateRpn(rpn));
}

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if (char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if ('+-*/()'.includes(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
}

function toRpn(tokens: string[]): string[] {
  const output: string[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, div: 2 };

  for (const token of tokens) {
    if (token === 'div') {
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence.div
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
      continue;
    }

    if (!Number.isNaN(Number(token))) {
      output.push(token);
      continue;
    }

    if (token === '(') {
      operators.push(token);
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!);
      }
      operators.pop();
      continue;
    }

    if (token in precedence) {
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    }
  }

  while (operators.length > 0) {
    output.push(operators.pop()!);
  }

  return output;
}

function evaluateRpn(tokens: string[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      stack.push(Number(token));
      continue;
    }

    const right = stack.pop() ?? 0;
    const left = stack.pop() ?? 0;

    switch (token) {
      case '+':
        stack.push(left + right);
        break;
      case '-':
        stack.push(left - right);
        break;
      case '*':
        stack.push(left * right);
        break;
      case '/':
      case 'div':
        stack.push(right === 0 ? 0 : Math.floor(left / right));
        break;
      default:
        stack.push(0);
    }
  }

  return stack.pop() ?? 0;
}
