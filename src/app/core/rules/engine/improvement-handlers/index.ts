import { Character } from '../../models/character';
import { ImprovementSource, ImprovementType, createImprovement } from '../../models/improvement';
import { ImprovementManager } from '../improvement-manager';
import { asBonusArray, BonusHandler, BonusHandlerContext, nodeHasKey, nodeText } from './types';

export const handleAddAttribute: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'addattribute')) return;

  const entries = asBonusArray(bonus['addattribute']);
  for (const entry of entries) {
    const name = nodeText(entry['name']).toUpperCase();
    if (name !== 'MAG' && name !== 'RES') continue;

    if (name === 'MAG') {
      ctx.character.flags.magEnabled = true;
    } else {
      ctx.character.flags.resEnabled = true;
    }

    const attr = ctx.character.attributes[name as 'MAG' | 'RES'];
    const min =
      entry['min'] !== undefined
        ? ctx.manager.valueToInt(nodeText(entry['min']), ctx.rating)
        : Math.max(1, attr.min);
    const max =
      entry['max'] !== undefined
        ? ctx.manager.valueToInt(nodeText(entry['max']), ctx.rating)
        : Math.max(6, attr.max);
    const augMax =
      entry['aug'] !== undefined
        ? ctx.manager.valueToInt(nodeText(entry['aug']), ctx.rating)
        : Math.max(max, attr.augMax);
    const value =
      entry['val'] !== undefined
        ? ctx.manager.valueToInt(nodeText(entry['val']), ctx.rating)
        : min;

    attr.min = min;
    attr.max = max;
    attr.augMax = augMax;
    // Starting value for newly enabled special attributes (Magician/Adept/Technomancer).
    if (attr.base < value) {
      attr.base = value;
    }
    if (attr.base < attr.min) {
      attr.base = attr.min;
    }

    ctx.manager.addImprovement(
      createImprovement({
        improvedName: name,
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.Attribute,
        uniqueName: 'enableattribute',
        minimum: 0,
        maximum: 0,
        augmentedMaximum: 0,
      }),
    );
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

  for (const armor of asBonusArray(bonus['armor'])) {
    const ballistic = armor['ballistic'] ?? armor['b'];
    const impact = armor['impact'] ?? armor['i'];

    if (ballistic !== undefined) {
      ctx.manager.addImprovement(
        createImprovement({
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.BallisticArmor,
          uniqueName: ctx.uniqueName,
          value: ctx.manager.valueToInt(nodeText(ballistic), ctx.rating),
        }),
      );
    }

    if (impact !== undefined) {
      ctx.manager.addImprovement(
        createImprovement({
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.ImpactArmor,
          uniqueName: ctx.uniqueName,
          value: ctx.manager.valueToInt(nodeText(impact), ctx.rating),
        }),
      );
    }
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

export const handleSpecificSkill: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'specificskill')) return;

  for (const entry of asBonusArray(bonus['specificskill'])) {
    const addToRating = nodeText(entry['applytorating']).toLowerCase() === 'yes';
    let uniqueName = ctx.uniqueName;

    if (entry['precedence'] !== undefined) {
      uniqueName = `precedence${nodeText(entry['precedence'])}`;
    }

    if (entry['bonus'] !== undefined) {
      ctx.manager.addImprovement(
        createImprovement({
          improvedName: nodeText(entry['name']),
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.Skill,
          uniqueName,
          value: ctx.manager.valueToInt(nodeText(entry['bonus']), ctx.rating),
          addToRating,
        }),
      );
    }

    if (entry['max'] !== undefined) {
      ctx.manager.addImprovement(
        createImprovement({
          improvedName: nodeText(entry['name']),
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.Skill,
          uniqueName,
          maximum: ctx.manager.valueToInt(nodeText(entry['max']), ctx.rating),
          rating: 1,
          addToRating,
        }),
      );
    }
  }
};

export const handleSkillCategory: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'skillcategory')) return;

  for (const entry of asBonusArray(bonus['skillcategory'])) {
    const addToRating = nodeText(entry['applytorating']).toLowerCase() === 'yes';
    const exclude = entry['exclude'] !== undefined ? nodeText(entry['exclude']) : '';

    ctx.manager.addImprovement(
      createImprovement({
        improvedName: nodeText(entry['name']),
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.SkillCategory,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(entry['bonus']), ctx.rating),
        exclude,
        addToRating,
      }),
    );
  }
};

export const handleDrainResist: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'drainresist')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.DrainResistance,
      value: ctx.manager.valueToInt(nodeText(bonus['drainresist']), ctx.rating),
    }),
  );
};

export const handleFadingResist: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'fadingresist')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.FadingResistance,
      value: ctx.manager.valueToInt(nodeText(bonus['fadingresist']), ctx.rating),
    }),
  );
};

export const handleNuyenAmt: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'nuyenamt')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.Nuyen,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['nuyenamt']), ctx.rating),
    }),
  );
};

