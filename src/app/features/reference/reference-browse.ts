import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChummerDataService } from '../../core/services/chummer-data.service';
import { BookRegistryService } from '../../core/services/book-registry.service';
import {
  DataCatalogEntry,
  getCatalogEntry,
  getCatalogGroupEntries,
} from '../../core/models/data-catalog';
import { ChummerItem } from '../../core/models/chummer-data.types';
import {
  categoryLabel,
  itemSummary,
  matchesSearch,
  sortByName,
} from '../../core/utils/item-helpers';

@Component({
  selector: 'app-reference-browse',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a routerLink="/reference">Reference</a>
    <span aria-hidden="true">/</span>
    @if (catalogEntry(); as entry) {
      <span>{{ entry.group }}</span>
      <span aria-hidden="true">/</span>
      <span>{{ entry.label }}</span>
    } @else {
      <span>{{ categoryId() }}</span>
    }
  </nav>

  @if (!catalogEntry()) {
    <div class="alert alert-danger" role="alert">
      Unknown category. <a routerLink="/reference">Back to reference</a>
    </div>
  } @else {
    <header class="page-header">
      <h1>{{ catalogEntry()!.label }}</h1>
      <p>{{ catalogEntry()!.description }}</p>
    </header>

    @if (relatedEntries().length > 1) {
      <nav class="related-nav" aria-label="Related lists in {{ catalogEntry()!.group }}">
        @for (related of relatedEntries(); track related.id) {
          <a
            [routerLink]="['/reference', related.id]"
            class="related-link"
            [class.active]="related.id === categoryId()"
          >
            {{ related.label }}
          </a>
        }
      </nav>
    }

    <div class="toolbar">
      <label class="search-field">
        <span class="sr-only">Search {{ catalogEntry()!.label }}</span>
        <input
          type="search"
          [value]="searchQuery()"
          (input)="onSearch($event)"
          placeholder="Search by name, category, or source…"
          autocomplete="off"
        />
      </label>
      <p class="result-count" role="status" aria-live="polite">
        {{ filteredItems().length }} of {{ items().length }} items
      </p>
    </div>

    @if (loadError()) {
      <div class="alert alert-danger" role="alert">{{ loadError() }}</div>
    } @else if (loading()) {
      <p class="loading" role="status">Loading…</p>
    } @else if (filteredItems().length === 0) {
      <p class="empty" role="status">No items match your search.</p>
    } @else {
      <div class="table-wrap">
        <table>
          <caption class="sr-only">{{ catalogEntry()!.label }} listing</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col">Details</th>
              @if (isImprovements()) {
                <th scope="col">Description</th>
              } @else {
                <th scope="col">Source</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (item of filteredItems(); track trackItem(item)) {
              <tr>
                <th scope="row">{{ item.name }}</th>
                <td>{{ categoryLabel(item) || '—' }}</td>
                <td>{{ itemSummary(item) || '—' }}</td>
                @if (isImprovements()) {
                  <td class="description-cell">{{ improvementDescription(item) }}</td>
                } @else {
                  <td>
                    {{ bookRegistry.resolve(item.source) }}
                    @if (item.page) {
                      <span class="page-ref">p.{{ item.page }}</span>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }
  `,
  styles: `
    .breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .page-header {
      margin-bottom: 1rem;

      h1 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--color-text-muted); }
    }

    .related-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 1.25rem;
    }

    .related-link {
      padding: 0.375rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      text-decoration: none;

      &:hover {
        color: var(--color-text);
        border-color: var(--color-accent);
        text-decoration: none;
      }

      &.active {
        color: var(--color-text);
        background: var(--color-surface-raised);
        border-color: var(--color-accent);
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .search-field {
      flex: 1;
      min-width: 200px;
      max-width: 400px;

      input {
        width: 100%;
        padding: 0.625rem 0.875rem;
      }
    }

    .result-count {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .loading,
    .empty {
      color: var(--color-text-muted);
    }

    .alert {
      padding: 1rem 1.25rem;
      border-radius: var(--radius);
      color: var(--color-text);
    }

    .alert-danger {
      background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface));
      border: 1px solid color-mix(in srgb, var(--color-danger) 35%, transparent);
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    th,
    td {
      padding: 0.625rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }

    thead th {
      background: var(--color-surface-raised);
      font-weight: 600;
      position: sticky;
      top: 0;
    }

    tbody tr:hover {
      background: var(--color-surface);
    }

    tbody tr:last-child th,
    tbody tr:last-child td {
      border-bottom: none;
    }

    .page-ref {
      color: var(--color-text-muted);
      margin-left: 0.25rem;
    }

    .description-cell {
      max-width: 28rem;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
      line-height: 1.4;
    }
  `,
})
export class ReferenceBrowse {
  readonly categoryId = input.required<string>();

  private readonly data = inject(ChummerDataService);
  readonly bookRegistry = inject(BookRegistryService);

  readonly catalogEntry = computed(() => getCatalogEntry(this.categoryId()));
  readonly relatedEntries = computed<DataCatalogEntry[]>(() => {
    const entry = this.catalogEntry();
    return entry ? getCatalogGroupEntries(entry.group) : [];
  });
  readonly isImprovements = computed(() => this.categoryId() === 'improvements');
  readonly searchQuery = signal('');
  readonly items = signal<ChummerItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly filteredItems = computed(() => {
    const query = this.searchQuery();
    return sortByName(this.items().filter((item) => matchesSearch(item, query)));
  });

  protected readonly categoryLabel = categoryLabel;
  protected readonly itemSummary = itemSummary;

  constructor() {
    effect(() => {
      this.categoryId();
      this.searchQuery.set('');
      void this.loadCategory();
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  trackItem(item: ChummerItem): string {
    return `${item.name}-${String(item['id'] ?? '')}`;
  }

  improvementDescription(item: ChummerItem): string {
    const page = item.page;
    return typeof page === 'string' ? page : '';
  }

  private async loadCategory(): Promise<void> {
    const entry = this.catalogEntry();
    if (!entry) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    try {
      await this.bookRegistry.ensureLoaded();
      const items = await this.data.loadItems(entry.file, entry.collectionKey);
      this.items.set(items);
    } catch {
      this.loadError.set(
        `Could not load ${entry.label}. Run npm run convert to generate game data.`,
      );
    } finally {
      this.loading.set(false);
    }
  }
}
