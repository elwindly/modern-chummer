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
import { PowerCatalogEntry } from '../../../core/rules';
import { matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-adept-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="adept-heading">
        <h2 id="adept-heading">Adept</h2>

        @if (store.powerPointBreakdown(); as pp) {
          <p class="pp-summary status-panel" role="status">
            Power points:
            <strong>{{ pp.used }}</strong> / {{ pp.pool }} used
            · Remaining: <strong [class.overspent]="pp.remaining < 0">{{ pp.remaining }}</strong>
          </p>
        }

        @if (character.flags.magicianEnabled && character.flags.adeptEnabled) {
          <div class="field-row">
            <label for="mag-adept-split">
              <span class="field-label">MAG for adept powers (mystic adept split)</span>
              <input
                id="mag-adept-split"
                type="number"
                min="0"
                [max]="store.getAttributeValue('MAG')"
                [value]="character.magAdept ?? 0"
                (change)="onMagAdeptChange($event)"
              />
            </label>
          </div>
        }

        <div class="filter-toolbar">
          <label>
            <span class="sr-only">Search powers</span>
            <input type="search" placeholder="Search powers…" [formField]="searchForm.query" />
          </label>
          <app-source-filter-control />
          <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
        </div>

        <table class="catalog-table">
          <caption class="sr-only">Adept power catalog</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Cost</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (power of filteredPowers(); track power.name) {
              <tr>
                <td>{{ power.name }}</td>
                <td class="muted">{{ powerCostLabel(power) }}</td>
                <td>
                  @if (isLeveled(power)) {
                    <label class="inline-rating">
                      <span class="sr-only">Rating for {{ power.name }}</span>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        [value]="pendingRating(power.name)"
                        (change)="setPendingRating(power.name, $event)"
                      />
                    </label>
                  }
                  @if (requiresSelection(power)) {
                    <span class="muted selection-note">Requires selection</span>
                  }
                  <button
                    type="button"
                    (click)="addPower(power)"
                    [disabled]="hasPower(power.name)"
                  >
                    Add
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (character.powers.length) {
          <h3>Adept powers</h3>
          <ul class="editor-list">
            @for (power of character.powers; track power.id) {
              <li class="editor-row">
                <span class="item-name">{{ power.name }}</span>
                @if (power.levels) {
                  <label>
                    <span class="sr-only">Rating for {{ power.name }}</span>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      [value]="power.rating"
                      (change)="onPowerRatingChange(power.id, $event)"
                    />
                  </label>
                }
                <span class="muted">{{ power.totalPoints }} PP</span>
                <button type="button" (click)="store.removePower(power.id)">Remove</button>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: `
    h2, h3 { margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }

    .field-row { margin-bottom: 1rem; }
    .field-label { display: block; margin-bottom: 0.25rem; font-weight: 500; }

    .pp-summary { margin: 0 0 1rem; }
    .overspent { color: var(--color-danger); font-weight: 600; }

    .filter-toolbar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .catalog-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
      font-size: 0.9rem;

      th, td {
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid var(--color-border);
        text-align: left;
        vertical-align: top;
      }
    }

    .editor-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .editor-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .item-name { min-width: 10rem; font-weight: 500; }
    .inline-rating input { width: 4rem; margin-right: 0.35rem; }
    .selection-note { font-size: 0.8125rem; margin-right: 0.35rem; }
    .muted { color: var(--color-text-muted); }

    select, input, button {
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
export class AdeptTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);
  readonly pendingRatings = signal<Record<string, number>>({});

  readonly filteredPowers = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.powerCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as PowerCatalogEntry[];
  });

  onMagAdeptChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.store.setMagAdept(value);
    }
  }

  isLeveled(power: PowerCatalogEntry): boolean {
    return String(power.levels ?? 'no').toLowerCase() === 'yes';
  }

  powerCostLabel(power: PowerCatalogEntry): string {
    const points = power.points ?? '0';
    return this.isLeveled(power) ? `${points} PP/level` : `${points} PP`;
  }

  pendingRating(name: string): number {
    return this.pendingRatings()[name] ?? 1;
  }

  setPendingRating(name: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.pendingRatings.update((current) => ({
      ...current,
      [name]: Number.isFinite(value) ? value : 1,
    }));
  }

  addPower(power: PowerCatalogEntry): void {
    this.store.applyAdeptPower(power.name, this.pendingRating(power.name));
  }

  requiresSelection(power: PowerCatalogEntry): boolean {
    return this.store.powerRequiresSelection(power.name);
  }

  hasPower(name: string): boolean {
    return this.store.character()?.powers.some((power) => power.name === name) ?? false;
  }

  onPowerRatingChange(id: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.store.setPowerRating(id, value);
    }
  }
}
