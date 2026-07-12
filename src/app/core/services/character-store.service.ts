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
  grantBonus,
  initializeMetatype,
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
} from '../rules';
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

  removeQuality(qualityName: string): void {
    const character = this.character();
    const manager = this.manager;
    if (!character || !manager) return;

    character.qualities = character.qualities.filter((name) => name !== qualityName);
    character.improvements = character.improvements.filter(
      (improvement) => improvement.sourceName !== qualityName,
    );

    this.character.set(touchCharacter(character));
    this.bump();
    this.scheduleAutoSave();
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
