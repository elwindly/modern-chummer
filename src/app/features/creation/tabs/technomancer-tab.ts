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
import { ProgramCatalogEntry, getCatalogMaxRating, isRatedCatalogEntry } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-technomancer-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="technomancer-heading">
        <h2 id="technomancer-heading">Technomancer</h2>

        <div class="field-row">
          <label for="stream-select">
            <span class="field-label">Stream</span>
            <select
              id="stream-select"
              [value]="character.technomancerStream ?? ''"
              (change)="onStreamChange($event)"
            >
              <option value="">Select stream…</option>
              @for (stream of store.streamCatalog(); track stream.name) {
                <option [value]="stream.name">{{ stream.name }}</option>
              }
            </select>
          </label>
        </div>

        @if (store.derivedStats(); as stats) {
          @if (stats.matrixInitiativeBonus) {
            <p class="living-persona status-panel" role="status">
              Living persona matrix initiative bonus:
              <strong>+{{ stats.matrixInitiativeBonus }}</strong>
            </p>
          }
        }

        <h3>Sprites</h3>
        <div class="sprite-add-panel">
          <label>
            <span class="field-label">Sprite name</span>
            <input type="text" [formField]="spriteForm.name" placeholder="Sprite name" />
          </label>
          <label>
            <span class="field-label">Force</span>
            <input type="number" [formField]="spriteForm.force" />
          </label>
          <label>
            <span class="field-label">Services owed</span>
            <input type="number" [formField]="spriteForm.services" />
          </label>
          <button type="button" (click)="addSprite()">Add sprite</button>
        </div>

        @if (ownedSprites().length) {
          <ul class="editor-list">
            @for (sprite of ownedSprites(); track sprite.id) {
              <li class="editor-row">
                <span class="item-name">{{ sprite.name }}</span>
                <span class="muted">Force {{ sprite.force }} · Services {{ sprite.servicesOwed }}</span>
                <button type="button" (click)="store.removeSpirit(sprite.id)">Remove</button>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">No sprites yet.</p>
        }

        <h3>Complex forms</h3>

        <div class="filter-toolbar">
          <label>
            <span class="sr-only">Search complex forms</span>
            <input type="search" placeholder="Search complex forms…" [formField]="searchForm.query" />
          </label>
          <app-source-filter-control />
          <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
        </div>

        <table class="catalog-table">
          <caption class="sr-only">Complex form catalog</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (program of filteredPrograms(); track program.name) {
              <tr>
                <td>{{ program.name }}</td>
                <td class="muted">{{ programCategory(program) }}</td>
                <td>
                  @if (isRated(program)) {
                    <label class="inline-rating">
                      <span class="sr-only">Rating for {{ program.name }}</span>
                      <input
                        type="number"
                        min="1"
                        [max]="maxRating(program)"
                        [value]="pendingRating(program.name)"
                        (change)="setPendingRating(program.name, $event)"
                      />
                    </label>
                  }
                  <button
                    type="button"
                    (click)="addProgram(program)"
                    [disabled]="hasProgram(program.name)"
                  >
                    Add
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (character.programs.length) {
          <h3>Known complex forms</h3>
          <ul class="editor-list">
            @for (program of character.programs; track program.id) {
              <li class="editor-row program-row">
                <button
                  type="button"
                  class="select-btn"
                  [class.selected]="selectedProgramId() === program.id"
                  (click)="selectedProgramId.set(program.id)"
                >
                  {{ program.name }}
                </button>
                <label>
                  <span class="sr-only">Rating for {{ program.name }}</span>
                  <input
                    type="number"
                    min="1"
                    [max]="program.maxRating"
                    [value]="program.rating"
                    (change)="onProgramRatingChange(program.id, $event)"
                  />
                </label>
                <span class="muted">Rating {{ program.rating }}</span>
                <button type="button" (click)="store.removeProgram(program.id)">Remove</button>
              </li>
            }
          </ul>
        }

        @if (selectedProgram(); as program) {
          <div class="options-panel">
            <h4>Options for {{ program.name }}</h4>
            <div class="option-add-row">
              <label>
                <span class="sr-only">Option name</span>
                <input type="text" placeholder="Option name" [formField]="optionForm.name" />
              </label>
              <button type="button" (click)="addProgramOption(program.id)">Add option</button>
            </div>
            @if (program.options.length) {
              <ul class="editor-list">
                @for (option of program.options; track option.id) {
                  <li class="editor-row">
                    <span>{{ option.name }}</span>
                    <button type="button" (click)="store.removeProgramOption(program.id, option.id)">
                      Remove
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">No options yet.</p>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    h2, h3, h4 { margin: 0 0 0.75rem; }
    h3, h4 { font-size: 1rem; margin-top: 1.25rem; }

    .field-row { margin-bottom: 1rem; }
    .field-label { display: block; margin-bottom: 0.25rem; font-weight: 500; }

    .living-persona { margin: 0 0 1rem; }

    .sprite-add-panel, .option-add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: end;
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

    .program-row { margin-bottom: 0.25rem; }

    .item-name, .select-btn { min-width: 10rem; font-weight: 500; text-align: left; }

    .select-btn.selected {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
    }

    .options-panel {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .inline-rating input { width: 4rem; margin-right: 0.35rem; }
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
export class TechnomancerTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);
  readonly pendingRatings = signal<Record<string, number>>({});
  readonly selectedProgramId = signal<string | null>(null);

  readonly spriteModel = signal({ name: '', force: 1, services: 0 });
  readonly spriteForm = form(this.spriteModel);

  readonly optionModel = signal({ name: '' });
  readonly optionForm = form(this.optionModel);

  readonly filteredPrograms = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.programCatalog().values()].filter(
      (item) => String(item.complexform ?? '').toLowerCase() === 'yes',
    );
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as ProgramCatalogEntry[];
  });

  readonly ownedSprites = computed(() => {
    const character = this.store.character();
    if (!character) return [];
    return character.spirits.filter((spirit) => spirit.sprite);
  });

  readonly selectedProgram = computed(() => {
    const id = this.selectedProgramId();
    const character = this.store.character();
    if (!id || !character) return null;
    return character.programs.find((program) => program.id === id) ?? null;
  });

  onStreamChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.store.setTechnomancerStream(value);
    }
  }

  addSprite(): void {
    const model = this.spriteModel();
    const name = model.name.trim();
    if (!name) return;
    this.store.addSpirit(name, model.force, model.services, true);
    this.spriteModel.set({ name: '', force: 1, services: 0 });
  }

  addProgramOption(programId: string): void {
    const name = this.optionModel().name.trim();
    if (!name) return;
    this.store.addProgramOption(programId, name);
    this.optionModel.set({ name: '' });
  }

  isRated(program: ProgramCatalogEntry): boolean {
    return isRatedCatalogEntry(program);
  }

  maxRating(program: ProgramCatalogEntry): number {
    return getCatalogMaxRating(program);
  }

  programCategory(program: ProgramCatalogEntry): string {
    return categoryLabel(program as ChummerItem);
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

  addProgram(program: ProgramCatalogEntry): void {
    this.store.addProgram(program.name, this.pendingRating(program.name));
  }

  hasProgram(name: string): boolean {
    return this.store.character()?.programs.some((program) => program.name === name) ?? false;
  }

  onProgramRatingChange(id: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.store.setProgramRating(id, value);
    }
  }
}