export const handleLivingPersona: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'livingpersona')) return;

  const persona = bonus['livingpersona'] as Record<string, unknown>;
  const fields: Array<[string, ImprovementType]> = [
    ['response', ImprovementType.LivingPersonaResponse],
    ['signal', ImprovementType.LivingPersonaSignal],
    ['firewall', ImprovementType.LivingPersonaFirewall],
    ['system', ImprovementType.LivingPersonaSystem],
    ['biofeedback', ImprovementType.LivingPersonaBiofeedback],
  ];

  for (const [key, type] of fields) {
    if (persona[key] === undefined) continue;

    ctx.manager.addImprovement(
      createImprovement({
        source: ctx.source,
        sourceName: ctx.sourceName,
        type,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(persona[key]), ctx.rating),
      }),
    );
  }
};

export const handleInitiativePass: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'initiativepass')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.InitiativePass,
      uniqueName: 'initiativepass',
      value: ctx.manager.valueToInt(nodeText(bonus['initiativepass']), ctx.rating),
    }),
  );
};

export const handleSpellLimit: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'spelllimit')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.SpellLimit,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['spelllimit']), ctx.rating),
    }),
  );
};

export const handleAdeptPowerPoints: BonusHandler = (bonus, ctx) => {
  const key = nodeHasKey(bonus, 'adeptpowerpoints')
    ? 'adeptpowerpoints'
    : nodeHasKey(bonus, 'powerpoints')
      ? 'powerpoints'
      : null;
  if (!key) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.AdeptPowerPoints,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus[key]), ctx.rating),
    }),
  );
};

export const handleUnarmedDV: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'unarmeddv')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.UnarmedDV,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['unarmeddv']), ctx.rating),
    }),
  );
};

export const handleReach: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'reach')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.Reach,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['reach']), ctx.rating),
    }),
  );
};

export const handleSkillGroup: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'skillgroup')) return;

  for (const entry of asBonusArray(bonus['skillgroup'])) {
    const addToRating = nodeText(entry['applytorating']).toLowerCase() === 'yes';
    let uniqueName = ctx.uniqueName;

    if (entry['precedence'] !== undefined) {
      uniqueName = `precedence${nodeText(entry['precedence'])}`;
    }

    if (entry['bonus'] !== undefined) {
      ctx.manager.addImprovement(
        createImprovement({
          improvedName: nodeText(entry['name']),
          source: ctx.source,
          sourceName: ctx.sourceName,
          type: ImprovementType.SkillGroup,
          uniqueName,
          value: ctx.manager.valueToInt(nodeText(entry['bonus']), ctx.rating),
          addToRating,
        }),
      );
    }
  }
};

export const handleNuyenMaxBP: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'nuyenmaxbp')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.NuyenMaxBP,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['nuyenmaxbp']), ctx.rating),
    }),
  );
};

export const handleMovementPercent: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'movementpercent')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.MovementPercent,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['movementpercent']), ctx.rating),
    }),
  );
};

export const handleWeaponCategoryDV: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'weaponcategorydv')) return;

  for (const entry of asBonusArray(bonus['weaponcategorydv'])) {
    const category = nodeText(entry['category'] ?? entry['name']);

    ctx.manager.addImprovement(
      createImprovement({
        improvedName: category,
        source: ctx.source,
        sourceName: ctx.sourceName,
        type: ImprovementType.WeaponCategoryDV,
        uniqueName: ctx.uniqueName,
        value: ctx.manager.valueToInt(nodeText(entry['bonus']), ctx.rating),
      }),
    );
  }
};

export const handleSmartlink: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'smartlink')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.Smartlink,
      uniqueName: ctx.uniqueName,
      value: 1,
    }),
  );
};

export const handleCyberwareEssCost: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'cyberwareesscost')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.CyberwareEssCost,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['cyberwareesscost']), ctx.rating),
    }),
  );
};

export const handleBiowareEssCost: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'biowareesscost')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.BiowareEssCost,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['biowareesscost']), ctx.rating),
    }),
  );
};

export const handleRestrictedItemCount: BonusHandler = (bonus, ctx) => {
  if (!nodeHasKey(bonus, 'restricteditemcount')) return;

  ctx.manager.addImprovement(
    createImprovement({
      source: ctx.source,
      sourceName: ctx.sourceName,
      type: ImprovementType.RestrictedItemCount,
      uniqueName: ctx.uniqueName,
      value: ctx.manager.valueToInt(nodeText(bonus['restricteditemcount']), ctx.rating),
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
  handleSpecificSkill,
  handleSkillCategory,
  handleDrainResist,
  handleFadingResist,
  handleNuyenAmt,
  handleLivingPersona,
  handleInitiativePass,
  handleSpellLimit,
  handleAdeptPowerPoints,
  handleUnarmedDV,
  handleReach,
  handleSkillGroup,
  handleNuyenMaxBP,
  handleMovementPercent,
  handleWeaponCategoryDV,
  handleSmartlink,
  handleCyberwareEssCost,
  handleBiowareEssCost,
  handleRestrictedItemCount,
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
