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
  calculateBp,
  calculateNuyen,
  cancelBonusGrant,
  continueBonusGrant,
  createCharacterId,
  createEmptyCharacter,
  deriveStats,
  deserializeCharacter,
  getAttributeTotal,
  getEffectiveLimits,
  getQualityOrigin,
  buyOffMetatypeQualityBp,
  getMaxNuyenBp,
  getFreeKnowledgeSkillPoints,
  grantBonus,
  initializeMetatype,
  listMetavariants,
  listSelectableAttributes,
  loadCharacterOptions,
  MetatypeRecord,
  NuyenBreakdown,
  parseAttributeSelectionConfig,
  parseChumXml,
  QualityCatalogEntry,
  touchCharacter,
  validateCharacter,
  type BonusGrantSession,
  type BonusNode,
  type ChumImportResult,
  type CharacterContact,
  type CharacterProfile,
  type CharacterSkill,
} from '../rules';

export type RemoveQualityResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'metatype' | 'needs-confirmation'; buyOffBp?: number };
import { CharacterStorageService } from './character-storage.service';
import { ChummerDataService } from './chummer-data.service';

@Injectable({ providedIn: 'root' })
export class CharacterStoreService {
  private readonly http = inject(HttpClient);
  private readonly data = inject(ChummerDataService);
  private readonly storage = inject(CharacterStorageService);

  private readonly revision = signal(0);
  private manager: ImprovementManager | null = null;
  private grantSession: BonusGrantSession | null = null;
  private pendingQualityName: string | null = null;
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
    return getMaxNuyenBp(character, manager);
  });

  readonly freeKnowledgeSkillPoints = computed((): number => {
    this.revision();
    const character = this.character();
    if (!character) return 0;
    return getFreeKnowledgeSkillPoints(character);
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
    });
  });

  async ensureInitialized(): Promise<void> {
    if (this.initialized()) return;

    const [settings, qualitiesDoc, metatypesDoc] = await Promise.all([
      firstValueFrom(this.http.get<Partial<CharacterOptions>>('/data/settings/default.json')),
      this.data.loadDocument('qualities'),
      this.data.loadDocument('metatypes'),
    ]);

    this.options.set(loadCharacterOptions(settings));
    const qualities = (qualitiesDoc as { qualities: Array<{ name: string; bp?: string; category?: string[]; bonus?: BonusNode }> })
      .qualities ?? [];

    this.qualityCatalog.set(buildQualityCatalog(qualities));
    this.qualityRecords.set(new Map(qualities.map((q) => [q.name, q])));
    this.metatypes.set(
      (metatypesDoc as { metatypes: MetatypeRecord[] }).metatypes ?? [],
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
      maximumAvailability: options.maximumAvailability,
      ...overrides,
    });
    this.manager = new ImprovementManager(character);
    this.character.set(character);
    this.clearGrantState();
    this.bump();
    this.scheduleAutoSave();
  }

  async openCharacter(id: string): Promise<boolean> {
    const stored = await this.storage.loadCharacter(id);
    if (!stored) return false;

    const character = deserializeCharacter(stored);
    this.manager = new ImprovementManager(character);
    this.character.set(character);
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
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
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

    const max = getMaxNuyenBp(character, manager);
    character.nuyenBpSpent = Math.min(Math.max(0, Math.floor(value)), max);
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  updateProfile(profile: Partial<CharacterProfile>): void {
    const character = this.character();
    if (!character) return;
    character.profile = { ...character.profile, ...profile };
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
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
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  updateContact(index: number, contact: Partial<CharacterContact>): void {
    const character = this.character();
    if (!character || index < 0 || index >= character.contacts.length) return;
    character.contacts[index] = { ...character.contacts[index], ...contact };
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  removeContact(index: number): void {
    const character = this.character();
    if (!character || index < 0 || index >= character.contacts.length) return;
    character.contacts.splice(index, 1);
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  addActiveSkill(skill: CharacterSkill): void {
    const character = this.character();
    if (!character) return;
    if (character.skills.some((entry) => entry.name === skill.name)) return;
    character.skills.push({ ...skill, knowledge: false });
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  setActiveSkillRating(skillName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return;
    const max = skill.ratingMax ?? 6;
    skill.rating = Math.min(Math.max(0, Math.floor(rating)), max);
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  removeActiveSkill(skillName: string): void {
    const character = this.character();
    if (!character) return;
    character.skills = character.skills.filter((entry) => entry.name !== skillName);
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  addKnowledgeSkill(skill: CharacterSkill): void {
    const character = this.character();
    if (!character) return;
    if (character.knowledgeSkills.some((entry) => entry.name === skill.name)) return;
    character.knowledgeSkills.push({ ...skill, knowledge: true });
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  setKnowledgeSkillRating(skillName: string, rating: number): void {
    const character = this.character();
    if (!character) return;
    const skill = character.knowledgeSkills.find((entry) => entry.name === skillName);
    if (!skill) return;
    const max = skill.ratingMax ?? 6;
    skill.rating = Math.min(Math.max(0, Math.floor(rating)), max);
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  removeKnowledgeSkill(skillName: string): void {
    const character = this.character();
    if (!character) return;
    character.knowledgeSkills = character.knowledgeSkills.filter(
      (entry) => entry.name !== skillName,
    );
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  setAttributeBase(code: AttributeCode, value: number): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    const limits = getEffectiveLimits(character, code);
    const clamped = Math.min(Math.max(value, limits.min), limits.max);
    character.attributes[code].base = clamped;
    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
  }

  applyQuality(qualityName: string, bonus: BonusNode | null | undefined, rating = 1): void {
    const manager = this.manager;
    if (!manager || !bonus) return;

    if (!this.hasInteractiveBonus(bonus)) {
      applyQualityBonus(manager.getCharacter(), manager, qualityName, bonus, rating);
      this.addQualityName(qualityName);
      this.character.set(touchCharacter(manager.getCharacter()));
      this.bump();
      this.scheduleAutoSave();
      return;
    }

    this.grantInProgress.set(true);
    this.pendingQualityName = qualityName;

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

      this.character.set(touchCharacter(character));
      this.bump();
      this.scheduleAutoSave();
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

    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
    return { ok: true };
  }

  resolveSelection(value: string): void {
    const manager = this.manager;
    const session = this.grantSession;
    const pending = this.pendingSelection();
    const qualityName = this.pendingQualityName;

    if (!manager || !session || !pending || !qualityName) return;

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
      this.completeQualityGrant(qualityName);
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
    this.manager = new ImprovementManager(result.character);
    this.character.set(touchCharacter(result.character));
    this.clearGrantState();
    this.bump();
  }

  private completeQualityGrant(qualityName: string): void {
    const manager = this.manager;
    if (!manager) return;

    this.addQualityName(qualityName);
    this.character.set(touchCharacter(manager.getCharacter()));
    this.clearGrantState();
    this.bump();
    this.scheduleAutoSave();
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

  private clearGrantState(): void {
    this.grantSession = null;
    this.pendingQualityName = null;
    this.pendingSelection.set(null);
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
}
