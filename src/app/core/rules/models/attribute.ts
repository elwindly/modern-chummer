export const ATTRIBUTE_CODES = [
  'BOD',
  'AGI',
  'REA',
  'STR',
  'CHA',
  'INT',
  'LOG',
  'WIL',
  'INI',
  'EDG',
  'MAG',
  'RES',
  'ESS',
] as const;

export type AttributeCode = (typeof ATTRIBUTE_CODES)[number];

export interface AttributeLimits {
  min: number;
  max: number;
  augMax: number;
}

export interface AttributeState extends AttributeLimits {
  base: number;
  value: number;
}

export function createAttributeState(limits: AttributeLimits, base?: number): AttributeState {
  const start = base ?? limits.min;
  return {
    ...limits,
    base: start,
    value: start,
  };
}

export function createDefaultAttributes(
  overrides: Partial<Record<AttributeCode, Partial<AttributeLimits & { base?: number }>>> = {},
): Record<AttributeCode, AttributeState> {
  const defaults: AttributeLimits = { min: 1, max: 6, augMax: 9 };

  return ATTRIBUTE_CODES.reduce(
    (acc, code) => {
      const custom = overrides[code] ?? {};
      const limits: AttributeLimits = {
        min: custom.min ?? defaults.min,
        max: custom.max ?? defaults.max,
        augMax: custom.augMax ?? defaults.augMax,
      };
      acc[code] = createAttributeState(limits, custom.base);
      return acc;
    },
    {} as Record<AttributeCode, AttributeState>,
  );
}
