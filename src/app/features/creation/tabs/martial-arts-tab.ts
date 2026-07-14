import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { ContentFilterService } from '../../../core/services/content-filter.service';
import { contentSourceScopeLabel } from '../../../core/models/content-source-scope';
import { type CharacterMartialArt } from '../../../core/rules';
import { matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

function martialArtsEqual(a: CharacterMartialArt[], b: CharacterMartialArt[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((art, index) => {
    const other = b[index];
    return art.name === other.name && art.rating === other.rating;
  });
}

@Component({
  selector: 'app-martial-arts-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="martial-arts-heading">
        <h2 id="martial-arts-heading">Martial Arts</h2>

        <div class="subsection" aria-labelledby="styles-heading">
          <div class="section-header">
            <h3 id="styles-heading">Styles</h3>
            <p class="muted">Each rating costs {{ store.options().bpMartialArt }} BP</p>
          </div>

          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search martial arts</span>
              <input
                type="search"
                placeholder="Search styles…"
                [formField]="styleSearchForm.query"
              />
            </label>
            <app-source-filter-control />
            <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
          </div>

          <table class="catalog-table">
            <caption class="sr-only">Martial arts style catalog</caption>
            <thead>
              <tr>
                <th scope="col">Style</th>
                <th scope="col">Source</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (style of filteredStyles(); track style.name) {
                <tr>
                  <td>{{ style.name }}</td>
                  <td>{{ style.source }} p.{{ style.page }}</td>
                  <td>
                    @if (hasStyle(style.name)) {
                      <span class="muted">Added</span>
                    } @else {
                      <button
                        type="button"
                        (click)="store.addMartialArt({ name: style.name, rating: 1, source: stringField(style.source), page: stringField(style.page) })"
                      >
                        Add
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (character.martialArts.length) {
            <h4>Character styles</h4>
            <ul class="editor-list">
              @for (art of character.martialArts; track art.name; let i = $index) {
                <li>
                  <div class="editor-row">
                    <span class="item-name">{{ art.name }}</span>
                    <label>
                      <span class="sr-only">Rating for {{ art.name }}</span>
                      <input
                        type="number"
                        [formField]="martialArtsForm[i].rating"
                      />
                    </label>
                    <span class="muted">{{ art.rating * store.options().bpMartialArt }} BP</span>
                    <button type="button" (click)="store.removeMartialArt(art.name)">Remove</button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>

        <div class="subsection" aria-labelledby="maneuvers-heading">
          <div class="section-header">
            <h3 id="maneuvers-heading">Maneuvers</h3>
            <p class="muted">Each maneuver costs {{ store.options().bpMartialArtManeuver }} BP</p>
          </div>

          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search maneuvers</span>
              <input
                type="search"
                placeholder="Search maneuvers…"
                [formField]="maneuverSearchForm.query"
              />
            </label>
            <app-source-filter-control />
          </div>

          <table class="catalog-table">
            <caption class="sr-only">Martial arts maneuver catalog</caption>
            <thead>
              <tr>
                <th scope="col">Maneuver</th>
                <th scope="col">Source</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (maneuver of filteredManeuvers(); track maneuver.name) {
                <tr>
                  <td>{{ maneuver.name }}</td>
                  <td>{{ maneuver.source }} p.{{ maneuver.page }}</td>
                  <td>
                    @if (hasManeuver(maneuver.name)) {
                      <span class="muted">Added</span>
                    } @else {
                      <button
                        type="button"
                        (click)="store.addMartialArtManeuver(maneuver.name, stringField(maneuver.source), stringField(maneuver.page))"
                      >
                        Add
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (character.martialArtManeuvers.length) {
            <h4>Character maneuvers</h4>
            <ul class="editor-list">
              @for (maneuver of character.martialArtManeuvers; track maneuver.id) {
                <li>
                  <div class="editor-row">
                    <span class="item-name">{{ maneuver.name }}</span>
                    <button type="button" (click)="store.removeMartialArtManeuver(maneuver.id)">
                      Remove
                    </button>
                  </div>
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
    h4 { font-size: 0.95rem; margin-top: 1rem; }

    .subsection {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
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

      th { color: var(--color-text-muted); font-weight: 500; }
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

    .item-name {
      min-width: 10rem;
      font-weight: 500;
    }

    .muted { color: var(--color-text-muted); }

    input, button {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
    }

    button { cursor: pointer; }
    button:hover { border-color: var(--color-accent); }

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
export class MartialArtsTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly styleSearchModel = signal({ query: '' });
  readonly styleSearchForm = form(this.styleSearchModel);

  readonly maneuverSearchModel = signal({ query: '' });
  readonly maneuverSearchForm = form(this.maneuverSearchModel);

  readonly martialArtsModel = linkedSignal(() =>
    (this.store.character()?.martialArts ?? []).map((art) => ({ ...art })),
  );
  readonly martialArtsForm = form(this.martialArtsModel);

  readonly filteredStyles = computed(() => {
    const query = this.styleSearchModel().query;
    const scope = this.filter.scope();
    return sortByName(
      this.store.martialArtCatalog().filter(
        (item) =>
          matchesSourceScope(item, scope) && matchesSearch(item, query),
      ),
    );
  });

  readonly filteredManeuvers = computed(() => {
    const query = this.maneuverSearchModel().query;
    const scope = this.filter.scope();
    return sortByName(
      this.store.maneuverCatalog().filter(
        (item) =>
          matchesSourceScope(item, scope) && matchesSearch(item, query),
      ),
    );
  });

  constructor() {
    effect(() => {
      const next = this.martialArtsModel();
      const current = this.store.character()?.martialArts ?? [];
      if (martialArtsEqual(current, next)) return;
      untracked(() => this.store.syncMartialArts(next));
    });
  }

  hasStyle(name: string): boolean {
    return this.store.character()?.martialArts.some((art) => art.name === name) ?? false;
  }

  hasManeuver(name: string): boolean {
    return (
      this.store.character()?.martialArtManeuvers.some((maneuver) => maneuver.name === name) ??
      false
    );
  }

  stringField(value: string | number | undefined): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
  }
}
