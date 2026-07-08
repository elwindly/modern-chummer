import { ImprovementSource, ImprovementType, createImprovement } from '../../models/improvement';
import { asBonusArray, BonusHandler, nodeHasKey, nodeText } from './types';

export const handleAddAttribute: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'addattribute')) return;

  const entries = asBonusArray(bonus['addattribute']);
  for (const entry of entries) {
    const name = nodeText(entry['name']).toUpperCase();

    if (name === 'MAG') {
      ctx.character.flags.magEnabled = true;
      ctx.manager.addImprovement(
        createImprovement({
          improvedName: 'MAG',
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.Attribute,
          uniqueName: 'enableattribute',
        }),
      );
    } else if (name === 'RES') {
      ctx.character.flags.resEnabled = true;
      ctx.manager.addImprovement(
        createImprovement({
          improvedName: 'RES',
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.Attribute,
          uniqueName: 'enableattribute',
        }),
      );
    }
  }
};

const TAB_MAP: Record<string, { flag: keyof typeof defaultFlags; label: string }> = {
  magician: { flag: 'magicianEnabled', label: 'Magician' },
  adept: { flag: 'adeptEnabled', label: 'Adept' },
  technomancer: { flag: 'technomancerEnabled', label: 'Technomancer' },
  critter: { flag: 'critterEnabled', label: 'Critter' },
  initiation: { flag: 'initiationEnabled', label: 'Initiation' },
};

const defaultFlags = {
  magicianEnabled: false,
  adeptEnabled: false,
  technomancerEnabled: false,
  critterEnabled: false,
  initiationEnabled: false,
};

export const handleEnableTab: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'enabletab')) return;

  const tabs = asBonusArray(bonus['enabletab']);
  for (const tab of tabs) {
    const tabName = nodeText(tab['name'] ?? tab).toLowerCase();
    const mapping = TAB_MAP[tabName];
    if (!mapping) continue;

    ctx.character.flags[mapping.flag] = true;
    ctx.manager.addImprovement(
      createImprovement({
        improvedName: mapping.label,
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.SpecialTab,
        uniqueName: 'enabletab',
      }),
    );
  }
};

export const handleSpecificAttribute: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'specificattribute')) return;

  for (const entry of asBonusArray(bonus['specificattribute'])) {
    const attributeName = nodeText(entry['name']).toUpperCase();

    if (attributeName === 'ESS') {
      ctx.manager.addImprovement(
        createImprovement({
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.Essence,
          value: ctx.manager.valueToInt(nodeText(entry['val']), ctx.rating),
        }),
      );
      continue;
    }

    let minimum = 0;
    let maximum = 0;
    let augmented = 0;
    let augmentedMaximum = 0;

    if (entry['min'] !== undefined) {
      minimum = ctx.manager.valueToInt(nodeText(entry['min']), ctx.rating);
    }
    if (entry['val'] !== undefined) {
      augmented = ctx.manager.valueToInt(nodeText(entry['val']), ctx.rating);
    }
    if (entry['max'] !== undefined) {
      const maxText = nodeText(entry['max']);
      if (maxText.includes('-natural')) {
        const numeric = Number(maxText.replace('-natural', '').trim());
        const metatypeMax = ctx.character.attributes[attributeName as keyof typeof ctx.character.attributes]?.max ?? 0;
        maximum = numeric - metatypeMax;
      } else {
        maximum = ctx.manager.valueToInt(maxText, ctx.rating);
      }
    }
    if (entry['aug'] !== undefined) {
      augmentedMaximum = ctx.manager.valueToInt(nodeText(entry['aug']), ctx.rating);
    }

    let uniqueName = ctx.uniqueName;
    const nameNode = entry['name'];
    if (typeof nameNode === 'object' && nameNode !== null && 'precedence' in nameNode) {
      uniqueName = `precedence${nodeText((nameNode as Record<string, unknown>)['precedence'])}`;
    } else if (entry['precedence'] !== undefined) {
      uniqueName = `precedence${nodeText(entry['precedence'])}`;
    }

    let improvedName = attributeName;
    if (entry['affectbase'] !== undefined) {
      improvedName += 'Base';
    }

    ctx.manager.addImprovement(
      createImprovement({
        improvedName,
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.Attribute,
        uniqueName,
        rating: 1,
        minimum,
        maximum,
        augmented,
        augmentedMaximum,
      }),
    );
  }
};

export const handleConditionMonitor: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'conditionmonitor')) return;

  const monitor = bonus['conditionmonitor'] as Record<string, unknown>;

  if (monitor['physical'] !== undefined) {
    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.PhysicalCM,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(monitor['physical']), ctx.rating),
      }),
    );
  }

  if (monitor['stun'] !== undefined) {
    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.StunCM,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(monitor['stun']), ctx.rating),
      }),
    );
  }

  if (monitor['threshold'] !== undefined) {
    const threshold = monitor['threshold'] as Record<string, unknown>;
    let uniqueName = ctx.uniqueName;
    if (threshold['precedence'] !== undefined) {
      uniqueName = `precedence${nodeText(threshold['precedence'])}`;
    }

    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.CMThreshold,
        uniqueName,
        value: ctx.manager.valueToInt(nodeText(threshold), ctx.rating),
      }),
    );
  }

  if (monitor['thresholdoffset'] !== undefined) {
    const offset = monitor['thresholdoffset'] as Record<string, unknown>;
    let uniqueName = ctx.uniqueName;
    if (offset['precedence'] !== undefined) {
      uniqueName = `precedence${nodeText(offset['precedence'])}`;
    }

    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.CMThresholdOffset,
        uniqueName,
        value: ctx.manager.valueToInt(nodeText(offset), ctx.rating),
      }),
    );
  }

  if (monitor['overflow'] !== undefined) {
    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.CMOverflow,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(monitor['overflow']), ctx.rating),
      }),
    );
  }
};

export const handleDamageResistance: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'damageresistance')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.DamageResistance,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['damageresistance']), ctx.rating),
    }),
  );
};

export const handleArmor: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'armor')) return;

  const armor = bonus['armor'] as Record<string, unknown>;
  if (armor['ballistic'] !== undefined) {
    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.BallisticArmor,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(armor['ballistic']), ctx.rating),
      }),
    );
  }

  if (armor['impact'] !== undefined) {
    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.ImpactArmor,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(armor['impact']), ctx.rating),
      }),
    );
  }
};

export const handleInitiative: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'initiative')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.Initiative,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['initiative']), ctx.rating),
    }),
  );
};

export const BONUS_HANDLERS: BonusHandler[] = [
  handleAddAttribute,
  handleEnableTab,
  handleSpecificAttribute,
  handleConditionMonitor,
  handleDamageResistance,
  handleArmor,
  handleInitiative,
];

export function applyBonusHandlers(
  bonus: Record<string, unknown> | null | undefined,
  ctx: BonusHandlerContext,
): void {
  if (!bonus || typeof bonus !== 'object') return;

  for (const handler of BONUS_HANDLERS) {
    handler(bonus, ctx);
  }
}

export function applyQualityBonus(
  character: Character,
  manager: ImprovementManager,
  qualityName: string,
  bonus: Record<string, unknown> | null | undefined,
  rating = 1,
): void {
  applyBonusHandlers(bonus, {
    character,
    manager,
    source: ImprovementSource.Quality,
    sourceName: qualityName,
    rating,
    uniqueName: '',
  });
}
