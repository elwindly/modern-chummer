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
import { CritterPowerCatalogEntry } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-critter-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="critter-heading">
        <h2 id="critter-heading">Critter Powers</h2>

        <div class="filter-toolbar">
          <label>
            <span class="sr-only">Search critter powers</span>
            <input type="search" placeholder="Search powers…" [formField]="searchForm.query" />
          </label>
          <app-source-filter-control />
          <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
        </div>

        <table class="catalog-table">
          <caption class="sr-only">Critter power catalog</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (power of filteredPowers(); track power.name) {
              <tr>
                <td>{{ power.name }}</td>
                <td class="muted">{{ powerCategory(power) }}</td>
                <td>
                  <button
                    type="button"
                    (click)="store.addCritterPower(power.name)"
                    [disabled]="hasPower(power.name)"
                  >
                    Add
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (character.critterPowers.length) {
          <h3>Selected powers</h3>
          <ul class="editor-list">
            @for (power of character.critterPowers; track power.id) {
              <li class="editor-row">
                <span class="item-name">{{ power.name }}</span>
                <button type="button" (click)="store.removeCritterPower(power.id)">Remove</button>
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
    .muted { color: var(--color-text-muted); }

    input, button {
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
export class CritterTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly filteredPowers = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.critterPowerCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as CritterPowerCatalogEntry[];
  });

  hasPower(name: string): boolean {
    return this.store.character()?.critterPowers.some((power) => power.name === name) ?? false;
  }

  powerCategory(power: CritterPowerCatalogEntry): string {
    return categoryLabel(power as ChummerItem);
  }
}
