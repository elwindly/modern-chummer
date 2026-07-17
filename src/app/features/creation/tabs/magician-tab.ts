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
import { SpellCatalogEntry } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-magician-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="magician-heading">
        <h2 id="magician-heading">Magician</h2>

        <div class="field-row">
          <label for="tradition-select">
            <span class="field-label">Tradition</span>
            <select
              id="tradition-select"
              [value]="character.magicTradition ?? ''"
              (change)="onTraditionChange($event)"
            >
              <option value="">Select tradition…</option>
              @for (tradition of store.traditionCatalog(); track tradition.name) {
                <option [value]="tradition.name">{{ tradition.name }}</option>
              }
            </select>
          </label>
        </div>

        @if (mentorSpiritName(); as mentor) {
          <p class="mentor-readout muted" role="status">
            Mentor spirit: <strong>{{ mentor }}</strong>
          </p>
        }

        <p class="spell-limit status-panel" role="status">
          Spells: <strong>{{ character.spells.length }}</strong>
          / {{ store.getSpellLimit() }}
          @if (character.spells.length >= store.getSpellLimit() && !character.ignoreRules) {
            <span class="warn"> (at limit)</span>
          }
        </p>

        <div class="filter-toolbar">
          <label>
            <span class="sr-only">Search spells</span>
            <input type="search" placeholder="Search spells…" [formField]="searchForm.query" />
          </label>
          <app-source-filter-control />
          <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
        </div>

        <div class="spell-flags-toolbar" aria-label="Spell options when adding">
          <label class="checkbox-label">
            <input type="checkbox" [checked]="addLimited()" (change)="addLimited.set($any($event.target).checked)" />
            Limited
          </label>
          <label class="checkbox-label">
            <input type="checkbox" [checked]="addExtended()" (change)="addExtended.set($any($event.target).checked)" />
            Extended
          </label>
        </div>

        <table class="catalog-table">
          <caption class="sr-only">Spell catalog</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (spell of filteredSpells(); track spell.name) {
              <tr>
                <td>{{ spell.name }}</td>
                <td class="muted">{{ spellCategory(spell) }}</td>
                <td>
                  <button
                    type="button"
                    (click)="addSpell(spell.name)"
                    [disabled]="hasSpell(spell.name)"
                  >
                    Add
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (character.spells.length) {
          <h3>Known spells</h3>
          <ul class="editor-list">
            @for (spell of character.spells; track spell.id) {
              <li class="editor-row">
                <span class="item-name">{{ spell.name }}</span>
                <span class="muted">{{ spell.category }}</span>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="spell.limited ?? false"
                    (change)="toggleSpellFlag(spell.id, 'limited', $event)"
                  />
                  Limited
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="spell.extended ?? false"
                    (change)="toggleSpellFlag(spell.id, 'extended', $event)"
                  />
                  Extended
                </label>
                <button type="button" (click)="store.removeSpell(spell.id)">Remove</button>
              </li>
            }
          </ul>
        }

        <h3>Spirits</h3>
        <div class="spirit-add-panel">
          @if (traditionSpirits().length) {
            <label>
              <span class="field-label">Spirit type</span>
              <select [value]="spiritName()" (change)="onSpiritNameChange($event)">
                <option value="">Select spirit…</option>
                @for (spirit of traditionSpirits(); track spirit) {
                  <option [value]="spirit">{{ spirit }}</option>
                }
                <option value="__custom__">Custom name…</option>
              </select>
            </label>
          }
          @if (!traditionSpirits().length || spiritName() === '__custom__') {
            <label>
              <span class="field-label">Spirit name</span>
              <input type="text" [formField]="spiritForm.name" placeholder="Spirit name" />
            </label>
          }
          <label>
            <span class="field-label">Force</span>
            <input type="number" [formField]="spiritForm.force" />
          </label>
          <label>
            <span class="field-label">Services owed</span>
            <input type="number" [formField]="spiritForm.services" />
          </label>
          <button type="button" (click)="addSpirit()">Add spirit</button>
        </div>

        @if (ownedSpirits().length) {
          <ul class="editor-list">
            @for (spirit of ownedSpirits(); track spirit.id) {
              <li class="editor-row">
                <span class="item-name">{{ spirit.name }}</span>
                <span class="muted">Force {{ spirit.force }} · Services {{ spirit.servicesOwed }}</span>
                <button type="button" (click)="store.removeSpirit(spirit.id)">Remove</button>
              </li>
            }
          </ul>
        } @else {
          <p class="muted">No spirits yet.</p>
        }
      </section>
    }
  `,
  styles: `
    h2, h3 { margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }

    .field-row { margin-bottom: 1rem; }
    .field-label { display: block; margin-bottom: 0.25rem; font-weight: 500; }

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

    .filter-toolbar, .spell-flags-toolbar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.875rem;
    }

    .spirit-add-panel {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: end;
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
    .warn { color: var(--color-danger); }
    .spell-limit, .mentor-readout { margin: 0 0 1rem; }

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
export class MagicianTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly addLimited = signal(false);
  readonly addExtended = signal(false);

  readonly spiritName = signal('');
  readonly spiritModel = signal({ name: '', force: 1, services: 0 });
  readonly spiritForm = form(this.spiritModel);

  readonly filteredSpells = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.spellCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as SpellCatalogEntry[];
  });

  readonly mentorSpiritName = computed(() => {
    const character = this.store.character();
    if (!character) return null;
    return character.qualities.find((quality) => quality.includes('Mentor')) ?? null;
  });

  readonly traditionSpirits = computed(() => {
    const character = this.store.character();
    if (!character?.magicTradition) return [] as string[];
    const tradition = this.store.traditionCatalog().find(
      (entry) => entry.name === character.magicTradition,
    );
    return tradition?.spirits ?? [];
  });

  readonly ownedSpirits = computed(() => {
    const character = this.store.character();
    if (!character) return [];
    return character.spirits.filter((spirit) => !spirit.sprite);
  });

  onTraditionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.store.setMagicTradition(value);
      this.spiritName.set('');
    }
  }

  onSpiritNameChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.spiritName.set(value);
    if (value && value !== '__custom__') {
      this.spiritModel.update((current) => ({ ...current, name: value }));
    }
  }

  addSpell(name: string): void {
    this.store.addSpell(name, {
      limited: this.addLimited(),
      extended: this.addExtended(),
    });
  }

  addSpirit(): void {
    const model = this.spiritModel();
    const name = model.name.trim();
    if (!name) return;
    this.store.addSpirit(name, model.force, model.services, false);
    this.spiritModel.set({ name: '', force: 1, services: 0 });
    this.spiritName.set('');
  }

  toggleSpellFlag(id: string, flag: 'limited' | 'extended', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.store.setSpellFlags(id, { [flag]: checked });
  }

  hasSpell(name: string): boolean {
    return this.store.character()?.spells.some((spell) => spell.name === name) ?? false;
  }

  spellCategory(spell: SpellCatalogEntry): string {
    return categoryLabel(spell as ChummerItem);
  }
}
