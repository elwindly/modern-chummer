import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AttributeCode,
  BpBreakdown,
  Character,
  CharacterListEntry,
  CharacterOptions,
  DEFAULT_CHARACTER_OPTIONS,
  DerivedStats,
  ImprovementManager,
  ImprovementSource,
  SelectionRequest,
  ValidationResult,
  applyQualityBonus,
  buildQualityCatalog,
  isNegativeQuality,
  isPositiveQuality,
  calculateBp,
  calculateNuyen,
  cancelBonusGrant,
  continueBonusGrant,
  createCharacterId,
  createEmptyCharacter,
  deriveStats,
  deserializeCharacter,
  collectAvailabilityItems,
  collectAllAvailabilityItems,
  calculateEssence,
  createStreetItemFromCatalog,
  createWareFromCatalog,
  findStreetItem,
  findWare,
  getAllowedGrades,
  characterHasWareByName,
  isRatedWareEntry,
  refreshWareFromCatalog,
  removeWareFromList,
  requirementsMet,
  calculateParentCapacityTotal,
  calculateWareCapacityUsed,
  parseCapacityCost,
  scalarCatalogValue,
  wouldExceedEssenceMinimum,
  wareSourceName,
  getAttributeTotal,
  getEffectiveLimits,
  repairEnabledSpecialAttributes,
  getQualityOrigin,
  buyOffMetatypeQualityBp,
  getMaxNuyenBp,
  getFreeKnowledgeSkillPoints,
  grantBonus,
  getSkillRatingMaximum,
  getEffectiveSkillRating,
  syncSkillGrouping,
  syncLegacyPurchases,
  listSelectableSkills,
  listSelectableSkillGroups,
  parseSkillSelectionConfig,
  initializeMetatype,
  listMetavariants,
  listSelectableAttributes,
  loadCharacterOptions,
  MetatypeRecord,
  NuyenBreakdown,
  parseAttributeSelectionConfig,
  parseChumXml,
  exportChumDocument,
  QualityCatalogEntry,
  refreshStreetItemFromCatalog,
  removeStreetItemFromList,
  touchCharacter,
  validateCharacter,
  isRatedCatalogEntry,
  getCatalogMaxRating,
  createSpell,
  createPowerFromCatalog,
  createProgramFromCatalog,
  createMetamagic,
  createInitiationGrade,
  createCritterPower,
  createSpirit,
  createFocus,
  createLifestyle,
  createPet,
  createVehicleFromCatalog,
  createVehicleModFromCatalog,
  getSpellLimit,
  getAdeptPowerPointPool,
  calculatePowerPointsUsed,
  calculatePowerPointRemaining,
  refreshPowerPoints,
  type BonusGrantSession,
  type BonusNode,
  type ChumImportResult,
  type CharacterContact,
  type CharacterProfile,
  type CharacterSkill,
  type CharacterMartialArt,
  type CharacterSkillGroup,
  type CharacterWare,
  type CharacterPower,
  type CharacterProgram,
  type CharacterFocus,
  type CharacterLifestyle,
  type CharacterPet,
  type LifestyleCatalogEntry,
  type CharacterVehicle,
  type CritterPowerCatalogEntry,
  type EssenceBreakdown,
  type MetamagicCatalogEntry,
  type PowerCatalogEntry,
  type ProgramCatalogEntry,
  type RequirementResult,
  type SpellCatalogEntry,
  type StreetCatalogEntry,
  type TraditionEntry,
  type VehicleCatalogEntry,
  type VehicleModCatalogEntry,
  type WareCatalogEntry,
  type WareGrade,
  type WareKind,
} from '../rules';
import { applyBonusHandlers } from '../rules/engine/improvement-handlers';
import { CharacterStorageService } from './character-storage.service';
import { ChummerDataService } from './chummer-data.service';
import { extractCollection } from '../utils/collection-utils';
import { ChummerItem } from '../models/chummer-data.types';

export type RemoveQualityResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'metatype' | 'needs-confirmation'; buyOffBp?: number };

export type InstallWareResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'not-found'
        | 'requirements'
        | 'essence'
        | 'capacity'
        | 'duplicate'
        | 'interactive-bonus'
        | 'no-character';
    };

export type ApplyPackResult = { ok: boolean; applied: string[]; errors: string[] };

export type ApplyCyberwareSuiteResult = { ok: boolean; installed: string[]; errors: string[] };

interface PackSkillEntry {
  name: string;
  rating?: string;
  spec?: string | string[];
}

interface PackPowerEntry {
  name: string | { value: string; select?: string };
  rating?: string;
}

interface PackGearEntry {
  name: string | { value: string; select?: string };
  qty?: string;
  rating?: string;
}

export interface PackEntry {
  name: string;
  category?: string[];
  attributes?: Record<string, string>;
  skills?: PackSkillEntry[] | Record<string, string>;
  spells?: string[];
  powers?: PackPowerEntry[];
  gears?: PackGearEntry[];
  weapons?: Array<{ name: string }>;
  armors?: Array<{ name: string }>;
  nuyenbp?: string;
}

export interface CyberwareSuiteEntry {
  name: string;
  grade?: string | string[];
  cyberwares?: Array<{ name: string; rating?: string }>;
}

@Injectable({ providedIn: 'root' })
export class CharacterStoreService {
  private readonly http = inject(HttpClient);
  private readonly data = inject(ChummerDataService);
  private readonly storage = inject(CharacterStorageService);

  private readonly revision = signal(0);
  private manager: ImprovementManager | null = null;
  private grantSession: BonusGrantSession | null = null;
  private pendingGrantKind: 'quality' | 'power' | null = null;
  private pendingQualityName: string | null = null;
  private pendingPowerName: string | null = null;
  private pendingPowerRating = 1;
  private pendingPowerId: string | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly options = signal<CharacterOptions>(DEFAULT_CHARACTER_OPTIONS);
  readonly qualityCatalog = signal<Map<string, QualityCatalogEntry>>(new Map());
  readonly qualityRecords = signal<Map<string, { name: string; bonus?: BonusNode }>>(new Map());
  readonly metatypes = signal<MetatypeRecord[]>([]);
  readonly character = signal<Character | null>(null);
  readonly characterList = signal<CharacterListEntry[]>([]);
  readonly pendingSelection = signal<SelectionRequest | null>(null);
  readonly grantInProgress = signal(false);
  readonly initialized = signal(false);
  readonly lastImportWarnings = signal<string[]>([]);
  /** True when an edit cleared the finalized flag (for UI feedback). */
  readonly reopenedByEdit = signal(false);

  readonly skillCatalog = signal<Array<{ name: string; skillGroup?: string; skillCategory?: string; default?: string; specs?: string[] }>>([]);
  readonly knowledgeCatalog = signal<Array<{ name: string; skillCategory?: string; specs?: string[] }>>([]);
  readonly skillGroupNames = signal<string[]>([]);
  readonly martialArtCatalog = signal<Array<{ name: string; source?: string; page?: string }>>([]);
  readonly maneuverCatalog = signal<Array<{ name: string; source?: string; page?: string }>>([]);
  readonly gearCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly weaponCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly armorCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly weaponAccessoryCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly weaponModCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly armorModCatalog = signal<Map<string, StreetCatalogEntry>>(new Map());
  readonly cyberwareCatalog = signal<Map<string, WareCatalogEntry>>(new Map());
  readonly biowareCatalog = signal<Map<string, WareCatalogEntry>>(new Map());
  readonly cyberwareGrades = signal<Map<string, WareGrade>>(new Map());
  readonly biowareGrades = signal<Map<string, WareGrade>>(new Map());
  readonly spellCatalog = signal<Map<string, SpellCatalogEntry>>(new Map());
  readonly powerCatalog = signal<Map<string, PowerCatalogEntry>>(new Map());
  readonly programCatalog = signal<Map<string, ProgramCatalogEntry>>(new Map());
  readonly metamagicCatalog = signal<Map<string, MetamagicCatalogEntry>>(new Map());
  readonly traditionCatalog = signal<TraditionEntry[]>([]);
  readonly streamCatalog = signal<TraditionEntry[]>([]);
  readonly vehicleCatalog = signal<Map<string, VehicleCatalogEntry>>(new Map());
  readonly vehicleModCatalog = signal<Map<string, VehicleModCatalogEntry>>(new Map());
  readonly critterPowerCatalog = signal<Map<string, CritterPowerCatalogEntry>>(new Map());
  readonly lifestyleCatalog = signal<Map<string, LifestyleCatalogEntry>>(new Map());
  readonly packsCatalog = signal<Map<string, PackEntry>>(new Map());
  readonly cyberwareSuitesCatalog = signal<CyberwareSuiteEntry[]>([]);
  readonly pendingGrantLabel = signal('');

