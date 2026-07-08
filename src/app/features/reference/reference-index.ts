import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATALOG_GROUPS, DATA_CATALOG, getCatalogGroupEntries } from '../../core/models/data-catalog';

@Component({
  selector: 'app-reference-index',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>Rules Reference</h1>
      <p>{{ catalog.length }} browseable lists across {{ groups.length }} categories.</p>
    </header>

    @for (group of groups; track group) {
      <section class="catalog-section" [attr.aria-labelledby]="sectionId(group)">
        <h2 [id]="sectionId(group)" class="group-title">{{ group }}</h2>
        <ul class="catalog-list" role="list">
          @for (entry of entriesFor(group); track entry.id) {
            <li>
              <a [routerLink]="['/reference', entry.id]" class="catalog-row">
                <span class="catalog-row-label">{{ entry.label }}</span>
                <span class="catalog-row-desc">{{ entry.description }}</span>
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .page-header {
      margin-bottom: 2rem;

      h1 {
        margin: 0 0 0.5rem;
      }

      p {
        margin: 0;
        color: var(--color-text-muted);
      }
    }

    .catalog-section {
      margin-bottom: 2rem;
    }

    .group-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .catalog-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .catalog-row {
      display: grid;
      grid-template-columns: 14rem 1fr;
      gap: 1rem;
      align-items: center;
      padding: 0.875rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: inherit;
      text-decoration: none;

      &:hover {
        border-color: var(--color-accent);
        text-decoration: none;
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
    }

    .catalog-row-label {
      font-weight: 600;
    }

    .catalog-row-desc {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    @media (max-width: 600px) {
      .catalog-row {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }
  `,
})
export class ReferenceIndex {
  readonly catalog = DATA_CATALOG;
  readonly groups = CATALOG_GROUPS;

  entriesFor(group: string) {
    return getCatalogGroupEntries(group);
  }

  sectionId(group: string): string {
    return `group-${group.replace(/\s+/g, '-').toLowerCase()}`;
  }
}
