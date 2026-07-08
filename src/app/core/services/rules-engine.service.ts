import { Injectable } from '@angular/core';
import {
  applyQualityBonus,
  createEmptyCharacter,
  deriveStats,
  ImprovementManager,
  ImprovementType,
  type BonusNode,
  type Character,
  type DerivedStats,
} from '../rules';

@Injectable({ providedIn: 'root' })
export class RulesEngineService {
  createCharacter(overrides: Partial<Character> = {}): Character {
    return createEmptyCharacter(overrides);
  }

  createManager(character: Character): ImprovementManager {
    return new ImprovementManager(character);
  }

  applyQuality(
    character: Character,
    manager: ImprovementManager,
    qualityName: string,
    bonus: BonusNode | null | undefined,
    rating = 1,
  ): void {
    applyQualityBonus(character, manager, qualityName, bonus, rating);
  }

  deriveStats(character: Character, manager: ImprovementManager): DerivedStats {
    return deriveStats(character, manager);
  }

  getImprovementValue(manager: ImprovementManager, type: ImprovementType): number {
    return manager.valueOf(type);
  }
}
