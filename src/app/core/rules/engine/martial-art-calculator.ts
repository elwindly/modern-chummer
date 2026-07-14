import { CharacterOptions } from '../models/character-options';
import { CharacterMartialArt, CharacterMartialArtManeuver } from '../models/skill';

export interface MartialArtBpBreakdown {
  styles: number;
  maneuvers: number;
  total: number;
}

export function calculateMartialArtStyleBp(
  art: CharacterMartialArt,
  options: CharacterOptions,
): number {
  if (art.rating <= 0) return 0;
  return art.rating * options.bpMartialArt;
}

export function calculateMartialArtManeuverBp(
  maneuvers: CharacterMartialArtManeuver[],
  options: CharacterOptions,
): number {
  return maneuvers.length * options.bpMartialArtManeuver;
}

export function calculateMartialArtBp(
  arts: CharacterMartialArt[],
  maneuvers: CharacterMartialArtManeuver[],
  options: CharacterOptions,
): MartialArtBpBreakdown {
  let styles = 0;
  for (const art of arts) {
    styles += calculateMartialArtStyleBp(art, options);
  }

  const maneuverBp = calculateMartialArtManeuverBp(maneuvers, options);

  return {
    styles,
    maneuvers: maneuverBp,
    total: styles + maneuverBp,
  };
}

export function countPositiveQualityBp(
  positiveQualities: number,
  martialArtStyles: number,
): number {
  return positiveQualities + martialArtStyles;
}
