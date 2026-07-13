import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { ChummerDataService } from '../../../core/services/chummer-data.service';
import { ContentFilterService } from '../../../core/services/content-filter.service';
import { ChummerItem } from '../../../core/models/chummer-data.types';
import { contentSourceScopeLabel } from '../../../core/models/content-source-scope';
import { canTakeQuality, getQualityOrigin, type AttributeCode } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

type QualityFilter = 'Positive' | 'Negative';

@Component({
  selector: 'app-common-tab',
  imports: [FormsModule, SourceFilterControl, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="common-heading">
        <h2 id="common-heading">Common</h2>

        <div class="field-row">
          <label for="character-name">Character name</label>
          <input
            id="character-name"
            type="text"
            [ngModel]="character.name"
            (ngModelChange)="store.setCharacterName($event)"
          />
        </div>

        <div class="metatype-panel" aria-label="Metatype selection">
          <div class="metatype-field">
            <span class="field-label" id="metatype-label">Metatype</span>
            <div class="metatype-actions" role="group" aria-labelledby="metatype-label">
              @for (metatype of playableMetatypes(); track metatype.name) {
                <button
                  type="button"
                  class="metatype-btn"
                  [class.active]="character.metatype === metatype.name"
                  [attr.aria-pressed]="character.metatype === metatype.name"
                  (click)="onMetatypeSelect(metatype.name)"
                >
                  {{ metatype.name }}
                </button>
              }
            </div>
            @if (baseMetatypeBp(); as baseBp) {
              <p class="metatype-cost muted">
                Base cost: {{ baseBp }} BP
                @if (character.metavariant) {
                  · Selected: {{ character.metatypeBp }} BP total
                }
              </p>
            }
          </div>

          <label class="metavariant-field">
            <span class="field-label" id="metavariant-label">Metavariant</span>
            <select
              id="metavariant-select"
              aria-labelledby="metavariant-label"
              [value]="metavariantSelection()"
              (change)="onMetavariantChange($event)"
              [disabled]="!metavariants().length"
            >
              <option value="None">None</option>
              @for (variant of metavariants(); track variant.name) {
                <option [value]="variant.name">
                  {{ variant.name }}@if (variant.bp) { ({{ variant.bp }} BP)}
                </option>
              }
            </select>
            @if (!metavariants().length) {
              <span class="field-hint">No metavariants for this metatype</span>
            }
          </label>
        </div>

        <div class="attributes" aria-label="Primary attributes">
          <h3>Attributes</h3>
          @for (code of primaryAttributes; track code) {
            <label class="attr-row">
              <span>{{ code }}</span>
              <input
                type="number"
                [ngModel]="character.attributes[code].base"
                (ngModelChange)="store.setAttributeBase(code, $event)"
                [min]="character.attributes[code].min"
                [max]="character.attributes[code].max"
              />
            </label>
          }
        </div>

        @if (specialAttributeCodes().length) {
          <div class="attributes special-attrs" aria-label="Special attributes">
            <h3>Special Attributes</h3>
            @for (code of specialAttributeCodes(); track code) {
              <label class="attr-row">
                <span>{{ code }}</span>
                <input
                  type="number"
                  [ngModel]="character.attributes[code].base"
                  (ngModelChange)="store.setAttributeBase(code, $event)"
                  [min]="character.attributes[code].min"
                  [max]="character.attributes[code].max"
                />
              </label>
            }
          </div>
        }

        <div class="nuyen-section" aria-label="Nuyen from build points">
          <h3>Nuyen</h3>
          <label class="nuyen-row">
            <span>BP spent on nuyen (max {{ store.maxNuyenBp() }})</span>
            <input
              type="number"
              [ngModel]="character.nuyenBpSpent"
              (ngModelChange)="store.setNuyenBpSpent($event)"
              [min]="0"
              [max]="store.maxNuyenBp()"
            />
          </label>
          @if (store.nuyenBreakdown(); as nuyen) {
            <p class="muted nuyen-summary">
              {{ nuyen.fromBp | number }}¥ from BP
              @if (nuyen.fromImprovements) {
                + {{ nuyen.fromImprovements | number }}¥ from qualities
              }
            </p>
          }
        </div>

        <div class="contacts-section" aria-label="Contacts">
          <div class="section-header">
            <h3>Contacts</h3>
            <button type="button" (click)="store.addContact()">Add contact</button>
          </div>

          @if (!character.contacts.length) {
            <p class="muted">No contacts yet.</p>
          } @else {
            <ul class="contact-list">
              @for (contact of character.contacts; track $index; let i = $index) {
                <li>
                  <label>
                    <span class="sr-only">Name</span>
                    <input
                      type="text"
                      placeholder="Name"
                      [ngModel]="contact.name"
                      (ngModelChange)="store.updateContact(i, { name: $event })"
                    />
                  </label>
                  <label>
                    <span>Conn</span>
                    <input
                      type="number"
                      [ngModel]="contact.connection"
                      (ngModelChange)="store.updateContact(i, { connection: $event })"
                      min="0"
                    />
                  </label>
                  <label>
                    <span>Loy</span>
                    <input
                      type="number"
                      [ngModel]="contact.loyalty"
                      (ngModelChange)="store.updateContact(i, { loyalty: $event })"
                      min="0"
                    />
                  </label>
                  <label>
                    <span>Grp</span>
                    <input
                      type="number"
                      [ngModel]="contact.group"
                      (ngModelChange)="store.updateContact(i, { group: $event })"
                      min="0"
                    />
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [ngModel]="contact.enemy"
                      (ngModelChange)="store.updateContact(i, { enemy: $event })"
                    />
                    Enemy
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      [ngModel]="contact.free"
                      (ngModelChange)="store.updateContact(i, { free: $event })"
                    />
                    Free
                  </label>
                  <button type="button" (click)="store.removeContact(i)">Remove</button>
                </li>
              }
            </ul>
          }
        </div>

        <div class="skills-preview" aria-label="Skills preview">
          <div class="section-header">
            <h3>Skills (preview)</h3>
          </div>
          <p class="muted">
            Add default active skills here. Full skill editing comes in the Skills tab.
            Free knowledge points: {{ store.freeKnowledgeSkillPoints() }}.
          </p>

          @if (character.skills.length) {
            <ul class="skill-list">
              @for (skill of character.skills; track skill.name) {
                <li>
                  <span>{{ skill.name }}</span>
                  <input
                    type="number"
                    [ngModel]="skill.rating"
                    (ngModelChange)="store.setActiveSkillRating(skill.name, $event)"
                    [min]="0"
                    [max]="skill.ratingMax ?? 6"
                  />
                  <button type="button" (click)="store.removeActiveSkill(skill.name)">Remove</button>
                </li>
              }
            </ul>
          }

          @if (defaultSkills().length) {
            <label class="add-skill-row">
              <span class="sr-only">Add default skill</span>
              <select #skillSelect>
                <option value="">Add default skill…</option>
                @for (skill of defaultSkills(); track skill.name) {
                  <option [value]="skill.name">{{ skill.name }}</option>
                }
              </select>
              <button type="button" (click)="addDefaultSkill(skillSelect)">Add</button>
            </label>
          }
        </div>

        <div class="qualities" aria-label="Qualities">
          <h3>Qualities</h3>
          <p class="muted">
            Browse positive and negative qualities from Chummer data
            ({{ scopedQualities().length }} in {{ contentSourceScopeLabel(contentFilter.scope()) }}).
          </p>

          @if (character.qualities.length) {
            <div class="selected-qualities">
              <h4>Selected</h4>
              <ul class="quality-list">
                @for (quality of character.qualities; track quality) {
                  <li [class.metatype-quality]="isMetatypeQuality(quality)">
                    <span>
                      {{ quality }}
                      @if (qualityOriginLabel(quality); as label) {
                        <span class="quality-origin">{{ label }}</span>
                      }
                    </span>
                    @if (canRemoveQuality(quality)) {
                      <button type="button" (click)="removeQuality(quality)">
                        {{ isBuyOffQuality(quality) ? 'Buy off' : 'Remove' }}
                      </button>
                    }
                  </li>
                }
              </ul>
            </div>
          }

          <div class="quality-toolbar">
            <div class="filter-group" role="group" aria-label="Quality category">
              @for (filter of qualityFilters; track filter) {
                <button
                  type="button"
                  class="filter-btn"
                  [class.active]="categoryFilter() === filter"
                  (click)="categoryFilter.set(filter)"
                >
                  {{ filter }}
                </button>
              }
            </div>

            <app-source-filter-control />

            <label class="search-field">
              <span class="sr-only">Search qualities</span>
              <input
                type="search"
                placeholder="Search qualities…"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
            </label>

            <p class="result-count" role="status" aria-live="polite">
              {{ filteredQualities().length }} shown
            </p>
          </div>

          @if (loadingQualities()) {
            <p class="muted" role="status">Loading qualities…</p>
          } @else {
            <div class="quality-catalog-wrap">
              <table class="quality-catalog">
                <caption class="sr-only">
                  {{ categoryFilter() }} qualities available for this character
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Quality</th>
                    <th scope="col">BP</th>
                    <th scope="col"><span class="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (quality of filteredQualities(); track quality.name) {
                    <tr>
                      <th scope="row">
                        {{ quality.name }}
                        @if (qualityBlockReason(quality); as reason) {
                          <span class="block-reason">{{ reason }}</span>
                        }
                      </th>
                      <td>{{ formatBp(quality) }}</td>
                      <td>
                        <button
                          type="button"
                          [disabled]="!canAddQuality(quality)"
                          (click)="addQuality(quality)"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    h2, h3, h4 { margin: 0 0 0.75rem; }
    h3, h4 { font-size: 1rem; }

    .field-row {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 1rem;

      label { font-weight: 500; }

      input {
        max-width: 24rem;
        padding: 0.5rem;
      }
    }

    .metatype-panel {
      display: grid;
      gap: 1rem;
      margin-bottom: 1rem;

      @media (min-width: 40rem) {
        grid-template-columns: minmax(0, 1fr) minmax(14rem, 18rem);
        align-items: start;
      }
    }

    .metatype-field,
    .metavariant-field {
      display: grid;
      gap: 0.375rem;
      align-content: start;
    }

    .field-label {
      font-weight: 500;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .metatype-cost {
      margin: 0.25rem 0 0;
      font-size: 0.8125rem;
    }

    .metatype-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .metatype-btn,
    .metavariant-field select {
      min-height: 2.25rem;
      box-sizing: border-box;
    }

    .metatype-btn.active {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
      font-weight: 600;
    }

    .metavariant-field select {
      width: 100%;
      padding: 0.375rem 0.625rem;
    }

    .metavariant-field select:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;

      h3 { margin: 0; }
    }

    .special-attrs { margin-bottom: 1.25rem; }

    .nuyen-section,
    .contacts-section,
    .skills-preview {
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    .nuyen-row {
      display: grid;
      gap: 0.25rem;
      max-width: 20rem;

      input { padding: 0.375rem 0.5rem; }
    }

    .nuyen-summary { margin: 0.5rem 0 0; font-size: 0.875rem; }

    .contact-list,
    .skill-list {
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--color-border);

        &:last-child { border-bottom: none; }

        input[type='text'] { min-width: 8rem; flex: 1; }
        input[type='number'] { width: 3.5rem; }
      }
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .add-skill-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;

      select { flex: 1; max-width: 20rem; padding: 0.375rem 0.5rem; }
    }

    button {
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;

      &:hover:not(:disabled) { border-color: var(--color-accent); }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .attributes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .attr-row {
      display: grid;
      grid-template-columns: 2rem 1fr;
      gap: 0.5rem;
      align-items: center;

      input { width: 100%; padding: 0.25rem; }
    }

    .selected-qualities {
      margin-bottom: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
    }

    .quality-list {
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.375rem 0;
        border-bottom: 1px solid var(--color-border);

        &:last-child { border-bottom: none; }
      }

      .metatype-quality {
        color: var(--color-text-muted);
      }

      .quality-origin {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
    }

    .quality-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .filter-group {
      display: flex;
      gap: 0.25rem;
    }

    .filter-btn.active {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
      font-weight: 600;
    }

    .search-field {
      flex: 1;
      min-width: 12rem;
      max-width: 24rem;

      input { width: 100%; padding: 0.5rem; }
    }

    .result-count {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .quality-catalog-wrap {
      max-height: 24rem;
      overflow: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .quality-catalog {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th, td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
        text-align: left;
        vertical-align: top;
      }

      thead th {
        position: sticky;
        top: 0;
        background: var(--color-surface-raised);
        z-index: 1;
      }

      tbody tr:last-child th,
      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody th {
        font-weight: 500;
      }
    }

    .block-reason {
      display: block;
      margin-top: 0.125rem;
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--color-text-muted);
    }

    .muted { color: var(--color-text-muted); margin: 0 0 0.75rem; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class CommonTab implements OnInit {
  readonly store = inject(CharacterStoreService);
  readonly contentFilter = inject(ContentFilterService);
  private readonly data = inject(ChummerDataService);

  protected readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly primaryAttributes = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL'] as const;
  readonly qualityFilters: QualityFilter[] = ['Positive', 'Negative'];

  readonly playableMetatypes = computed(() => {
    const metatypes = this.store.metatypes();
    return metatypes
      .filter((metatype) => {
        const category = Array.isArray(metatype.category)
          ? metatype.category[0]
          : metatype.category;
        return category === 'Metahuman';
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly baseMetatypeBp = computed(() => {
    const character = this.store.character();
    if (!character) return null;
    const metatype = this.playableMetatypes().find((entry) => entry.name === character.metatype);
    return metatype?.bp ? Number(metatype.bp) : 0;
  });

  readonly metavariants = computed(() => this.store.getMetavariantsForCurrentMetatype());

  readonly qualityCatalog = signal<ChummerItem[]>([]);
  readonly activeSkillCatalog = signal<ChummerItem[]>([]);
  readonly loadingQualities = signal(true);
  readonly categoryFilter = signal<QualityFilter>('Positive');
  readonly searchQuery = signal('');

  readonly metavariantSelection = computed(() => {
    const character = this.store.character();
    if (!character?.metavariant) return 'None';
    const valid = this.metavariants().some((variant) => variant.name === character.metavariant);
    return valid ? character.metavariant : 'None';
  });

  readonly specialAttributeCodes = computed((): AttributeCode[] => {
    const character = this.store.character();
    if (!character) return [];
    const codes: AttributeCode[] = ['EDG'];
    if (character.flags.magEnabled) codes.push('MAG');
    if (character.flags.resEnabled) codes.push('RES');
    return codes;
  });

  readonly defaultSkills = computed(() => {
    const character = this.store.character();
    const selected = new Set(character?.skills.map((skill) => skill.name) ?? []);
    return sortByName(
      this.activeSkillCatalog().filter((skill) => {
        if (selected.has(skill.name)) return false;
        const isDefault = skill['default'];
        return isDefault === 'Yes' || isDefault === true;
      }),
    );
  });

  readonly scopedQualities = computed(() => {
    this.contentFilter.scope();
    return this.qualityCatalog().filter((quality) =>
      matchesSourceScope(quality, this.contentFilter.scope()),
    );
  });

  readonly filteredQualities = computed(() => {
    const filter = this.categoryFilter();
    const query = this.searchQuery();
    const selected = new Set(this.store.character()?.qualities ?? []);

    return sortByName(
      this.scopedQualities().filter((quality) => {
        if (selected.has(quality.name)) return false;
        if (categoryLabel(quality) !== filter) return false;
        return matchesSearch(quality, query);
      }),
    );
  });

  async ngOnInit(): Promise<void> {
    const [qualities, skills] = await Promise.all([
      this.data.loadItems('qualities', 'qualities'),
      this.data.loadItems('skills', 'skills'),
    ]);
    this.qualityCatalog.set(qualities);
    this.activeSkillCatalog.set(skills);
    this.loadingQualities.set(false);
  }

  onMetatypeSelect(metatypeName: string): void {
    const character = this.store.character();
    if (!character || character.metatype === metatypeName) return;
    if (
      !window.confirm('Changing metatype resets attributes, qualities, and skills. Continue?')
    ) {
      return;
    }
    this.store.initializeMetatype(metatypeName);
  }

  onMetavariantChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const current = this.store.character()?.metavariant ?? 'None';
    if (value === current) return;
    if (
      !window.confirm('Changing metavariant resets metatype bonuses. Continue?')
    ) {
      select.value = current;
      return;
    }
    this.store.setMetavariant(value === 'None' ? undefined : value);
  }

  addDefaultSkill(select: HTMLSelectElement): void {
    const name = select.value;
    if (!name) return;
    const record = this.activeSkillCatalog().find((skill) => skill.name === name);
    if (!record) return;

    const category = record['category'];
    const skillCategory = Array.isArray(category)
      ? String(category[0] ?? '')
      : String(category ?? '');

    this.store.addActiveSkill({
      name: record.name,
      rating: 0,
      ratingMax: 6,
      skillGroup: String(record['skillgroup'] ?? '') || undefined,
      skillCategory,
      attribute: String(record['attribute'] ?? '') || undefined,
      defaultSkill: true,
      grouped: false,
    });
    select.value = '';
  }

  formatBp(quality: ChummerItem): string {
    const bp = quality['bp'];
    if (bp === undefined || bp === null || bp === '') return '—';
    const value = Array.isArray(bp) ? bp.join(' / ') : String(bp);
    return `${value} BP`;
  }

  canAddQuality(quality: ChummerItem): boolean {
    const character = this.store.character();
    if (!character) return false;
    if (character.qualities.includes(quality.name)) return false;
    return canTakeQuality(quality as ChummerItem & { name: string }, character).met;
  }

  qualityBlockReason(quality: ChummerItem): string | null {
    const character = this.store.character();
    if (!character || character.qualities.includes(quality.name)) return null;

    const result = canTakeQuality(quality as ChummerItem & { name: string }, character);
    return result.met ? null : (result.reason ?? 'Requirements not met');
  }

  addQuality(quality: ChummerItem): void {
    if (!this.canAddQuality(quality)) return;
    this.store.applyQuality(quality.name, quality['bonus'] as Record<string, unknown> | undefined);
  }

  isMetatypeQuality(qualityName: string): boolean {
    const character = this.store.character();
    if (!character) return false;
    const origin = getQualityOrigin(character, qualityName);
    return origin === 'metatype' || origin === 'metatypeRemovable';
  }

  isBuyOffQuality(qualityName: string): boolean {
    const character = this.store.character();
    if (!character) return false;
    return getQualityOrigin(character, qualityName) === 'metatypeRemovable';
  }

  canRemoveQuality(qualityName: string): boolean {
    const character = this.store.character();
    if (!character) return false;
    return getQualityOrigin(character, qualityName) !== 'metatype';
  }

  qualityOriginLabel(qualityName: string): string | null {
    const character = this.store.character();
    if (!character) return null;
    const origin = getQualityOrigin(character, qualityName);
    if (origin === 'metatype') return 'From metatype';
    if (origin === 'metatypeRemovable') return 'From metatype (can buy off)';
    if (character.qualityAdjustments?.[qualityName]) return 'Bought off';
    return null;
  }

  removeQuality(qualityName: string): void {
    const result = this.store.removeQuality(qualityName);
    if (result.ok) return;

    if (result.reason === 'metatype') {
      window.alert('This quality comes from your metatype and cannot be removed.');
      return;
    }

    if (result.reason === 'needs-confirmation') {
      const bp = result.buyOffBp ?? 0;
      const confirmed = window.confirm(
        `Buying off this quality costs ${bp} BP. Continue?`,
      );
      if (confirmed) {
        this.store.removeQuality(qualityName, { confirmed: true });
      }
    }
  }
}
