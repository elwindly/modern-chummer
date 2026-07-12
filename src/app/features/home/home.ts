import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChummerDataService } from '../../core/services/chummer-data.service';
import { CATALOG_GROUPS, DATA_CATALOG, getCatalogGroupEntries } from '../../core/models/data-catalog';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero" aria-labelledby="hero-title">
      <h1 id="hero-title">Shadowrun 4th Anniversary Edition</h1>
      <p class="lead">
        A modern web character tool built on Chummer's curated rules data.
        Browse the full reference library or start building a runner.
      </p>

      <div class="hero-actions">
        <a routerLink="/reference" class="btn btn-primary">Browse Reference</a>
        <a routerLink="/characters" class="btn btn-secondary">My Characters</a>
      </div>
    </section>

    @if (dataError()) {
      <div class="alert alert-warning" role="status">
        <strong>Data not loaded.</strong> {{ dataError() }}
        <code>npm run setup</code> in the project folder.
      </div>
    } @else if (manifest()) {
      <p class="data-status" role="status">
        {{ manifest()!.files.length }} data files loaded
        · generated {{ formatDate(manifest()!.generatedAt) }}
      </p>
    }

    <section class="catalog-preview" aria-labelledby="catalog-title">
      <h2 id="catalog-title">Reference categories</h2>
      @for (group of groups; track group) {
        <div class="group-block">
          <h3 class="group-heading">{{ group }}</h3>
          <ul class="catalog-grid">
            @for (entry of entriesFor(group); track entry.id) {
              <li>
                <a [routerLink]="['/reference', entry.id]" class="catalog-card">
                  <span class="catalog-label">{{ entry.label }}</span>
                  <span class="catalog-desc">{{ entry.description }}</span>
                </a>
              </li>
            }
          </ul>
        </div>
      }
      <p class="see-all">
        <a routerLink="/reference">View all {{ catalog.length }} lists →</a>
      </p>
    </section>
  `,
  styles: `
    .hero {
      margin-bottom: 2.5rem;
    }

    h1 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      margin: 0 0 0.75rem;
    }

    .lead {
      font-size: 1.125rem;
      color: var(--color-text-muted);
      max-width: 42rem;
      margin: 0 0 1.5rem;
    }

    .hero-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius);
      font-weight: 600;
      text-decoration: none;
      border: 1px solid transparent;

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
    }

    .btn-primary {
      background: var(--color-accent);
      color: #0d1117;

      &:hover {
        background: var(--color-accent-hover);
        text-decoration: none;
      }
    }

    .btn-secondary {
      background: var(--color-surface-raised);
      color: var(--color-text);
      border-color: var(--color-border);

      &:hover {
        border-color: var(--color-text-muted);
        text-decoration: none;
      }
    }

    .alert {
      padding: 1rem 1.25rem;
      border-radius: var(--radius);
      margin-bottom: 1.5rem;

      code {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.125rem 0.5rem;
        background: var(--color-surface);
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.875rem;
      }
    }

    .alert-warning {
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-warning) 15%, var(--color-surface));
      border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
    }

    .data-status {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin: 0 0 2rem;
    }

    h2 {
      font-size: 1.25rem;
      margin: 0 0 1rem;
    }

    .group-block {
      margin-bottom: 1.5rem;
    }

    .group-heading {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 0.625rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .see-all {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
    }

    .catalog-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .catalog-card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: var(--color-text);
      text-decoration: none;
      height: 100%;

      &:hover {
        border-color: var(--color-accent);
        text-decoration: none;
      }

      &:focus-visible {
        outline: 2px solid var(--color-focus);
        outline-offset: 2px;
      }
    }

    .catalog-label {
      font-weight: 600;
    }

    .catalog-desc {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
  `,
})
export class Home implements OnInit {
  private readonly data = inject(ChummerDataService);

  readonly catalog = DATA_CATALOG;
  readonly groups = CATALOG_GROUPS;
  readonly manifest = this.data.manifest;
  readonly dataError = this.data.manifestError;

  entriesFor(group: string) {
    return getCatalogGroupEntries(group);
  }

  ngOnInit(): void {
    void this.data.loadManifest();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
