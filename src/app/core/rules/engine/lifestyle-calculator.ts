import { Character } from '../models/character';
import { CharacterLifestyle, CharacterPet } from '../models/lifestyle';
import { createCharacterId } from '../persistence/character-serializer';

export function calculateLifestyleCost(character: Character): number {
  return (character.lifestyles ?? []).reduce(
    (sum, lifestyle) => sum + lifestyle.cost * lifestyle.months,
    0,
  );
}

export function createLifestyle(
  name: string,
  cost: number,
  options: Partial<CharacterLifestyle> = {},
): CharacterLifestyle {
  return {
    id: options.id ?? createCharacterId(),
    name,
    cost,
    months: options.months ?? 1,
    lifestyleType: options.lifestyleType,
  };
}

export function createPet(name: string, options: Partial<{ id: string }> = {}): CharacterPet {
  return {
    id: options.id ?? createCharacterId(),
    name,
  };
}
