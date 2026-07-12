import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CharacterStoreService } from '../../core/services/character-store.service';
import { ChummerDataService } from '../../core/services/chummer-data.service';

@Component({
  selector: 'app-characters',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>Characters</h1>
      <p>Create, save, and import Shadowrun 4 characters.</p>
    </header>

    @if (!store.initialized()) {
      <p role="status">Loading…</p>
    } @else {
      <section class="actions" aria-label="Character actions">
        <a routerLink="/characters/new" class="btn">New character</a>

        <label class="import-btn">
          Import .chum
          <input type="file" accept=".chum,.xml" (change)="onImportFile($event)" hidden />
        </label>
      </section>

      @if (importWarnings().length) {
        <div class="warnings" role="status" aria-live="polite">
          <strong>Import notes</strong>
          <ul>
            @for (warning of importWarnings(); track warning) {
              <li>{{ warning }}</li>
            }
          </ul>
        </div>
      }

      @if (store.characterList().length) {
        <section aria-labelledby="saved-heading">
          <h2 id="saved-heading">Saved characters</h2>
          <ul class="character-list">
            @for (entry of store.characterList(); track entry.id) {
              <li class="character-card">
                <div class="character-info">
                  <a [routerLink]="['/characters', entry.id]" class="character-name">
                    {{ entry.name }}
                  </a>
                  <p class="meta">{{ entry.metatype }} · updated {{ formatDate(entry.updatedAt) }}</p>
                </div>
                <button type="button" (click)="deleteCharacter(entry.id)">Delete</button>
              </li>
            }
          </ul>
        </section>
      } @else {
        <p class="empty" role="status">No saved characters yet. Create one or import a legacy .chum file.</p>
      }
    }
  `,
  styles: `
    .page-header {
      margin-bottom: 1.5rem;

      h1 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--color-text-muted); }
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .btn, .import-btn, button {
      display: inline-flex;
      align-items: center;
      padding: 0.625rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      cursor: pointer;
      text-decoration: none;
      color: var(--color-text);
      font: inherit;
    }

    .btn {
      background: var(--color-accent);
      border-color: transparent;
      color: #0d1117;
      font-weight: 600;
    }

    .warnings {
      margin-bottom: 1.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--color-warning) 12%, var(--color-surface));
      color: var(--color-text);

      ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    }

    h2 {
      font-size: 1.125rem;
      margin: 0 0 0.75rem;
    }

    .character-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.75rem;
    }

    .character-card {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
    }

    .character-name {
      font-weight: 600;
      color: var(--color-text);
      text-decoration: none;

      &:hover { color: var(--color-accent); }
    }

    .meta {
      margin: 0.25rem 0 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .empty {
      color: var(--color-text-muted);
    }
  `,
})
export class Characters implements OnInit {
  readonly store = inject(CharacterStoreService);
  private readonly data = inject(ChummerDataService);
  private readonly router = inject(Router);

  readonly importWarnings = signal<string[]>([]);

  async ngOnInit(): Promise<void> {
    await this.data.loadManifest();
    await this.store.ensureInitialized();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const result = await this.store.importChumFile(file);
    this.importWarnings.set(result.warnings);
    input.value = '';
    await this.router.navigate(['/characters', result.character.id]);
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.store.deleteCharacter(id);
  }
}
