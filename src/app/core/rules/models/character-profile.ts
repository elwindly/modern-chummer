export interface CharacterProfile {
  sex?: string;
  age?: string;
  height?: string;
  weight?: string;
  description?: string;
  notes?: string;
}

export function createEmptyProfile(): CharacterProfile {
  return {};
}
