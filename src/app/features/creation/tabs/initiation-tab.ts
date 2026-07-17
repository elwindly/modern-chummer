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
import { MetamagicCatalogEntry } from '../../../core/rules';
import { matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-initiation-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="initiation-heading">
        <h2 id="initiation-heading">Initiation & {{ metamagicLabel() }}</h2>

        <div class="grade-panel">
          <h3>Initiation grades</h3>
          <div class="grade-actions">
            <label>
              <input type="checkbox" [checked]="gradeGroup()" (change)="gradeGroup.set($any($event.target).checked)" />
              Group initiation
            </label>
            <label>
              <input type="checkbox" [checked]="gradeOrdeal()" (change)="gradeOrdeal.set($any($event.target).checked)" />
              Ordeal
            </label>
            <button type="button" (click)="addGrade()">Add grade</button>
          </div>

          @if (character.initiationGrades.length) {
            <ul class="editor-list">
              @for (grade of character.initiationGrades; track grade.id) {
                <li class="editor-row">
                  <span class="item-name">
                    Grade {{ grade.grade }}
                    @if (grade.technomancer) { (Submersion) }
                  </span>
                  <span class="muted">
                    @if (grade.group) { Group }
                    @if (grade.ordeal) { Ordeal }
                  </span>
                  <button type="button" (click)="store.removeInitiationGrade(grade.id)">Remove</button>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">No initiation grades yet.</p>
          }
        </div>

        <div class="metamagic-panel">
          <h3>{{ metamagicLabel() }}</h3>
          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search {{ metamagicLabel().toLowerCase() }}</span>
              <input type="search" [placeholder]="'Search ' + metamagicLabel().toLowerCase() + '…'" [formField]="searchForm.query" />
            </label>
            <app-source-filter-control />
            <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
          </div>

          <table class="catalog-table">
            <caption class="sr-only">{{ metamagicLabel() }} catalog</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of filteredMetamagic(); track entry.name) {
                <tr>
                  <td>{{ entry.name }}</td>
                  <td>
                    <button
                      type="button"
                      (click)="store.addMetamagic(entry.name)"
                      [disabled]="hasMetamagic(entry.name)"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (character.metamagics.length) {
            <h4>Selected {{ metamagicLabel().toLowerCase() }}</h4>
            <ul class="editor-list">
              @for (entry of character.metamagics; track entry.id) {
                <li class="editor-row">
                  <span class="item-name">{{ entry.name }}</span>
                  <button type="button" (click)="store.removeMetamagic(entry.id)">Remove</button>
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: `
    h2, h3, h4 { margin: 0 0 0.75rem; }
    h3, h4 { font-size: 1rem; margin-top: 1.25rem; }

    .grade-panel, .metamagic-panel { margin-bottom: 1.5rem; }

    .grade-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.75rem;
    }

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
    .muted { color: var(--color-text-muted); margin: 0; }

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
export class InitiationTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly gradeGroup = signal(false);
  readonly gradeOrdeal = signal(false);
  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly filteredMetamagic = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.metamagicCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as MetamagicCatalogEntry[];
  });

  readonly metamagicLabel = computed(() =>
    this.store.character()?.flags.resEnabled ? 'Echoes' : 'Metamagic',
  );

  addGrade(): void {
    this.store.addInitiationGrade({
      group: this.gradeGroup(),
      ordeal: this.gradeOrdeal(),
    });
    this.gradeGroup.set(false);
    this.gradeOrdeal.set(false);
  }

  hasMetamagic(name: string): boolean {
    return this.store.character()?.metamagics.some((entry) => entry.name === name) ?? false;
  }
}
