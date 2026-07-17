import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { ContentFilterService } from '../../../core/services/content-filter.service';
import { ChummerItem } from '../../../core/models/chummer-data.types';
import { contentSourceScopeLabel } from '../../../core/models/content-source-scope';
import {
  calculateParentCapacityTotal,
  calculateWareCapacityUsed,
  CharacterWare,
  getCatalogMaxRating,
  isRatedWareEntry,
  parseCapacityCost,
  WareCatalogEntry,
  WareKind,
} from '../../../core/rules';
import { itemSummary, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

type WareSection = WareKind;

@Component({
  selector: 'app-cyberware-tab',
  imports: [DecimalPipe, FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="cyberware-heading">
        <h2 id="cyberware-heading">Cyberware &amp; Bioware</h2>

        @if (store.essenceBreakdown(); as essence) {
          <p class="essence-summary" role="status">
            Essence:
            <strong>{{ essence.current }}</strong>
            / {{ essence.base }}
            · Lost {{ essence.lost }}
            @if (essence.penalty > 0) {
              · Magic/Resonance penalty {{ essence.penalty }}
            }
          </p>
        }

        @if (store.nuyenBreakdown(); as nuyen) {
          <p class="nuyen-summary" role="status">
            Remaining nuyen:
            <strong [class.overspent]="nuyen.remaining < 0">{{ nuyen.remaining | number }}¥</strong>
          </p>
        }

        <nav class="section-nav" aria-label="Augmentation sections">
          @for (section of sections; track section.id) {
            <button
              type="button"
              class="section-btn"
              [class.active]="activeSection() === section.id"
              [attr.aria-current]="activeSection() === section.id ? 'page' : null"
              (click)="activeSection.set(section.id)"
            >
              {{ section.label }}
            </button>
          }
        </nav>

        <div class="subsection" [attr.aria-labelledby]="activeSection() + '-heading'">
          <h3 [id]="activeSection() + '-heading'">{{ activeSectionLabel() }}</h3>

          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search {{ activeSectionLabel() }}</span>
              <input
                type="search"
                [placeholder]="'Search ' + activeSectionLabel().toLowerCase() + '…'"
                [formField]="searchForm.query"
              />
            </label>
            <app-source-filter-control />
            <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
          </div>

          <table class="catalog-table">
            <caption class="sr-only">{{ activeSectionLabel() }} catalog</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Details</th>
                <th scope="col">Install</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredCatalog(); track item.name) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td class="muted">{{ summarizeItem(item) }}</td>
                  <td>
                    <label class="inline-grade">
                      <span class="sr-only">Grade for {{ item.name }}</span>
                      <select
                        [value]="catalogGrade(item.name)"
                        (change)="setPendingGrade(item.name, $event)"
                      >
                        @for (grade of store.getAllowedWareGrades(activeSection(), item.name); track grade) {
                          <option [value]="grade">{{ grade }}</option>
                        }
                      </select>
                    </label>
                    @if (isRatedWareEntry(item)) {
                      <label class="inline-rating">
                        <span class="sr-only">Rating for {{ item.name }}</span>
                        <input
                          type="number"
                          min="1"
                          [max]="getCatalogMaxRating(item)"
                          [value]="catalogRating(item.name)"
                          (change)="setPendingRating(item.name, $event)"
                        />
                      </label>
                    }
                    <button
                      type="button"
                      [disabled]="!canAdd(item.name)"
                      (click)="installItem(item)"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (ownedWare().length) {
            <h4>Installed {{ activeSectionLabel().toLowerCase() }}</h4>
            <ul class="editor-list">
              @for (item of ownedWare(); track item.id) {
                <li>
                  <div class="editor-row">
                    <button
                      type="button"
                      class="select-btn"
                      [class.selected]="selectedParentId() === item.id"
                      (click)="toggleParentSelection(item.id)"
                    >
                      {{ item.name }}
                    </button>
                    <label>
                      <span class="sr-only">Grade for {{ item.name }}</span>
                      <select
                        [value]="item.grade"
                        (change)="onGradeChange(item.id, $event)"
                      >
                        @for (grade of store.getAllowedWareGrades(activeSection(), item.name); track grade) {
                          <option [value]="grade">{{ grade }}</option>
                        }
                      </select>
                    </label>
                    @if (isRatedOwnedItem(item)) {
                      <label>
                        <span class="sr-only">Rating for {{ item.name }}</span>
                        <input
                          type="number"
                          min="1"
                          [max]="maxOwnedRating(item)"
                          [value]="item.rating"
                          (change)="onRatingChange(item.id, $event)"
                        />
                      </label>
                    }
                    <span class="muted">
                      ESS {{ item.essence }}
                      · Avail {{ item.availability }}
                      · {{ item.cost | number }}¥
                      @if (wareCapacityTotal(item.capacity) > 0) {
                        · Cap {{ wareCapacityUsed(item) }}/{{ wareCapacityTotal(item.capacity) }}
                      }
                    </span>
                    <button type="button" (click)="store.removeWare(activeSection(), item.id)">Remove</button>
                  </div>

                  @if (item.children.length) {
                    <ul class="child-list">
                      @for (child of item.children; track child.id) {
                        <li>
                          <div class="editor-row child-row">
                            <span class="item-name">{{ child.name }}</span>
                            <span class="muted">
                              ESS {{ child.essence }} · {{ child.cost | number }}¥
                            </span>
                            <button type="button" (click)="store.removeWare(activeSection(), child.id)">
                              Remove
                            </button>
                          </div>
                        </li>
                      }
                    </ul>
                  }

                  @if (selectedParentId() === item.id && childCatalog().length) {
                    <div class="child-panel">
                      <h5>Add to {{ item.name }}</h5>
                      <ul class="editor-list">
                        @for (childEntry of childCatalog(); track childEntry.name) {
                          <li>
                            <div class="editor-row">
                              <span class="item-name">{{ childEntry.name }}</span>
                              <span class="muted">{{ summarizeItem(childEntry) }}</span>
                              <button
                                type="button"
                                [disabled]="!canAddChild(item, childEntry)"
                                (click)="installChild(item.id, childEntry)"
                              >
                                Add
                              </button>
                            </div>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: `
    h2, h3, h4, h5 { margin: 0 0 0.75rem; }
    h4 { margin-top: 1.25rem; font-size: 1rem; }
    h5 { font-size: 0.9375rem; margin-top: 0.5rem; }

    .essence-summary, .nuyen-summary { margin: 0 0 1rem; }
    .overspent { color: var(--color-danger, #c0392b); }

    .section-nav {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .section-btn {
      &.active {
        border-color: var(--color-accent);
        background: var(--color-surface-raised);
        font-weight: 600;
      }
    }

    .filter-toolbar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .catalog-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;

      th, td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
        text-align: left;
        vertical-align: top;
      }
    }

    .editor-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .editor-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.35rem 0;
    }

    .child-list {
      list-style: none;
      padding-left: 1.25rem;
      margin: 0;
    }

    .child-row { font-size: 0.9375rem; }

    .item-name, .select-btn {
      min-width: 10rem;
      font-weight: 500;
      text-align: left;
    }

    .select-btn.selected {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
    }

    .inline-grade select { max-width: 12rem; margin-right: 0.35rem; }
    .inline-rating input { width: 4rem; margin-right: 0.35rem; }
    .child-panel { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); }
    .muted { color: var(--color-text-muted); }

    input, select, button {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
    }

    button { cursor: pointer; }
    button:hover:not(:disabled) { border-color: var(--color-accent); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

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
export class CyberwareTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;
  readonly getCatalogMaxRating = getCatalogMaxRating;
  readonly isRatedWareEntry = isRatedWareEntry;

  readonly sections: Array<{ id: WareSection; label: string }> = [
    { id: 'cyberware', label: 'Cyberware' },
    { id: 'bioware', label: 'Bioware' },
  ];

  readonly activeSection = signal<WareSection>('cyberware');
  readonly selectedParentId = signal<string | null>(null);
  readonly pendingGrades = signal<Record<string, string>>({});
  readonly pendingRatings = signal<Record<string, number>>({});

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly activeSectionLabel = computed(() =>
    this.activeSection() === 'cyberware' ? 'Cyberware' : 'Bioware',
  );

  readonly filteredCatalog = computed(() => {
    const kind = this.activeSection();
    const catalog = kind === 'cyberware'
      ? [...this.store.cyberwareCatalog().values()]
      : [...this.store.biowareCatalog().values()];
    return this.filterCatalog(catalog, this.searchModel().query);
  });

  readonly ownedWare = computed(() => {
    const character = this.store.character();
    if (!character) return [] as CharacterWare[];
    return this.activeSection() === 'cyberware' ? character.cyberware : character.bioware;
  });

  readonly childCatalog = computed(() => {
    const parentId = this.selectedParentId();
    const character = this.store.character();
    if (!parentId || !character) return [] as WareCatalogEntry[];

    const parent = this.ownedWare().find((item) => item.id === parentId);
    if (!parent || calculateParentCapacityTotal(parent.capacity) <= 0) {
      return [] as WareCatalogEntry[];
    }

    const kind = this.activeSection();
    const catalog = kind === 'cyberware'
      ? [...this.store.cyberwareCatalog().values()]
      : [...this.store.biowareCatalog().values()];
    const remaining =
      calculateParentCapacityTotal(parent.capacity) - calculateWareCapacityUsed(parent);

    return sortByName(
      catalog.filter((entry) => {
        const capacity = String(entry.capacity ?? '');
        if (!capacity.includes('[')) return false;
        const cost = parseCapacityCost(capacity);
        return cost <= remaining;
      }) as ChummerItem[],
    ) as WareCatalogEntry[];
  });

  wareCapacityTotal(capacity: string): number {
    return calculateParentCapacityTotal(capacity);
  }

  wareCapacityUsed(item: CharacterWare): number {
    return calculateWareCapacityUsed(item);
  }

  canAdd(name: string): boolean {
    return this.store.canInstallWare(this.activeSection(), name).met;
  }

  canAddChild(parent: CharacterWare, entry: WareCatalogEntry): boolean {
    if (!this.canAdd(entry.name)) return false;
    const cost = parseCapacityCost(String(entry.capacity ?? '0'));
    const remaining =
      calculateParentCapacityTotal(parent.capacity) - calculateWareCapacityUsed(parent);
    return cost <= remaining;
  }

  catalogGrade(name: string): string {
    return this.pendingGrades()[name] ?? 'Standard';
  }

  catalogRating(name: string): number {
    return this.pendingRatings()[name] ?? 1;
  }

  setPendingGrade(name: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.pendingGrades.update((current) => ({ ...current, [name]: value }));
  }

  setPendingRating(name: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.pendingRatings.update((current) => ({ ...current, [name]: value }));
  }

  installItem(item: WareCatalogEntry): void {
    this.store.installWare(
      this.activeSection(),
      item.name,
      this.catalogGrade(item.name),
      this.catalogRating(item.name),
    );
  }

  installChild(parentId: string, entry: WareCatalogEntry): void {
    this.store.installWare(
      this.activeSection(),
      entry.name,
      'Standard',
      this.catalogRating(entry.name),
      parentId,
    );
  }

  toggleParentSelection(id: string): void {
    this.selectedParentId.update((current) => (current === id ? null : id));
  }

  onGradeChange(id: string, event: Event): void {
    const grade = (event.target as HTMLSelectElement).value;
    this.store.setWareGrade(this.activeSection(), id, grade);
  }

  onRatingChange(id: string, event: Event): void {
    const rating = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(rating)) return;
    this.store.setWareRating(this.activeSection(), id, rating);
  }

  isRatedOwnedItem(item: CharacterWare): boolean {
    const entry = this.catalogEntry(item.name);
    return entry ? isRatedWareEntry(entry) : false;
  }

  maxOwnedRating(item: CharacterWare): number {
    const entry = this.catalogEntry(item.name);
    return entry ? getCatalogMaxRating(entry) : item.rating;
  }

  summarizeItem(item: WareCatalogEntry): string {
    return itemSummary(item as ChummerItem);
  }

  private catalogEntry(name: string): WareCatalogEntry | undefined {
    const kind = this.activeSection();
    return kind === 'cyberware'
      ? this.store.cyberwareCatalog().get(name)
      : this.store.biowareCatalog().get(name);
  }

  private filterCatalog(items: WareCatalogEntry[], query: string): WareCatalogEntry[] {
    const scope = this.filter.scope();
    const filtered = items.filter((item) => {
      if (!matchesSourceScope(item as ChummerItem, scope)) return false;
      if (!matchesSearch(item as ChummerItem, query)) return false;
      return true;
    });
    return sortByName(filtered as ChummerItem[]) as WareCatalogEntry[];
  }
}
