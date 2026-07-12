import { BonusNode } from './character';
import { ImprovementSource } from './improvement';

export type SelectionKind = 'text' | 'skill' | 'skill-group' | 'attribute';

export interface SelectionRequest {
  id: string;
  kind: SelectionKind;
  source: ImprovementSource;
  sourceName: string;
  rating: number;
  prompt: string;
  config: BonusNode;
  /** Pre-filled value (metatype bundled qualities with select). */
  forcedValue?: string;
}

export interface SelectionResolution {
  requestId: string;
  value: string;
}

export interface AttributeSelectionConfig {
  allowedAttributes?: string[];
  excludedAttributes?: string[];
  min?: number;
  max?: number;
  augmented?: number;
  augmentedMaximum?: number;
  affectBase?: boolean;
}

export interface SkillSelectionConfig {
  max?: number;
  val?: number;
  applyToRating?: boolean;
  skillGroup?: string;
  skillCategory?: string;
  excludeCategory?: string;
  limitToSkill?: string;
}
