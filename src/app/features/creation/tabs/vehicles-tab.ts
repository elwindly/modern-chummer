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
import { VehicleCatalogEntry, VehicleModCatalogEntry, scalarCatalogValue } from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

@Component({
  selector: 'app-vehicles-tab',
  imports: [DecimalPipe, FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="vehicles-heading">
        <h2 id="vehicles-heading">Vehicles</h2>

        @if (store.nuyenBreakdown(); as nuyen) {
          <p class="nuyen-summary" role="status">
            Remaining nuyen:
            <strong [class.overspent]="nuyen.remaining < 0">{{ nuyen.remaining | number }}¥</strong>
          </p>
        }

        <div class="filter-toolbar">
          <label>
            <span class="sr-only">Search vehicles</span>
            <input type="search" placeholder="Search vehicles…" [formField]="searchForm.query" />
          </label>
          <app-source-filter-control />
          <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
        </div>

        <table class="catalog-table">
          <caption class="sr-only">Vehicle catalog</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Cost</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (vehicle of filteredVehicles(); track vehicle.name) {
              <tr>
                <td>{{ vehicle.name }}</td>
                <td class="muted">{{ vehicleCategory(vehicle) }}</td>
                <td class="muted">{{ vehicleCost(vehicle) | number }}¥</td>
                <td>
                  <button type="button" (click)="store.addVehicle(vehicle.name)">Add</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (character.vehicles.length) {
          <h3>Purchased vehicles</h3>
          <ul class="editor-list">
            @for (vehicle of character.vehicles; track vehicle.id) {
              <li>
                <div class="editor-row">
                  <button
                    type="button"
                    class="select-btn"
                    [class.selected]="selectedVehicleId() === vehicle.id"
                    (click)="selectedVehicleId.set(vehicle.id)"
                  >
                    {{ vehicle.name }}
                  </button>
                  <span class="muted">Avail {{ vehicle.availability }} · {{ vehicle.cost | number }}¥</span>
                  <button type="button" (click)="store.removeVehicle(vehicle.id)">Remove</button>
                </div>
                @if (vehicle.mods.length) {
                  <ul class="child-list">
                    @for (mod of vehicle.mods; track mod.id) {
                      <li class="editor-row child-row">
                        <span>{{ mod.name }}</span>
                        @if (mod.rating) {
                          <span class="muted">Rating {{ mod.rating }}</span>
                        }
                        <span class="muted">{{ mod.cost | number }}¥</span>
                        <button type="button" (click)="store.removeVehicleMod(vehicle.id, mod.id)">Remove</button>
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ul>
        }

        @if (selectedVehicle(); as vehicle) {
          <div class="child-panel">
            <h4>Mods for {{ vehicle.name }}</h4>
            <table class="catalog-table">
              <caption class="sr-only">Vehicle mod catalog</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (mod of filteredMods(); track mod.name) {
                  <tr>
                    <td>{{ mod.name }}</td>
                    <td>
                      @if (modHasRating(mod)) {
                        <label class="inline-rating">
                          <span class="sr-only">Rating for {{ mod.name }}</span>
                          <input
                            type="number"
                            min="1"
                            [max]="modMaxRating(mod)"
                            [value]="pendingModRating(mod.name)"
                            (change)="setPendingModRating(mod.name, $event)"
                          />
                        </label>
                      }
                      <button
                        type="button"
                        (click)="addMod(vehicle.id, mod)"
                        [disabled]="hasMod(vehicle, mod.name)"
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
      </section>
    }
  `,
  styles: `
    h2, h3, h4 { margin: 0 0 0.75rem; }
    h3, h4 { font-size: 1rem; margin-top: 1.25rem; }

    .nuyen-summary { margin: 0 0 1rem; }
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

    .select-btn {
      min-width: 10rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;

      &.selected {
        border-color: var(--color-accent);
        background: var(--color-surface-raised);
      }
    }

    .inline-rating input { width: 4rem; margin-right: 0.35rem; }
    .child-panel { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
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
export class VehiclesTab {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);
  readonly selectedVehicleId = signal<string | null>(null);
  readonly pendingModRatings = signal<Record<string, number>>({});

  readonly filteredVehicles = computed(() => {
    const query = this.searchModel().query;
    const scope = this.filter.scope();
    const items = [...this.store.vehicleCatalog().values()];
    return sortByName(
      items.filter(
        (item) =>
          matchesSourceScope(item as ChummerItem, scope) &&
          matchesSearch(item as ChummerItem, query),
      ) as ChummerItem[],
    ) as VehicleCatalogEntry[];
  });

  readonly filteredMods = computed(() => {
    const scope = this.filter.scope();
    const items = [...this.store.vehicleModCatalog().values()];
    return sortByName(
      items.filter((item) => matchesSourceScope(item as ChummerItem, scope)) as ChummerItem[],
    ) as VehicleModCatalogEntry[];
  });

  readonly selectedVehicle = computed(() => {
    const id = this.selectedVehicleId();
    const character = this.store.character();
    if (!id || !character) return null;
    return character.vehicles.find((vehicle) => vehicle.id === id) ?? null;
  });

  vehicleCategory(vehicle: VehicleCatalogEntry): string {
    return categoryLabel(vehicle as ChummerItem);
  }

  vehicleCost(vehicle: VehicleCatalogEntry): number {
    const raw = scalarCatalogValue(vehicle.cost);
    return Number(raw) || 0;
  }

  modHasRating(mod: VehicleModCatalogEntry): boolean {
    const rating = Number(scalarCatalogValue(mod.rating));
    return rating > 0;
  }

  modMaxRating(mod: VehicleModCatalogEntry): number {
    return Number(scalarCatalogValue(mod.rating)) || 6;
  }

  pendingModRating(name: string): number {
    return this.pendingModRatings()[name] ?? 1;
  }

  setPendingModRating(name: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.pendingModRatings.update((current) => ({
      ...current,
      [name]: Number.isFinite(value) ? value : 1,
    }));
  }

  addMod(vehicleId: string, mod: VehicleModCatalogEntry): void {
    const rating = this.modHasRating(mod) ? this.pendingModRating(mod.name) : 0;
    this.store.addVehicleMod(vehicleId, mod.name, rating);
  }

  hasMod(vehicle: { mods: Array<{ name: string }> }, modName: string): boolean {
    return vehicle.mods.some((mod) => mod.name === modName);
  }
}
