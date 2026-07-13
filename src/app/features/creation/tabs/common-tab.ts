import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { ChummerDataService } from '../../../core/services/chummer-data.service';
import { ContentFilterService } from '../../../core/services/content-filter.service';
import { ChummerItem } from '../../../core/models/chummer-data.types';
import { contentSourceScopeLabel } from '../../../core/models/content-source-scope';
import { canTakeQuality, getQualityOrigin } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

type QualityFilter = 'Positive' | 'Negative';

@Component({
  selector: 'app-common-tab',
  imports: [FormsModule, SourceFilterControl],
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

        <div class="metatype-row" aria-label="Metatype selection">
          <span class="field-label" id="metatype-label">Metatype</span>
          <div class="metatype-actions" role="group" aria-labelledby="metatype-label">
            @for (metatype of metatypes; track metatype) {
              <button
                type="button"
                class="metatype-btn"
                [class.active]="character.metatype === metatype"
                [attr.aria-pressed]="character.metatype === metatype"
                (click)="store.initializeMetatype(metatype)"
              >
                {{ metatype }}
              </button>
            }
          </div>
          @if (character.metavariant) {
            <span class="muted metavariant">{{ character.metavariant }}</span>
          }
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
              <span class="total">{{ store.getAttributeValue(code) }}</span>
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

    .metatype-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 1rem;

      .field-label {
        width: 100%;
        font-weight: 500;
        color: var(--color-text-muted);
        font-size: 0.875rem;
      }

      .metavariant {
        font-size: 0.875rem;
      }
    }

    .metatype-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .metatype-btn.active {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
      font-weight: 600;
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
      grid-template-columns: 2rem 1fr 2rem;
      gap: 0.5rem;
      align-items: center;

      input { width: 100%; padding: 0.25rem; }
      .total { text-align: right; color: var(--color-text-muted); }
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
  readonly metatypes = ['Human', 'Elf', 'Dwarf', 'Ork', 'Troll'];
  readonly qualityFilters: QualityFilter[] = ['Positive', 'Negative'];

  readonly qualityCatalog = signal<ChummerItem[]>([]);
  readonly loadingQualities = signal(true);
  readonly categoryFilter = signal<QualityFilter>('Positive');
  readonly searchQuery = signal('');

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
    const qualities = await this.data.loadItems('qualities', 'qualities');
    this.qualityCatalog.set(qualities);
    this.loadingQualities.set(false);
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
