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
  CharacterStreetItem,
  getCatalogMaxRating,
  isRatedCatalogEntry,
  listWeaponAccessoryNames,
  StreetCatalogEntry,
} from '../../../core/rules';
import { itemSummary, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

type StreetSection = 'gear' | 'weapons' | 'armor' | 'lifestyle' | 'pets';

@Component({
  selector: 'app-street-gear-tab',
  imports: [DecimalPipe, FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="street-gear-heading">
        <h2 id="street-gear-heading">Street Gear</h2>

        @if (store.nuyenBreakdown(); as nuyen) {
          <p class="nuyen-summary" role="status">
            Remaining nuyen:
            <strong [class.overspent]="nuyen.remaining < 0">{{ nuyen.remaining | number }}¥</strong>
            · Spent {{ nuyen.spent | number }}¥
          </p>
        }

        <nav class="section-nav" aria-label="Street gear sections">
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

        @if (activeSection() === 'gear') {
          <div class="subsection" aria-labelledby="gear-heading">
            <h3 id="gear-heading">Gear</h3>
            <div class="filter-toolbar">
              <label>
                <span class="sr-only">Search gear</span>
                <input type="search" placeholder="Search gear…" [formField]="gearSearchForm.query" />
              </label>
              <app-source-filter-control />
              <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
            </div>
            <table class="catalog-table">
              <caption class="sr-only">Gear catalog</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Details</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredGearCatalog(); track item.name) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td class="muted">{{ summarizeItem(item) }}</td>
                    <td>
                      @if (isRatedCatalogEntry(item)) {
                        <label class="inline-rating">
                          <span class="sr-only">Rating for {{ item.name }}</span>
                          <input
                            type="number"
                            min="1"
                            [max]="getCatalogMaxRating(item)"
                            [value]="catalogRating(item)"
                            (change)="setPendingRating(item.name, $event)"
                          />
                        </label>
                      }
                      <button type="button" (click)="addGearItem(item)">Add</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (character.gear.length) {
              <h4>Purchased gear</h4>
              <ul class="editor-list">
                @for (item of character.gear; track item.id) {
                  <li>
                    <div class="editor-row">
                      <span class="item-name">{{ item.name }}</span>
                      @if (isRatedGearItem(item)) {
                        <label>
                          <span class="sr-only">Rating for {{ item.name }}</span>
                          <input
                            type="number"
                            min="1"
                            [max]="maxGearRating(item)"
                            [value]="item.rating"
                            (change)="onRatingChange('gear', item.id, $event)"
                          />
                        </label>
                      }
                      <span class="muted">Avail {{ item.availability }} · {{ item.cost | number }}¥</span>
                      <button type="button" (click)="store.removeStreetItem('gear', item.id)">Remove</button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        }

        @if (activeSection() === 'weapons') {
          <div class="subsection" aria-labelledby="weapons-heading">
            <h3 id="weapons-heading">Weapons</h3>
            <div class="filter-toolbar">
              <label>
                <span class="sr-only">Search weapons</span>
                <input type="search" placeholder="Search weapons…" [formField]="weaponSearchForm.query" />
              </label>
              <app-source-filter-control />
            </div>
            <table class="catalog-table">
              <caption class="sr-only">Weapon catalog</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Details</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredWeaponCatalog(); track item.name) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td class="muted">{{ summarizeItem(item) }}</td>
                    <td>
                      <button type="button" (click)="store.addWeapon(item.name)">Add</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            @if (character.weapons.length) {
              <h4>Purchased weapons</h4>
              <ul class="editor-list">
                @for (item of character.weapons; track item.id) {
                  <li>
                    <div class="editor-row">
                      <button
                        type="button"
                        class="select-btn"
                        [class.selected]="selectedWeaponId() === item.id"
                        (click)="selectedWeaponId.set(item.id)"
                      >
                        {{ item.name }}
                      </button>
                      <span class="muted">Avail {{ item.availability }} · {{ item.cost | number }}¥</span>
                      <button type="button" (click)="store.removeStreetItem('weapons', item.id)">Remove</button>
                    </div>
                    @if (item.children.length) {
                      <ul class="child-list">
                        @for (child of item.children; track child.id) {
                          <li class="editor-row child-row">
                            <span>{{ child.name }}</span>
                            <span class="muted">Avail {{ child.availability }} · {{ child.cost | number }}¥</span>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ul>
            }

            @if (selectedWeapon(); as weapon) {
              <div class="child-panel">
                <h4>Accessories & mods for {{ weapon.name }}</h4>
                <h5>Accessories</h5>
                <table class="catalog-table">
                  <tbody>
                    @for (item of filteredWeaponAccessories(weapon.name); track item.name) {
                      <tr>
                        <td>{{ item.name }}</td>
                        <td class="muted">{{ summarizeItem(item) }}</td>
                        <td>
                          @if (hasChild(weapon, item.name)) {
                            <span class="muted">Added</span>
                          } @else {
                            <button type="button" (click)="store.addWeaponAccessory(weapon.id, item.name)">
                              Add
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                <h5>Modifications</h5>
                <table class="catalog-table">
                  <tbody>
                    @for (item of filteredWeaponMods(); track item.name) {
                      <tr>
                        <td>{{ item.name }}</td>
                        <td class="muted">{{ summarizeItem(item) }}</td>
                        <td>
                          @if (hasChild(weapon, item.name)) {
                            <span class="muted">Added</span>
                          } @else {
                            <button type="button" (click)="store.addWeaponMod(weapon.id, item.name, 1)">
                              Add
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (activeSection() === 'armor') {
          <div class="subsection" aria-labelledby="armor-heading">
            <h3 id="armor-heading">Armor</h3>
            <div class="filter-toolbar">
              <label>
                <span class="sr-only">Search armor</span>
                <input type="search" placeholder="Search armor…" [formField]="armorSearchForm.query" />
              </label>
              <app-source-filter-control />
            </div>
            <table class="catalog-table">
              <caption class="sr-only">Armor catalog</caption>
              <tbody>
                @for (item of filteredArmorCatalog(); track item.name) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td class="muted">{{ summarizeItem(item) }}</td>
                    <td>
                      <button type="button" (click)="store.addArmor(item.name)">Add</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            @if (character.armors.length) {
              <h4>Purchased armor</h4>
              <ul class="editor-list">
                @for (item of character.armors; track item.id) {
                  <li>
                    <div class="editor-row">
                      <button
                        type="button"
                        class="select-btn"
                        [class.selected]="selectedArmorId() === item.id"
                        (click)="selectedArmorId.set(item.id)"
                      >
                        {{ item.name }}
                      </button>
                      <span class="muted">Avail {{ item.availability }} · {{ item.cost | number }}¥</span>
                      <button type="button" (click)="store.removeStreetItem('armors', item.id)">Remove</button>
                    </div>
                    @if (item.children.length) {
                      <ul class="child-list">
                        @for (child of item.children; track child.id) {
                          <li class="editor-row child-row">
                            <span>{{ child.name }}</span>
                            <span class="muted">Avail {{ child.availability }} · {{ child.cost | number }}¥</span>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ul>
            }

            @if (selectedArmor(); as armor) {
              <div class="child-panel">
                <h4>Mods for {{ armor.name }}</h4>
                <table class="catalog-table">
                  <tbody>
                    @for (item of filteredArmorMods(); track item.name) {
                      <tr>
                        <td>{{ item.name }}</td>
                        <td class="muted">{{ summarizeItem(item) }}</td>
                        <td>
                          @if (hasChild(armor, item.name)) {
                            <span class="muted">Added</span>
                          } @else {
                            <button
                              type="button"
                              (click)="store.addArmorMod(armor.id, item.name, catalogRating(item))"
                            >
                              Add
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (activeSection() === 'lifestyle') {
          <div class="subsection" aria-labelledby="lifestyle-heading">
            <h3 id="lifestyle-heading">Lifestyle</h3>
            <div class="filter-toolbar">
              <label>
                <span class="sr-only">Search lifestyles</span>
                <input type="search" placeholder="Search lifestyles…" [formField]="lifestyleSearchForm.query" />
              </label>
              <app-source-filter-control />
            </div>
            <label class="months-row">
              <span>Months</span>
              <input
                type="number"
                min="1"
                [value]="lifestyleMonths()"
                (change)="onLifestyleMonthsChange($event)"
              />
            </label>
            <table class="catalog-table">
              <caption class="sr-only">Lifestyle catalog</caption>
              <tbody>
                @for (item of filteredLifestyleCatalog(); track item.name) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td class="muted">{{ lifestyleSummary(item.name) }}</td>
                    <td>
                      <button type="button" (click)="addLifestyle(item.name)">Add</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            @if (character.lifestyles.length) {
              <h4>Purchased lifestyles</h4>
              <ul class="editor-list">
                @for (item of character.lifestyles; track item.id) {
                  <li class="editor-row">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="muted">{{ item.months }} months · {{ item.cost | number }}¥</span>
                    <button type="button" (click)="store.removeLifestyle(item.id)">Remove</button>
                  </li>
                }
              </ul>
            }
          </div>
        }

        @if (activeSection() === 'pets') {
          <div class="subsection" aria-labelledby="pets-heading">
            <h3 id="pets-heading">Pets</h3>
            <div class="pet-add-row">
              <label>
                <span class="field-label">Pet name</span>
                <input type="text" placeholder="Pet name" [formField]="petForm.name" />
              </label>
              <button type="button" (click)="addPet()">Add pet</button>
            </div>

            @if (character.pets.length) {
              <ul class="editor-list">
                @for (pet of character.pets; track pet.id) {
                  <li class="editor-row">
                    <span class="item-name">{{ pet.name }}</span>
                    <button type="button" (click)="store.removePet(pet.id)">Remove</button>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">No pets yet.</p>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    h2, h3, h4, h5 { margin: 0 0 0.75rem; }
    h4 { font-size: 0.95rem; margin-top: 1rem; }
    h5 { font-size: 0.875rem; margin-top: 0.75rem; color: var(--color-text-muted); }

    .nuyen-summary { margin: 0 0 1rem; color: var(--color-text-muted); }
    .overspent { color: var(--color-danger); }

    .section-nav {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    .section-btn {
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      cursor: pointer;

      &.active {
        border-color: var(--color-accent);
        font-weight: 600;
      }
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

    .editor-list, .child-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .child-list {
      margin: 0.35rem 0 0 1rem;
      padding-left: 0.75rem;
      border-left: 2px solid var(--color-border);
    }

    .editor-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .item-name, .select-btn { min-width: 10rem; font-weight: 500; text-align: left; }

    .select-btn.selected {
      border-color: var(--color-accent);
      background: var(--color-surface-raised);
    }

    .inline-rating input { width: 4rem; margin-right: 0.35rem; }
    .child-panel { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
    .months-row, .pet-add-row {
      display: flex;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 0.75rem;
    }
    .field-label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
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
export class StreetGearTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;
  readonly getCatalogMaxRating = getCatalogMaxRating;
  readonly isRatedCatalogEntry = isRatedCatalogEntry;
  readonly itemSummary = itemSummary;

  readonly sections: Array<{ id: StreetSection; label: string }> = [
    { id: 'gear', label: 'Gear' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'armor', label: 'Armor' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'pets', label: 'Pets' },
  ];

  readonly activeSection = signal<StreetSection>('gear');
  readonly selectedWeaponId = signal<string | null>(null);
  readonly selectedArmorId = signal<string | null>(null);
  readonly pendingRatings = signal<Record<string, number>>({});

  readonly gearSearchModel = signal({ query: '' });
  readonly gearSearchForm = form(this.gearSearchModel);
  readonly weaponSearchModel = signal({ query: '' });
  readonly weaponSearchForm = form(this.weaponSearchModel);
  readonly armorSearchModel = signal({ query: '' });
  readonly armorSearchForm = form(this.armorSearchModel);
  readonly lifestyleSearchModel = signal({ query: '' });
  readonly lifestyleSearchForm = form(this.lifestyleSearchModel);
  readonly petModel = signal({ name: '' });
  readonly petForm = form(this.petModel);
  readonly lifestyleMonths = signal(1);

  readonly filteredGearCatalog = computed(() =>
    this.filterCatalog([...this.store.gearCatalog().values()], this.gearSearchModel().query),
  );

  readonly filteredWeaponCatalog = computed(() =>
    this.filterCatalog([...this.store.weaponCatalog().values()], this.weaponSearchModel().query),
  );

  readonly filteredArmorCatalog = computed(() =>
    this.filterCatalog([...this.store.armorCatalog().values()], this.armorSearchModel().query),
  );

  readonly filteredLifestyleCatalog = computed(() => {
    const query = this.lifestyleSearchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.lifestyleCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    );
  });

  readonly selectedWeapon = computed(() => {
    const id = this.selectedWeaponId();
    const character = this.store.character();
    if (!id || !character) return null;
    return character.weapons.find((weapon) => weapon.id === id) ?? null;
  });

  readonly selectedArmor = computed(() => {
    const id = this.selectedArmorId();
    const character = this.store.character();
    if (!id || !character) return null;
    return character.armors.find((armor) => armor.id === id) ?? null;
  });

  filteredWeaponAccessories(weaponName: string): StreetCatalogEntry[] {
    const weaponEntry = this.store.weaponCatalog().get(weaponName);
    const allowed = new Set(listWeaponAccessoryNames(weaponEntry));
    const scope = this.filter.scope();
    const items = [...this.store.weaponAccessoryCatalog().values()];
    const filtered = items.filter((item) => {
      if (allowed.size > 0 && !allowed.has(item.name)) return false;
      return matchesSourceScope(item as ChummerItem, scope);
    });
    return sortByName(filtered as ChummerItem[]);
  }

  filteredWeaponMods(): StreetCatalogEntry[] {
    return this.filterCatalog([...this.store.weaponModCatalog().values()], '');
  }

  filteredArmorMods(): StreetCatalogEntry[] {
    return this.filterCatalog([...this.store.armorModCatalog().values()], '');
  }

  addGearItem(item: StreetCatalogEntry): void {
    this.store.addGear(item.name, this.catalogRating(item));
  }

  addLifestyle(name: string): void {
    this.store.addLifestyleFromCatalog(name, this.lifestyleMonths());
  }

  lifestyleSummary(name: string): string {
    const entry = this.store.lifestyleCatalog().get(name);
    return entry ? itemSummary(entry as ChummerItem) : '';
  }

  addPet(): void {
    const name = this.petModel().name.trim();
    if (!name) return;
    this.store.addPet(name);
    this.petModel.set({ name: '' });
  }

  onLifestyleMonthsChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.lifestyleMonths.set(Math.max(1, Math.floor(value)));
    }
  }

  summarizeItem(item: StreetCatalogEntry): string {
    return itemSummary(item as ChummerItem);
  }

  catalogRating(item: StreetCatalogEntry): number {
    return this.pendingRatings()[item.name] ?? 1;
  }

  setPendingRating(name: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.pendingRatings.update((current) => ({
      ...current,
      [name]: Number.isFinite(value) ? value : 1,
    }));
  }

  hasChild(parent: CharacterStreetItem, name: string): boolean {
    return parent.children.some((child) => child.name === name);
  }

  isRatedGearItem(item: CharacterStreetItem): boolean {
    const entry = this.store.gearCatalog().get(item.name);
    return entry ? isRatedCatalogEntry(entry) : item.rating > 0;
  }

  maxGearRating(item: CharacterStreetItem): number {
    const entry = this.store.gearCatalog().get(item.name);
    return entry ? getCatalogMaxRating(entry) : 6;
  }

  onRatingChange(
    container: 'gear' | 'weapons' | 'armors',
    id: string,
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.store.setStreetItemRating(container, id, value);
  }

  private filterCatalog(items: StreetCatalogEntry[], query: string): StreetCatalogEntry[] {
    const scope = this.filter.scope();
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as StreetCatalogEntry[];
  }
}