  readonly derivedStats = computed((): DerivedStats | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return deriveStats(character, manager, {
      moreLethalGameplay: this.options().moreLethalGameplay,
    });
  });

  readonly bpBreakdown = computed((): BpBreakdown | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return calculateBp(character, manager, this.options(), this.qualityCatalog());
  });

  readonly nuyenBreakdown = computed((): NuyenBreakdown | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return calculateNuyen(character, manager, this.options());
  });

  readonly maxNuyenBp = computed((): number => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return 0;
    return getMaxNuyenBp(character, manager, this.options());
  });

  readonly freeKnowledgeSkillPoints = computed((): number => {
    this.revision();
    const character = this.character();
    if (!character) return 0;
    return getFreeKnowledgeSkillPoints(character, this.options());
  });

  readonly essenceBreakdown = computed((): EssenceBreakdown | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return calculateEssence(character, manager);
  });

  readonly validation = computed((): ValidationResult | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return validateCharacter({
      character,
      manager,
      options: this.options(),
      qualityCatalog: this.qualityCatalog(),
      availabilityItems: collectAllAvailabilityItems(character),
    });
  });

  readonly powerPointBreakdown = computed((): { pool: number; used: number; remaining: number } | null => {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return null;
    return {
      pool: getAdeptPowerPointPool(character, manager),
      used: calculatePowerPointsUsed(character),
      remaining: calculatePowerPointRemaining(character, manager),
    };
  });

  async ensureInitialized(): Promise<void> {
    if (this.initialized()) return;

    const [settings, qualitiesDoc, metatypesDoc, skillsDoc, martialArtsDoc, gearDoc, weaponsDoc, armorDoc, cyberwareDoc, biowareDoc, spellsDoc, powersDoc, programsDoc, traditionsDoc, streamsDoc, metamagicDoc, vehiclesDoc, critterpowersDoc, lifestylesDoc, packsDoc] =
      await Promise.all([
      firstValueFrom(this.http.get<Partial<CharacterOptions>>('/data/settings/default.json')),
      this.data.loadDocument('qualities'),
      this.data.loadDocument('metatypes'),
      this.data.loadDocument('skills'),
      this.data.loadDocument('martialarts'),
      this.data.loadDocument('gear'),
      this.data.loadDocument('weapons'),
      this.data.loadDocument('armor'),
      this.data.loadDocument('cyberware'),
      this.data.loadDocument('bioware'),
      this.data.loadDocument('spells'),
      this.data.loadDocument('powers'),
      this.data.loadDocument('programs'),
      this.data.loadDocument('traditions'),
      this.data.loadDocument('streams'),
      this.data.loadDocument('metamagic'),
      this.data.loadDocument('vehicles'),
      this.data.loadDocument('critterpowers'),
      this.data.loadDocument('lifestyles'),
      firstValueFrom(this.http.get<{ packs?: PackEntry[] }>('/data/packs.json')),
    ]);

    this.options.set(loadCharacterOptions(settings));
    const qualities = (qualitiesDoc as { qualities: Array<{ name: string; bp?: string; category?: string[]; bonus?: BonusNode }> })
      .qualities ?? [];

    this.qualityCatalog.set(buildQualityCatalog(qualities));
    this.qualityRecords.set(new Map(qualities.map((q) => [q.name, q])));
    this.metatypes.set(
      (metatypesDoc as { metatypes: MetatypeRecord[] }).metatypes ?? [],
    );

    const skillsData = skillsDoc as {
      skills?: Array<{ name: string; skillgroup?: string; category?: string[]; default?: string; specs?: string[] }>;
      knowledgeskills?: Array<{ name: string; category?: string[]; specs?: string[] }>;
      skillgroups?: Array<{ name: string } | string>;
    };
    this.skillCatalog.set(
      (skillsData.skills ?? []).map((skill) => ({
        name: skill.name,
        skillGroup: skill.skillgroup,
        skillCategory: Array.isArray(skill.category) ? skill.category[0] : undefined,
        default: skill.default,
        specs: skill.specs,
      })),
    );
    this.knowledgeCatalog.set(
      (skillsData.knowledgeskills ?? []).map((skill) => ({
        name: skill.name,
        skillCategory: Array.isArray(skill.category) ? skill.category[0] : undefined,
        specs: skill.specs,
      })),
    );
    this.skillGroupNames.set(
      (skillsData.skillgroups ?? []).map((group) =>
        typeof group === 'string' ? group : group.name,
      ),
    );

    const martialData = martialArtsDoc as {
      martialarts?: Array<{ name: string; source?: string; page?: string }>;
      maneuvers?: Array<{ name: string; source?: string; page?: string }>;
    };
    this.martialArtCatalog.set(martialData.martialarts ?? []);
    this.maneuverCatalog.set(martialData.maneuvers ?? []);

    this.gearCatalog.set(this.buildCatalogMap(extractCollection(gearDoc['gears']) as ChummerItem[]));
    this.weaponCatalog.set(this.buildCatalogMap(extractCollection(weaponsDoc['weapons']) as ChummerItem[]));
    this.armorCatalog.set(this.buildCatalogMap(extractCollection(armorDoc['armors']) as ChummerItem[]));
    this.weaponAccessoryCatalog.set(
      this.buildCatalogMap(extractCollection(weaponsDoc['accessories']) as ChummerItem[]),
    );
    this.weaponModCatalog.set(
      this.buildCatalogMap(extractCollection((weaponsDoc['mods'] as { mod?: unknown })?.mod) as ChummerItem[]),
    );
    this.armorModCatalog.set(
      this.buildCatalogMap(
        extractCollection(armorDoc['mods']).flatMap((entry) =>
          extractCollection((entry as { mod?: unknown }).mod),
        ) as ChummerItem[],
      ),
    );

    this.cyberwareCatalog.set(
      this.buildWareCatalogMap(extractCollection(cyberwareDoc['cyberwares']) as ChummerItem[]),
    );
    this.biowareCatalog.set(
      this.buildWareCatalogMap(extractCollection(biowareDoc['biowares']) as ChummerItem[]),
    );
    this.cyberwareGrades.set(this.buildGradeMap(cyberwareDoc as { grades?: WareGrade[] }));
    this.biowareGrades.set(this.buildGradeMap(biowareDoc as { grades?: WareGrade[] }));

    this.spellCatalog.set(this.buildCatalogMap(extractCollection(spellsDoc['spells']) as ChummerItem[]));
    this.powerCatalog.set(this.buildCatalogMap(extractCollection(powersDoc['powers']) as ChummerItem[]));
    this.programCatalog.set(this.buildCatalogMap(extractCollection(programsDoc['programs']) as ChummerItem[]));
    this.metamagicCatalog.set(
      this.buildCatalogMap(extractCollection(metamagicDoc['metamagics']) as ChummerItem[]),
    );
    this.traditionCatalog.set(
      (traditionsDoc as { traditions?: TraditionEntry[] }).traditions ?? [],
    );
    this.streamCatalog.set(
      (streamsDoc as { traditions?: TraditionEntry[] }).traditions ?? [],
    );
    this.vehicleCatalog.set(
      this.buildCatalogMap(extractCollection(vehiclesDoc['vehicles']) as ChummerItem[]),
    );
    this.vehicleModCatalog.set(
      this.buildCatalogMap(
        extractCollection(vehiclesDoc['mods']).flatMap((entry) =>
          extractCollection((entry as { mod?: unknown }).mod),
        ) as ChummerItem[],
      ),
    );
    this.critterPowerCatalog.set(
      this.buildCatalogMap(extractCollection(critterpowersDoc['powers']) as ChummerItem[]),
    );
    this.lifestyleCatalog.set(
      this.buildCatalogMap(extractCollection(lifestylesDoc['lifestyles']) as ChummerItem[]),
    );
    this.packsCatalog.set(
      new Map((packsDoc.packs ?? []).map((pack) => [pack.name, pack])),
    );
    this.cyberwareSuitesCatalog.set(
      (cyberwareDoc as { suites?: CyberwareSuiteEntry[] }).suites ?? [],
    );

    this.initialized.set(true);
    await this.refreshCharacterList();
  }

  async refreshCharacterList(): Promise<void> {
    this.characterList.set(await this.storage.listCharacters());
  }

  createNewCharacter(overrides: Partial<Character> = {}): void {
    const options = this.options();
    const character = createEmptyCharacter({
      id: overrides.id ?? createCharacterId(),
      buildPoints: options.buildPoints,
      buildKarma: options.buildKarma,
      maximumAvailability: options.maximumAvailability,
      ...overrides,
    });
    this.manager = new ImprovementManager(character);
    this.character.set(character);
    this.reopenedByEdit.set(false);
    this.clearGrantState();
    this.bump();
    this.scheduleAutoSave();
  }

  setOptions(next: CharacterOptions): void {
    this.options.set(loadCharacterOptions(next));
    const character = this.character();
    if (character) {
      character.buildPoints = this.options().buildPoints;
      character.buildKarma = this.options().buildKarma;
      character.maximumAvailability = this.options().maximumAvailability;
      this.afterEdit(character);
    } else {
      this.bump();
    }
  }

  async openCharacter(id: string): Promise<boolean> {
    const stored = await this.storage.loadCharacter(id);
    if (!stored) return false;

    const character = deserializeCharacter(stored);
    repairEnabledSpecialAttributes(character);
    this.manager = new ImprovementManager(character);
    this.character.set(character);
    this.reopenedByEdit.set(false);
    this.clearGrantState();
    this.bump();
    return true;
  }

  async saveCurrentCharacter(): Promise<void> {
    const character = this.character();
    if (!character) return;

    const existing = await this.storage.loadCharacter(character.id);
    const document = this.storage.buildDocument(character, existing);
    await this.storage.saveCharacter(document);
    await this.refreshCharacterList();
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.storage.deleteCharacter(id);
    if (this.character()?.id === id) {
      this.character.set(null);
      this.manager = null;
    }
    await this.refreshCharacterList();
  }

  async importChumFile(file: File): Promise<ChumImportResult> {
    const xml = await file.text();
    const result = parseChumXml(xml);
    this.loadImportedCharacter(result);
    await this.saveCurrentCharacter();
    return result;
  }

  initializeMetatype(metatypeName: string, metavariantName?: string): void {
    const character = createEmptyCharacter({
      id: this.character()?.id ?? createCharacterId(),
      name: this.character()?.name ?? '',
      buildPoints: this.options().buildPoints,
      maximumAvailability: this.options().maximumAvailability,
      profile: { ...(this.character()?.profile ?? {}) },
    });
    const manager = new ImprovementManager(character);

    const qualities = [...this.qualityRecords().values()];

    initializeMetatype(character, manager, {
      metatypeName,
      metavariantName,
      metatypes: this.metatypes(),
      qualities,
      options: this.options(),
    });

    this.manager = manager;
    this.character.set(touchCharacter(character));
    this.clearGrantState();
    this.bump();
    this.scheduleAutoSave();
  }

  setCharacterName(name: string): void {
    const character = this.character();
    if (!character) return;
    character.name = name;
    this.afterEdit(character);
  }

  setMetavariant(metavariantName: string | undefined): void {
    const character = this.character();
    if (!character) return;
    this.initializeMetatype(
      character.metatype,
      metavariantName && metavariantName !== 'None' ? metavariantName : undefined,
    );
  }

  getMetavariantsForCurrentMetatype(): Array<{ name: string; bp?: string }> {
    const character = this.character();
    if (!character) return [];
    return listMetavariants(this.metatypes(), character.metatype);
  }

  setNuyenBpSpent(value: number): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    const max = getMaxNuyenBp(character, manager, this.options());
    character.nuyenBpSpent = Math.min(Math.max(0, Math.floor(value)), max);
    this.afterEdit(character);
  }

  setBuildPoints(value: number): void {
    const character = this.character();
    if (!character) return;
    character.buildPoints = Math.max(0, Math.floor(value));
    this.afterEdit(character);
  }

  setMaximumAvailability(value: number): void {
    const character = this.character();
    if (!character) return;
    character.maximumAvailability = Math.max(0, Math.floor(value));
    this.afterEdit(character);
  }

  updateProfile(profile: Partial<CharacterProfile>): void {
    const character = this.character();
    if (!character) return;
    character.profile = { ...character.profile, ...profile };
    this.afterEdit(character);
  }

  syncContacts(contacts: CharacterContact[]): void {
    const character = this.character();
    if (!character) return;

    const normalized = contacts.map((contact) => ({
      name: contact.name,
      connection: Math.max(0, Math.floor(contact.connection)),
      loyalty: Math.max(0, Math.floor(contact.loyalty)),
      group: Math.max(0, Math.floor(contact.group)),
      free: contact.free ?? false,
      enemy: contact.enemy ?? false,
    }));

    if (this.contactsEqual(character.contacts, normalized)) return;

    character.contacts = normalized;
    this.afterEdit(character);
  }

  syncActiveSkills(skills: CharacterSkill[]): void {
    const character = this.character();
    if (!character) return;

    const normalized = skills.map((skill) => {
      const max = getSkillRatingMaximum(character, skill);
      return {
        ...skill,
        rating: Math.min(Math.max(0, Math.floor(skill.rating)), max),
        specialization: skill.specialization?.trim() || undefined,
        knowledge: false as const,
      };
    });

    if (this.activeSkillsEqual(character.skills, normalized)) return;

    character.skills = normalized;
    syncSkillGrouping(character);
    this.afterEdit(character);
  }

  syncKnowledgeSkills(skills: CharacterSkill[]): void {
    const character = this.character();
    if (!character) return;

    const normalized = skills.map((skill) => {
      const max = skill.ratingMax ?? 6;
      return {
        ...skill,
        rating: Math.min(Math.max(0, Math.floor(skill.rating)), max),
        specialization: skill.specialization?.trim() || undefined,
        knowledge: true as const,
      };
    });

    if (this.knowledgeSkillsEqual(character.knowledgeSkills, normalized)) return;

    character.knowledgeSkills = normalized;
    this.afterEdit(character);
  }

  syncSkillGroups(groups: CharacterSkillGroup[]): void {
    const character = this.character();
    if (!character) return;

    const normalized = groups.map((group) => {
      const max = group.ratingMax ?? 6;
      return {
        ...group,
        rating: Math.min(Math.max(0, Math.floor(group.rating)), max),
      };
    });

    if (this.skillGroupsEqual(character.skillGroups, normalized)) return;

    character.skillGroups = normalized;
    syncSkillGrouping(character);
    this.afterEdit(character);
  }

  syncMartialArts(arts: CharacterMartialArt[]): void {
    const character = this.character();
    if (!character) return;

    const normalized = arts.map((art) => ({
      ...art,
      rating: Math.min(Math.max(1, Math.floor(art.rating)), 6),
    }));

    if (this.martialArtsEqual(character.martialArts, normalized)) return;

    character.martialArts = normalized;
    this.afterEdit(character);
  }

  addContact(contact: CharacterContact = {
    name: '',
    connection: 1,
    loyalty: 1,
    group: 0,
  }): void {
    const character = this.character();
    if (!character) return;
    character.contacts.push({ ...contact });
    this.afterEdit(character);
  }

  updateContact(index: number, contact: Partial<CharacterContact>): void {
    const character = this.character();
    if (!character || index < 0 || index >= character.contacts.length) return;
    character.contacts[index] = { ...character.contacts[index], ...contact };
    this.afterEdit(character);
  }

  removeContact(index: number): void {
    const character = this.character();
    if (!character || index < 0 || index >= character.contacts.length) return;
    character.contacts.splice(index, 1);
    this.afterEdit(character);
  }

  addActiveSkill(skill: CharacterSkill): void {
    const character = this.character();
    if (!character) return;
    if (character.skills.some((entry) => entry.name === skill.name)) return;
    character.skills.push({ ...skill, knowledge: false });
    this.afterEdit(character);
  }

  setActiveSkillRating(skillName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return;
    const max = getSkillRatingMaximum(character, skill);
    skill.rating = Math.min(Math.max(0, Math.floor(rating)), max);
    syncSkillGrouping(character);
    this.afterEdit(character);
  }

  setActiveSkillSpec(skillName: string, specialization: string): void {
    const character = this.character();
    if (!character) return;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return;
    skill.specialization = specialization.trim() || undefined;
    this.afterEdit(character);
  }

  addActiveSkillFromCatalog(skillName: string): void {
    const catalogSkill = this.skillCatalog().find((entry) => entry.name === skillName);
    if (!catalogSkill) return;

    this.addActiveSkill({
      name: catalogSkill.name,
      rating: 0,
      skillGroup: catalogSkill.skillGroup,
      skillCategory: catalogSkill.skillCategory,
      defaultSkill: catalogSkill.default?.toLowerCase() === 'yes',
      knowledge: false,
    });
  }

  removeActiveSkill(skillName: string): void {
    const character = this.character();
    if (!character) return;
    character.skills = character.skills.filter((entry) => entry.name !== skillName);
    this.afterEdit(character);
  }

  addKnowledgeSkill(skill: CharacterSkill): void {
    const character = this.character();
    if (!character) return;
    if (character.knowledgeSkills.some((entry) => entry.name === skill.name)) return;
    character.knowledgeSkills.push({ ...skill, knowledge: true });
    this.afterEdit(character);
  }

  setKnowledgeSkillRating(skillName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const skill = character.knowledgeSkills.find((entry) => entry.name === skillName);
    if (!skill) return;
    const max = skill.ratingMax ?? 6;
    skill.rating = Math.min(Math.max(0, Math.floor(rating)), max);
    this.afterEdit(character);
  }

  setKnowledgeSkillSpec(skillName: string, specialization: string): void {
    const character = this.character();
    if (!character) return;
    const skill = character.knowledgeSkills.find((entry) => entry.name === skillName);
    if (!skill) return;
    skill.specialization = specialization.trim() || undefined;
    this.afterEdit(character);
  }

  addKnowledgeSkillFromCatalog(skillName: string): void {
    const catalogSkill = this.knowledgeCatalog().find((entry) => entry.name === skillName);
    if (!catalogSkill) return;

    this.addKnowledgeSkill({
      name: catalogSkill.name,
      rating: 0,
      skillCategory: catalogSkill.skillCategory,
      knowledge: true,
    });
  }

  addSkillGroup(groupName: string): void {
    const character = this.character();
    if (!character) return;
    if (character.skillGroups.some((group) => group.name === groupName)) return;
    character.skillGroups.push({ name: groupName, rating: 0 });
    this.afterEdit(character);
  }

  setSkillGroupRating(groupName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const group = character.skillGroups.find((entry) => entry.name === groupName);
    if (!group) return;
    const max = group.ratingMax ?? 6;
    group.rating = Math.min(Math.max(0, Math.floor(rating)), max);
    syncSkillGrouping(character);
    this.afterEdit(character);
  }

  removeSkillGroup(groupName: string): void {
    const character = this.character();
    if (!character) return;
    character.skillGroups = character.skillGroups.filter((group) => group.name !== groupName);
    syncSkillGrouping(character);
    this.afterEdit(character);
  }

  addMartialArt(art: CharacterMartialArt): void {
    const character = this.character();
    if (!character) return;
    if (character.martialArts.some((entry) => entry.name === art.name)) return;
    character.martialArts.push({ ...art, rating: art.rating || 1 });
    this.afterEdit(character);
  }

  setMartialArtRating(artName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const art = character.martialArts.find((entry) => entry.name === artName);
    if (!art) return;
    art.rating = Math.min(Math.max(1, Math.floor(rating)), 6);
    this.afterEdit(character);
  }

  removeMartialArt(artName: string): void {
    const character = this.character();
    if (!character) return;
    character.martialArts = character.martialArts.filter((art) => art.name !== artName);
    this.afterEdit(character);
  }

  addMartialArtManeuver(name: string, source?: string, page?: string): void {
    const character = this.character();
    if (!character) return;
    if (character.martialArtManeuvers.some((entry) => entry.name === name)) return;
    character.martialArtManeuvers.push({
      id: createCharacterId(),
      name,
      source,
      page,
    });
    this.afterEdit(character);
  }

  removeMartialArtManeuver(maneuverId: string): void {
    const character = this.character();
    if (!character) return;
    character.martialArtManeuvers = character.martialArtManeuvers.filter(
      (maneuver) => maneuver.id !== maneuverId,
    );
    this.afterEdit(character);
  }

  addGear(name: string, rating = 1): void {
    const entry = this.gearCatalog().get(name);
    if (!entry) return;
    this.addTopLevelStreetItem('gear', entry, rating);
  }

  addWeapon(name: string): void {
    const entry = this.weaponCatalog().get(name);
    if (!entry) return;
    this.addTopLevelStreetItem('weapons', entry, 0);
  }

  addArmor(name: string): void {
    const entry = this.armorCatalog().get(name);
    if (!entry) return;
    this.addTopLevelStreetItem('armors', entry, 0);
  }

  addWeaponAccessory(weaponId: string, accessoryName: string): void {
    const character = this.character();
    if (!character) return;
    const weapon = findStreetItem(character, 'weapons', weaponId);
    const entry = this.weaponAccessoryCatalog().get(accessoryName);
    if (!weapon || !entry) return;
    if (weapon.children.some((child) => child.name === accessoryName)) return;

    weapon.children.push(
      createStreetItemFromCatalog(entry, {
        kind: 'accessory',
        parentCost: weapon.cost,
      }),
    );
    this.commitStreetGear(character);
  }

  addWeaponMod(weaponId: string, modName: string, rating = 1): void {
    const character = this.character();
    if (!character) return;
    const weapon = findStreetItem(character, 'weapons', weaponId);
    const entry = this.weaponModCatalog().get(modName);
    if (!weapon || !entry) return;
    if (weapon.children.some((child) => child.name === modName)) return;

    weapon.children.push(
      createStreetItemFromCatalog(entry, {
        kind: 'weapon-mod',
        rating: isRatedCatalogEntry(entry) ? rating : undefined,
        parentCost: weapon.cost,
      }),
    );
    this.commitStreetGear(character);
  }

  addArmorMod(armorId: string, modName: string, rating = 1): void {
    const character = this.character();
    if (!character) return;
    const armor = findStreetItem(character, 'armors', armorId);
    const entry = this.armorModCatalog().get(modName);
    if (!armor || !entry) return;
    if (armor.children.some((child) => child.name === modName)) return;

    armor.children.push(
      createStreetItemFromCatalog(entry, {
        kind: 'armor-mod',
        rating: isRatedCatalogEntry(entry) ? rating : undefined,
      }),
    );
    this.commitStreetGear(character);
  }

  setStreetItemRating(
    container: 'gear' | 'weapons' | 'armors',
    id: string,
    rating: number,
  ): void {
    const character = this.character();
    if (!character) return;
    const item = findStreetItem(character, container, id);
    if (!item) return;

    const catalog = this.catalogForItem(item);
    if (!catalog) return;

    const refreshed = refreshStreetItemFromCatalog(item, catalog, {
      rating,
      parentCost: container === 'weapons' ? item.cost : undefined,
    });
    Object.assign(item, refreshed);
    this.commitStreetGear(character);
  }

  removeStreetItem(container: 'gear' | 'weapons' | 'armors', id: string): void {
    const character = this.character();
    if (!character) return;
    character[container] = removeStreetItemFromList(character[container], id);
    this.commitStreetGear(character);
  }

  setMagicTradition(name: string): void {
    const character = this.character();
    if (!character) return;
    character.magicTradition = name;
    this.commitCharacter(character);
  }

  setTechnomancerStream(name: string): void {
    const character = this.character();
    if (!character) return;
    character.technomancerStream = name;
    this.commitCharacter(character);
  }

  setMagAdept(value: number): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;
    const maxMag = getAttributeTotal(character, 'MAG');
    character.magAdept = Math.min(Math.max(0, Math.floor(value)), maxMag);
    this.commitCharacter(character);
  }

  getSpellLimit(): number {
    this.revision();
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) return 0;
    return getSpellLimit(character, manager);
  }

  addSpell(name: string, options: { limited?: boolean; extended?: boolean } = {}): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    if (character.spells.some((spell) => spell.name === name)) return;

    if (!character.ignoreRules) {
      const limit = getSpellLimit(character, manager);
      if (character.spells.length >= limit) return;
    }

    const entry = this.spellCatalog().get(name);
    const category = entry
      ? Array.isArray(entry.category)
        ? String(entry.category[0] ?? '')
        : String(entry.category ?? '')
      : '';

    character.spells.push(
      createSpell(name, category, {
        limited: options.limited ?? false,
        extended: options.extended ?? false,
      }),
    );
    this.commitCharacter(character);
  }

  setSpellFlags(
    id: string,
    flags: { limited?: boolean; extended?: boolean },
  ): void {
    const character = this.character();
    if (!character) return;

    const spell = character.spells.find((entry) => entry.id === id);
    if (!spell) return;

    if (flags.limited !== undefined) spell.limited = flags.limited;
    if (flags.extended !== undefined) spell.extended = flags.extended;
    this.commitCharacter(character);
  }

  removeSpell(id: string): void {
    const character = this.character();
    if (!character) return;
    character.spells = character.spells.filter((spell) => spell.id !== id);
    this.commitCharacter(character);
  }

  addPower(name: string, rating = 1): boolean {
    return this.applyAdeptPower(name, rating);
  }

  applyAdeptPower(
    name: string,
    rating = 1,
    forcedSelections?: Record<string, string>,
  ): boolean {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return false;

    const entry = this.powerCatalog().get(name);
    if (!entry) return false;

    if (character.powers.some((power) => power.name === name)) return false;

    const powerId = createCharacterId();
    const effectiveRating = Math.max(1, Math.floor(rating));

    if (!entry.bonus) {
      character.powers.push(createPowerFromCatalog(entry, effectiveRating, { id: powerId }));
      this.commitCharacter(character);
      return true;
    }

    const bonus = entry.bonus as BonusNode;

    if (!this.hasInteractiveBonus(bonus)) {
      const power = createPowerFromCatalog(entry, effectiveRating, { id: powerId });
      manager.beginTransaction();
      try {
        applyBonusHandlers(bonus, {
          character: manager.getCharacter(),
          manager,
          source: ImprovementSource.Power,
          sourceName: powerId,
          rating: power.rating || 1,
          uniqueName: '',
        });
      } catch {
        manager.rollback();
        return false;
      }
      manager.commit();
      character.powers.push(power);
      this.commitCharacter(character);
      return true;
    }

    this.grantInProgress.set(true);
    this.pendingGrantKind = 'power';
    this.pendingPowerName = name;
    this.pendingPowerRating = effectiveRating;
    this.pendingPowerId = powerId;
    this.pendingGrantLabel.set(name);

    const { result, session } = grantBonus(manager, {
      source: ImprovementSource.Power,
      sourceName: powerId,
      bonus,
      rating: effectiveRating,
      forcedSelections,
    });

    this.grantSession = session;

    if (result.status === 'pending' && result.pending) {
      this.pendingSelection.set(result.pending);
    } else if (result.status === 'complete') {
      this.completePowerGrant();
    }

    return true;
  }

  powerRequiresSelection(name: string): boolean {
    const entry = this.powerCatalog().get(name);
    if (!entry?.bonus) return false;
    return this.hasInteractiveBonus(entry.bonus as BonusNode);
  }

  setPowerRating(id: string, rating: number): void {
    const character = this.character();
    if (!character) return;

    const power = character.powers.find((entry) => entry.id === id);
    if (!power || !power.levels) return;

    const refreshed = refreshPowerPoints({ ...power, rating: Math.max(1, Math.floor(rating)) });
    Object.assign(power, refreshed);
    this.commitCharacter(character);
  }

  removePower(id: string): void {
    const character = this.character();
    if (!character) return;

    this.stripPowerImprovements(id);
    character.powers = character.powers.filter((power) => power.id !== id);
    this.commitCharacter(character);
  }

  addProgram(name: string, rating = 1): void {
    const character = this.character();
    if (!character) return;

    const entry = this.programCatalog().get(name);
    if (!entry) return;
    if (character.programs.some((program) => program.name === name)) return;

    character.programs.push(createProgramFromCatalog(entry, rating));
    this.commitCharacter(character);
  }

  setProgramRating(id: string, rating: number): void {
    const character = this.character();
    if (!character) return;

    const program = character.programs.find((entry) => entry.id === id);
    const entry = program ? this.programCatalog().get(program.name) : undefined;
    if (!program || !entry) return;

    const refreshed = createProgramFromCatalog(entry, rating, {
      id: program.id,
      extra: program.extra,
    });
    Object.assign(program, refreshed);
    this.commitCharacter(character);
  }

  removeProgram(id: string): void {
    const character = this.character();
    if (!character) return;
    character.programs = character.programs.filter((program) => program.id !== id);
    this.commitCharacter(character);
  }

  addProgramOption(programId: string, name: string, rating = 0): void {
    const character = this.character();
    if (!character) return;

    const program = character.programs.find((entry) => entry.id === programId);
    if (!program) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    program.options ??= [];
    if (program.options.some((option) => option.name === trimmed)) return;

    program.options.push({
      id: createCharacterId(),
      name: trimmed,
      rating: Math.max(0, Math.floor(rating)),
    });
    this.commitCharacter(character);
  }

  removeProgramOption(programId: string, optionId: string): void {
    const character = this.character();
    if (!character) return;

    const program = character.programs.find((entry) => entry.id === programId);
    if (!program?.options?.length) return;

    program.options = program.options.filter((option) => option.id !== optionId);
    this.commitCharacter(character);
  }

  addMetamagic(name: string): void {
    const character = this.character();
    if (!character) return;
    if (character.metamagics.some((entry) => entry.name === name)) return;

    const entry = this.metamagicCatalog().get(name);
    character.metamagics.push(
      createMetamagic(name, false),
    );
    if (entry?.source) {
      const added = character.metamagics[character.metamagics.length - 1];
      added.source = String(entry.source);
      if (entry.page !== undefined) added.page = String(entry.page);
    }
    this.commitCharacter(character);
  }

  removeMetamagic(id: string): void {
    const character = this.character();
    if (!character) return;
    character.metamagics = character.metamagics.filter((entry) => entry.id !== id);
    this.commitCharacter(character);
  }

  addInitiationGrade(options: { group?: boolean; ordeal?: boolean } = {}): void {
    const character = this.character();
    if (!character) return;

    const grade = character.initiationGrades.length + 1;
    character.initiationGrades.push(
      createInitiationGrade(grade, {
        group: options.group ?? false,
        ordeal: options.ordeal ?? false,
        technomancer: character.flags.resEnabled,
      }),
    );
    this.commitCharacter(character);
  }

  removeInitiationGrade(id: string): void {
    const character = this.character();
    if (!character) return;

    character.initiationGrades = character.initiationGrades
      .filter((grade) => grade.id !== id)
      .map((grade, index) => ({ ...grade, grade: index + 1 }));
    this.commitCharacter(character);
  }

  addCritterPower(name: string): void {
    const character = this.character();
    if (!character) return;
    if (character.critterPowers.some((power) => power.name === name)) return;
    if (!this.critterPowerCatalog().has(name)) return;

    character.critterPowers.push(createCritterPower(name));
    this.commitCharacter(character);
  }

  removeCritterPower(id: string): void {
    const character = this.character();
    if (!character) return;
    character.critterPowers = character.critterPowers.filter((power) => power.id !== id);
    this.commitCharacter(character);
  }

  addSpirit(name: string, force = 1, servicesOwed = 0, sprite = false): void {
    const character = this.character();
    if (!character) return;
    character.spirits.push(
      createSpirit(name, {
        force: Math.max(1, Math.floor(force)),
        servicesOwed: Math.max(0, Math.floor(servicesOwed)),
        sprite,
      }),
    );
    this.commitCharacter(character);
  }

  removeSpirit(id: string): void {
    const character = this.character();
    if (!character) return;
    character.spirits = character.spirits.filter((spirit) => spirit.id !== id);
    this.commitCharacter(character);
  }

  addFocus(name: string, rating = 1, bonded = true): void {
    const character = this.character();
    if (!character) return;
    character.foci.push(createFocus(name, rating, { bonded }));
    this.commitCharacter(character);
  }

  removeFocus(id: string): void {
    const character = this.character();
    if (!character) return;
    character.foci = character.foci.filter((focus) => focus.id !== id);
    this.commitCharacter(character);
  }

  addLifestyle(lifestyle: CharacterLifestyle): void {
    const character = this.character();
    if (!character) return;
    character.lifestyles.push({ ...lifestyle });
    this.commitCharacter(character);
  }

  addLifestyleFromCatalog(name: string, months = 1): void {
    const entry = this.lifestyleCatalog().get(name);
    if (!entry) return;

    const cost = Array.isArray(entry.cost)
      ? Number(entry.cost[0] ?? 0)
      : Number(entry.cost ?? 0);

    this.addLifestyle(createLifestyle(name, Number.isFinite(cost) ? cost : 0, { months }));
  }

  removeLifestyle(id: string): void {
    const character = this.character();
    if (!character) return;
    character.lifestyles = character.lifestyles.filter((lifestyle) => lifestyle.id !== id);
    this.commitCharacter(character);
  }

  addPet(name: string): void {
    const character = this.character();
    if (!character) return;
    character.pets.push(createPet(name));
    this.commitCharacter(character);
  }

  removePet(id: string): void {
    const character = this.character();
    if (!character) return;
    character.pets = character.pets.filter((pet) => pet.id !== id);
    this.commitCharacter(character);
  }

  applyPack(name: string): ApplyPackResult {
    const pack = this.packsCatalog().get(name);
    const character = this.character();
    const manager = this.manager;
    const applied: string[] = [];
    const errors: string[] = [];

    if (!pack) {
      return { ok: false, applied, errors: ['Pack not found'] };
    }
    if (!character || !manager) {
      return { ok: false, applied, errors: ['No character loaded'] };
    }

    if (pack.attributes) {
      for (const [key, value] of Object.entries(pack.attributes)) {
        const code = key.toUpperCase() as AttributeCode;
        if (!(code in character.attributes)) {
          errors.push(`Unknown attribute: ${key}`);
          continue;
        }
        this.setAttributeBase(code, Number(value));
        applied.push(`Attribute ${code}`);
      }
    }

    const skillEntries = this.normalizePackSkills(pack.skills);
    for (const skillEntry of skillEntries) {
      if (!character.skills.some((skill) => skill.name === skillEntry.name)) {
        this.addActiveSkillFromCatalog(skillEntry.name);
      }
      if (character.skills.some((skill) => skill.name === skillEntry.name)) {
        this.setActiveSkillRating(skillEntry.name, skillEntry.rating);
        if (skillEntry.spec) {
          this.setActiveSkillSpec(skillEntry.name, skillEntry.spec);
        }
        applied.push(`Skill ${skillEntry.name}`);
      } else {
        errors.push(`Skill ${skillEntry.name}`);
      }
    }

    for (const spellName of pack.spells ?? []) {
      if (character.spells.some((spell) => spell.name === spellName)) continue;
      this.addSpell(spellName);
      applied.push(`Spell ${spellName}`);
    }

    for (const powerEntry of pack.powers ?? []) {
      const parsed = this.parsePackPowerEntry(powerEntry);
      if (this.applyAdeptPower(parsed.name, parsed.rating, parsed.forcedSelections)) {
        applied.push(`Power ${parsed.name}`);
      } else {
        errors.push(`Power ${parsed.name}`);
      }
    }

    for (const gearEntry of pack.gears ?? []) {
      const gearName = this.resolvePackItemName(gearEntry.name);
      const entry = this.gearCatalog().get(gearName);
      if (!entry) {
        errors.push(`Gear ${gearName}`);
        continue;
      }
      const rating = Number(gearEntry.rating ?? 1);
      this.addGear(gearName, Number.isFinite(rating) ? rating : 1);
      applied.push(`Gear ${gearName}`);
    }

    for (const weaponEntry of pack.weapons ?? []) {
      if (this.weaponCatalog().has(weaponEntry.name)) {
        this.addWeapon(weaponEntry.name);
        applied.push(`Weapon ${weaponEntry.name}`);
      } else {
        errors.push(`Weapon ${weaponEntry.name}`);
      }
    }

    for (const armorEntry of pack.armors ?? []) {
      if (this.armorCatalog().has(armorEntry.name)) {
        this.addArmor(armorEntry.name);
        applied.push(`Armor ${armorEntry.name}`);
      } else {
        errors.push(`Armor ${armorEntry.name}`);
      }
    }

    if (pack.nuyenbp) {
      const extra = Number(pack.nuyenbp);
      if (Number.isFinite(extra)) {
        this.setNuyenBpSpent(character.nuyenBpSpent + extra);
        applied.push('Nuyen BP');
      }
    }

    return { ok: errors.length === 0, applied, errors };
  }

  applyCyberwareSuite(name: string): ApplyCyberwareSuiteResult {
    const suite = this.cyberwareSuitesCatalog().find((entry) => entry.name === name);
    const installed: string[] = [];
    const errors: string[] = [];

    if (!suite) {
      return { ok: false, installed, errors: ['Suite not found'] };
    }

    const grade = Array.isArray(suite.grade)
      ? String(suite.grade[0] ?? 'Standard')
      : String(suite.grade ?? 'Standard');

    for (const item of suite.cyberwares ?? []) {
      const rating = item.rating ? Number(item.rating) : 1;
      const result = this.installWare(
        'cyberware',
        item.name,
        grade,
        Number.isFinite(rating) ? rating : 1,
      );
      if (result.ok) {
        installed.push(item.name);
      } else {
        errors.push(`${item.name} (${result.reason})`);
      }
    }

    return { ok: errors.length === 0, installed, errors };
  }

  addVehicle(name: string): void {
    const character = this.character();
    if (!character) return;

    const entry = this.vehicleCatalog().get(name);
    if (!entry) return;

    character.vehicles.push(createVehicleFromCatalog(entry));
    this.commitCharacter(character);
  }

  removeVehicle(id: string): void {
    const character = this.character();
    if (!character) return;
    character.vehicles = character.vehicles.filter((vehicle) => vehicle.id !== id);
    this.commitCharacter(character);
  }

  addVehicleMod(vehicleId: string, modName: string, rating = 1): void {
    const character = this.character();
    if (!character) return;

    const vehicle = character.vehicles.find((entry) => entry.id === vehicleId);
    const entry = this.vehicleModCatalog().get(modName);
    if (!vehicle || !entry) return;
    if (vehicle.mods.some((mod) => mod.name === modName)) return;

    vehicle.mods.push(createVehicleModFromCatalog(entry, rating));
    this.commitCharacter(character);
  }

  removeVehicleMod(vehicleId: string, modId: string): void {
    const character = this.character();
    if (!character) return;

    const vehicle = character.vehicles.find((entry) => entry.id === vehicleId);
    if (!vehicle) return;

    vehicle.mods = vehicle.mods.filter((mod) => mod.id !== modId);
    this.commitCharacter(character);
  }

  finalizeCharacter(): ValidationResult {
    const manager = this.manager;
    const character = this.character();
    if (!manager || !character) {
      return { valid: false, issues: [{ code: 'no-character', message: 'No character loaded' }] };
    }

    if (character.created) {
      return { valid: true, issues: [] };
    }

    const validation = validateCharacter({
      character,
      manager,
      options: this.options(),
      qualityCatalog: this.qualityCatalog(),
      availabilityItems: collectAllAvailabilityItems(character),
    });

    if (!validation.valid) {
      return validation;
    }

    character.created = true;
    this.reopenedByEdit.set(false);
    this.character.set(touchCharacter(character));
    this.bump();
    void this.saveCurrentCharacter();
    return validation;
  }

  reopenCreation(): void {
    const character = this.character();
    if (!character?.created) return;

    character.created = false;
    this.reopenedByEdit.set(false);
    this.character.set(touchCharacter(character));
    this.bump();
    void this.saveCurrentCharacter();
  }

  exportCurrentChum(): string | null {
    const character = this.character();
    if (!character) return null;

    const qualityTypes = new Map<string, string>();
    for (const [name, entry] of this.qualityCatalog()) {
      if (isPositiveQuality(entry)) {
        qualityTypes.set(name, 'Positive');
      } else if (isNegativeQuality(entry)) {
        qualityTypes.set(name, 'Negative');
      }
    }

    return exportChumDocument(character, qualityTypes);
  }

  canInstallWare(kind: WareKind, name: string): RequirementResult {
    const character = this.character();
    if (!character) return { met: false, reason: 'No character' };
    const entry = this.wareCatalogFor(kind).get(name);
    if (!entry) return { met: false, reason: 'Not found' };
    return requirementsMet(entry, {
      character,
      ignoreRules: character.ignoreRules,
    });
  }

  installWare(
    kind: WareKind,
    name: string,
    grade = 'Standard',
    rating = 1,
    parentId?: string,
  ): InstallWareResult {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) {
      return { ok: false, reason: 'no-character' };
    }

    const entry = this.wareCatalogFor(kind).get(name);
    if (!entry) {
      return { ok: false, reason: 'not-found' };
    }

    const requirement = requirementsMet(entry, {
      character,
      ignoreRules: character.ignoreRules,
    });
    if (!requirement.met) {
      return { ok: false, reason: 'requirements' };
    }

    if (entry['limit'] !== 'no' && !parentId && characterHasWareByName(character, name)) {
      return { ok: false, reason: 'duplicate' };
    }

    const grades = this.gradesFor(kind);

    const item = createWareFromCatalog(entry, grades, manager, {
      kind,
      grade,
      rating: isRatedWareEntry(entry) ? rating : undefined,
      parentCapacity: parentId ? scalarCatalogValue(entry.capacity) : undefined,
    });

    const additionalCyber = kind === 'cyberware' ? item.essence : 0;
    const additionalBioware = kind === 'bioware' ? item.essence : 0;
    if (wouldExceedEssenceMinimum(character, manager, additionalCyber, additionalBioware)) {
      return { ok: false, reason: 'essence' };
    }

    if (parentId) {
      const parent = findWare(character, kind, parentId);
      if (!parent) {
        return { ok: false, reason: 'not-found' };
      }
      const capacityCost = parseCapacityCost(String(entry.capacity ?? '0'));
      const totalCapacity = calculateParentCapacityTotal(parent.capacity);
      if (
        totalCapacity > 0 &&
        calculateWareCapacityUsed(parent) + capacityCost > totalCapacity
      ) {
        return { ok: false, reason: 'capacity' };
      }
    }

    if (entry.bonus && this.hasInteractiveBonus(entry.bonus as BonusNode)) {
      return { ok: false, reason: 'interactive-bonus' };
    }

    manager.beginTransaction();
    if (entry.bonus && !this.applyWareBonuses(item, entry)) {
      manager.rollback();
      return { ok: false, reason: 'interactive-bonus' };
    }

    if (parentId) {
      const parent = findWare(character, kind, parentId);
      if (!parent) {
        manager.rollback();
        this.stripWareImprovements(item.id);
        return { ok: false, reason: 'not-found' };
      }
      parent.children.push(item);
    } else if (kind === 'cyberware') {
      character.cyberware.push(item);
    } else {
      character.bioware.push(item);
    }

    manager.commit();
    this.commitWare(character);
    return { ok: true };
  }

  removeWare(kind: WareKind, id: string): void {
    const character = this.character();
    if (!character) return;

    const item = findWare(character, kind, id);
    if (!item) return;

    this.removeWareTreeBonuses(item);
    if (kind === 'cyberware') {
      character.cyberware = removeWareFromList(character.cyberware, id);
    } else {
      character.bioware = removeWareFromList(character.bioware, id);
    }
    this.commitWare(character);
  }

  setWareGrade(kind: WareKind, id: string, grade: string): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    const item = findWare(character, kind, id);
    const entry = item ? this.wareCatalogFor(kind).get(item.name) : undefined;
    if (!item || !entry) return;

    this.stripWareImprovements(item.id);
    item.grade = grade;
    Object.assign(
      item,
      refreshWareFromCatalog(item, entry, this.gradesFor(kind), manager),
    );
    if (entry.bonus) {
      this.applyWareBonuses(item, entry);
    }
    this.commitWare(character);
  }

  setWareRating(kind: WareKind, id: string, rating: number): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    const item = findWare(character, kind, id);
    const entry = item ? this.wareCatalogFor(kind).get(item.name) : undefined;
    if (!item || !entry || !isRatedWareEntry(entry)) return;

    this.stripWareImprovements(item.id);
    item.rating = rating;
    Object.assign(
      item,
      refreshWareFromCatalog(item, entry, this.gradesFor(kind), manager),
    );
    if (entry.bonus) {
      this.applyWareBonuses(item, entry);
    }
    this.commitWare(character);
  }

  getAllowedWareGrades(kind: WareKind, name: string): string[] {
    const entry = this.wareCatalogFor(kind).get(name);
    if (!entry) return [];
    return getAllowedGrades(entry, this.gradesFor(kind));
  }

  getEffectiveSkillRating(skillName: string): number {
    this.revision();
    const character = this.character();
    if (!character) return 0;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return 0;
    return getEffectiveSkillRating(character, skill);
  }

  getSelectableSkillsForPendingSelection(): string[] {
    const selection = this.pendingSelection();
    const character = this.character();
    if (!selection || selection.kind !== 'skill' || !character) return [];

    const configNode = selection.config['selectskill'] as Record<string, unknown>;
    const config = parseSkillSelectionConfig(configNode);
    const catalog = this.skillCatalog().map((skill) => ({
      name: skill.name,
      skillGroup: skill.skillGroup,
      skillCategory: skill.skillCategory,
    }));
    const onCharacter = character.skills.map((skill) => ({
      name: skill.name,
      skillGroup: skill.skillGroup,
      skillCategory: skill.skillCategory,
    }));

    return listSelectableSkills(config, catalog, onCharacter);
  }

  getSelectableSkillGroupsForPendingSelection(): string[] {
    const selection = this.pendingSelection();
    if (!selection || selection.kind !== 'skill-group') return [];

    const configNode = selection.config['selectskillgroup'] as Record<string, unknown>;
    const config = parseSkillSelectionConfig(configNode);
    return listSelectableSkillGroups(config, this.skillGroupNames());
  }

  removeKnowledgeSkill(skillName: string): void {
    const character = this.character();
    if (!character) return;
    character.knowledgeSkills = character.knowledgeSkills.filter(
      (entry) => entry.name !== skillName,
    );
    this.afterEdit(character);
  }

  setAttributeBase(code: AttributeCode, value: number): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    const limits = getEffectiveLimits(character, code);
    const clamped = Math.min(Math.max(value, limits.min), limits.max);
    character.attributes[code].base = clamped;
    this.afterEdit(character);
  }

  /** Fix MAG/RES left at 0 after older Magician/Adept/Technomancer grants. */
  ensureSpecialAttributes(): void {
    const character = this.character();
    if (!character) return;
    if (repairEnabledSpecialAttributes(character)) {
      this.character.set(touchCharacter(character));
      this.bump();
      this.scheduleAutoSave();
    }
  }

  applyQuality(qualityName: string, bonus: BonusNode | null | undefined, rating = 1): void {
    const manager = this.manager;
    if (!manager || !bonus) return;

    if (!this.hasInteractiveBonus(bonus)) {
      applyQualityBonus(manager.getCharacter(), manager, qualityName, bonus, rating);
      this.addQualityName(qualityName);
      this.afterEdit(manager.getCharacter());
      return;
    }

    this.grantInProgress.set(true);
    this.pendingGrantKind = 'quality';
    this.pendingQualityName = qualityName;
    this.pendingGrantLabel.set(qualityName);

    const { result, session } = grantBonus(manager, {
      source: ImprovementSource.Quality,
      sourceName: qualityName,
      bonus,
      rating,
    });

    this.grantSession = session;

    if (result.status === 'pending' && result.pending) {
      this.pendingSelection.set(result.pending);
    } else if (result.status === 'complete') {
      this.completeQualityGrant(qualityName);
    }
  }

  removeQuality(qualityName: string, options: { confirmed?: boolean } = {}): RemoveQualityResult {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return { ok: false, reason: 'not-found' };

    if (!character.qualities.includes(qualityName)) {
      return { ok: false, reason: 'not-found' };
    }

    const origin = getQualityOrigin(character, qualityName);

    if (origin === 'metatype') {
      return { ok: false, reason: 'metatype' };
    }

    if (origin === 'metatypeRemovable') {
      const catalogEntry = this.qualityCatalog().get(qualityName);
      const buyOffBp = catalogEntry ? buyOffMetatypeQualityBp(catalogEntry.bp) : 0;

      if (!options.confirmed) {
        return { ok: false, reason: 'needs-confirmation', buyOffBp };
      }

      character.improvements = character.improvements.filter(
        (improvement) => improvement.sourceName !== qualityName,
      );

      character.qualityOrigins ??= {};
      character.qualityAdjustments ??= {};
      character.qualityOrigins[qualityName] = 'selected';
      character.qualityAdjustments[qualityName] = {
        bp: buyOffBp,
        excludeFromLimit: true,
      };

      this.afterEdit(character);
      return { ok: true };
    }

    character.qualities = character.qualities.filter((name) => name !== qualityName);
    character.improvements = character.improvements.filter(
      (improvement) => improvement.sourceName !== qualityName,
    );

    if (character.qualityOrigins) {
      delete character.qualityOrigins[qualityName];
    }
    if (character.qualityAdjustments) {
      delete character.qualityAdjustments[qualityName];
    }

    this.afterEdit(character);
    return { ok: true };
  }

  resolveSelection(value: string): void {
    const manager = this.manager;
    const session = this.grantSession;
    const pending = this.pendingSelection();

    if (!manager || !session || !pending) return;

    const { result, session: updated } = continueBonusGrant(manager, session, {
      requestId: pending.id,
      value,
    });

    this.grantSession = updated;

    if (result.status === 'pending' && result.pending) {
      this.pendingSelection.set(result.pending);
      return;
    }

    if (result.status === 'complete') {
      if (this.pendingGrantKind === 'quality' && this.pendingQualityName) {
        this.completeQualityGrant(this.pendingQualityName);
      } else if (this.pendingGrantKind === 'power') {
        this.completePowerGrant();
      }
    }
  }

  cancelGrant(): void {
    const manager = this.manager;
    if (manager) {
      cancelBonusGrant(manager);
    }
    this.clearGrantState();
    this.bump();
  }

  getAttributeValue(code: AttributeCode): number {
    this.revision();
    const character = this.character();
    if (!character) return 0;
    return getAttributeTotal(character, code);
  }

  private loadImportedCharacter(result: ChumImportResult): void {
    this.lastImportWarnings.set(result.warnings);
    repairEnabledSpecialAttributes(result.character);
    this.manager = new ImprovementManager(result.character);
    this.character.set(touchCharacter(result.character));
    this.clearGrantState();
    this.bump();
  }

  private completeQualityGrant(qualityName: string): void {
    const manager = this.manager;
    if (!manager) return;

    this.addQualityName(qualityName);
    this.clearGrantState();
    this.afterEdit(manager.getCharacter());
  }

  private completePowerGrant(): void {
    const manager = this.manager;
    const name = this.pendingPowerName;
    const rating = this.pendingPowerRating;
    const powerId = this.pendingPowerId;
    if (!manager || !name || !powerId) return;

    const entry = this.powerCatalog().get(name);
    const character = manager.getCharacter();
    if (!entry || character.powers.some((power) => power.name === name)) {
      this.clearGrantState();
      return;
    }

    character.powers.push(createPowerFromCatalog(entry, rating, { id: powerId }));
    this.clearGrantState();
    this.afterEdit(character);
  }

  private addQualityName(qualityName: string): void {
    const character = this.manager?.getCharacter();
    if (!character) return;
    if (!character.qualities.includes(qualityName)) {
      character.qualities.push(qualityName);
    }
    character.qualityOrigins ??= {};
    character.qualityOrigins[qualityName] = 'selected';
  }

  private hasInteractiveBonus(bonus: BonusNode): boolean {
    return (
      'selecttext' in bonus ||
      'selectskill' in bonus ||
      'selectskillgroup' in bonus ||
      'selectattribute' in bonus
    );
  }

  private normalizePackSkills(
    skills: PackEntry['skills'],
  ): Array<{ name: string; rating: number; spec?: string }> {
    if (!skills) return [];
    if (Array.isArray(skills)) {
      return skills.map((entry) => ({
        name: entry.name,
        rating: Number(entry.rating ?? 0),
        spec: Array.isArray(entry.spec) ? entry.spec[0] : entry.spec,
      }));
    }
    return Object.entries(skills).map(([name, rating]) => ({
      name,
      rating: Number(rating),
    }));
  }

  private parsePackPowerEntry(entry: PackPowerEntry): {
    name: string;
    rating: number;
    forcedSelections?: Record<string, string>;
  } {
    const rawName = entry.name;
    const name = typeof rawName === 'string' ? rawName : rawName.value;
    const select = typeof rawName === 'string' ? undefined : rawName.select;
    const rating = Number(entry.rating ?? 1);
    const catalogEntry = this.powerCatalog().get(name);
    const forcedSelections = select
      ? this.buildForcedSelections(catalogEntry?.bonus as BonusNode | undefined, select)
      : undefined;

    return {
      name,
      rating: Number.isFinite(rating) ? rating : 1,
      forcedSelections,
    };
  }

  private buildForcedSelections(
    bonus: BonusNode | undefined,
    select: string,
  ): Record<string, string> | undefined {
    if (!bonus) return undefined;
    if ('selectskill' in bonus) return { selectskill: select };
    if ('selectattribute' in bonus) return { selectattribute: select };
    if ('selectskillgroup' in bonus) return { selectskillgroup: select };
    if ('selecttext' in bonus) return { selecttext: select };
    return undefined;
  }

  private resolvePackItemName(name: string | { value: string; select?: string }): string {
    if (typeof name === 'string') return name;
    return name.select ? `${name.value} (${name.select})` : name.value;
  }

  private clearGrantState(): void {
    this.grantSession = null;
    this.pendingGrantKind = null;
    this.pendingQualityName = null;
    this.pendingPowerName = null;
    this.pendingPowerRating = 1;
    this.pendingPowerId = null;
    this.pendingSelection.set(null);
    this.pendingGrantLabel.set('');
    this.grantInProgress.set(false);
  }

  private scheduleAutoSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      void this.saveCurrentCharacter();
    }, 800);
  }

  private bump(): void {
    this.revision.update((value) => value + 1);
  }

  private buildCatalogMap(items: ChummerItem[] | undefined): Map<string, StreetCatalogEntry> {
    const map = new Map<string, StreetCatalogEntry>();
    for (const item of items ?? []) {
      if (!item.name) continue;
      map.set(item.name, item as StreetCatalogEntry);
    }
    return map;
  }

  private buildWareCatalogMap(items: ChummerItem[] | undefined): Map<string, WareCatalogEntry> {
    const map = new Map<string, WareCatalogEntry>();
    for (const item of items ?? []) {
      if (!item.name) continue;
      map.set(item.name, item as WareCatalogEntry);
    }
    return map;
  }

  private buildGradeMap(doc: { grades?: WareGrade[] }): Map<string, WareGrade> {
    const map = new Map<string, WareGrade>();
    for (const grade of doc.grades ?? []) {
      map.set(grade.name, grade);
    }
    return map;
  }

  private wareCatalogFor(kind: WareKind): Map<string, WareCatalogEntry> {
    return kind === 'cyberware' ? this.cyberwareCatalog() : this.biowareCatalog();
  }

  private gradesFor(kind: WareKind): Map<string, WareGrade> {
    return kind === 'cyberware' ? this.cyberwareGrades() : this.biowareGrades();
  }

  private applyWareBonuses(item: CharacterWare, entry: WareCatalogEntry): boolean {
    const manager = this.manager;
    if (!manager || !entry.bonus) return true;

    try {
      applyBonusHandlers(entry.bonus, {
        character: manager.getCharacter(),
        manager,
        source: item.kind === 'cyberware' ? ImprovementSource.Cyberware : ImprovementSource.Bioware,
        sourceName: wareSourceName(item.id),
        rating: item.rating || 1,
        uniqueName: '',
      });
      return true;
    } catch {
      return false;
    }
  }

  private stripWareImprovements(id: string): void {
    const character = this.manager?.getCharacter();
    if (!character) return;
    const sourceName = wareSourceName(id);
    character.improvements = character.improvements.filter(
      (improvement) => improvement.sourceName !== sourceName,
    );
  }

  private removeWareTreeBonuses(item: CharacterWare): void {
    for (const child of item.children) {
      this.removeWareTreeBonuses(child);
    }
    this.stripWareImprovements(item.id);
  }

  private commitWare(character: Character): void {
    syncLegacyPurchases(character);
    this.afterEdit(character);
  }

  /** Persist an edit; clears finalized status so creation can be finished again. */
  private afterEdit(character: Character): void {
    repairEnabledSpecialAttributes(character);
    if (character.created) {
      character.created = false;
      this.reopenedByEdit.set(true);
    }
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  private addTopLevelStreetItem(
    container: 'gear' | 'weapons' | 'armors',
    entry: StreetCatalogEntry,
    rating: number,
  ): void {
    const character = this.character();
    if (!character) return;

    const kind = container === 'gear' ? 'gear' : container === 'weapons' ? 'weapon' : 'armor';
    character[container].push(
      createStreetItemFromCatalog(entry, {
        kind,
        rating: isRatedCatalogEntry(entry) ? rating : undefined,
      }),
    );
    this.commitStreetGear(character);
  }

  private catalogForItem(item: { kind: string; name: string }): StreetCatalogEntry | undefined {
    switch (item.kind) {
      case 'gear':
      case 'nested-gear':
        return this.gearCatalog().get(item.name);
      case 'weapon':
        return this.weaponCatalog().get(item.name);
      case 'armor':
        return this.armorCatalog().get(item.name);
      case 'accessory':
        return this.weaponAccessoryCatalog().get(item.name);
      case 'weapon-mod':
        return this.weaponModCatalog().get(item.name);
      case 'armor-mod':
        return this.armorModCatalog().get(item.name);
      default:
        return undefined;
    }
  }

  private commitStreetGear(character: Character): void {
    syncLegacyPurchases(character);
    this.afterEdit(character);
  }

  private commitCharacter(character: Character): void {
    syncLegacyPurchases(character);
    this.afterEdit(character);
  }

  private stripPowerImprovements(id: string): void {
    const character = this.manager?.getCharacter();
    if (!character) return;
    character.improvements = character.improvements.filter(
      (improvement) => improvement.sourceName !== id,
    );
  }

  private contactsEqual(a: CharacterContact[], b: CharacterContact[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((contact, index) => {
      const other = b[index];
      return (
        contact.name === other.name &&
        contact.connection === other.connection &&
        contact.loyalty === other.loyalty &&
        contact.group === other.group &&
        (contact.free ?? false) === (other.free ?? false) &&
        (contact.enemy ?? false) === (other.enemy ?? false)
      );
    });
  }

  private activeSkillsEqual(a: CharacterSkill[], b: CharacterSkill[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((skill, index) => {
      const other = b[index];
      return (
        skill.name === other.name &&
        skill.rating === other.rating &&
        (skill.specialization ?? '') === (other.specialization ?? '')
      );
    });
  }

  private knowledgeSkillsEqual(a: CharacterSkill[], b: CharacterSkill[]): boolean {
    return this.activeSkillsEqual(a, b);
  }

  private skillGroupsEqual(a: CharacterSkillGroup[], b: CharacterSkillGroup[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((group, index) => {
      const other = b[index];
      return group.name === other.name && group.rating === other.rating;
    });
  }

  private martialArtsEqual(a: CharacterMartialArt[], b: CharacterMartialArt[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((art, index) => {
      const other = b[index];
      return art.name === other.name && art.rating === other.rating;
    });
  }
}
