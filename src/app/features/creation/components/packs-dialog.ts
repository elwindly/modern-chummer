import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CharacterStoreService } from '../../../core/services/character-store.service';

@Component({
  selector: 'app-packs-dialog',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <dialog class="packs-dialog" open aria-labelledby="packs-title">
        <h2 id="packs-title">Apply PACKS kit</h2>

        <label>
          <span class="sr-only">Search packs</span>
          <input type="search" placeholder="Search packs…" [formField]="searchForm.query" />
        </label>

        <ul class="pack-list" role="listbox" aria-label="Available packs">
          @for (pack of filteredPacks(); track pack.name) {
            <li>
              <button
                type="button"
                class="pack-btn"
                [class.selected]="selectedPack() === pack.name"
                [attr.aria-selected]="selectedPack() === pack.name"
                (click)="selectedPack.set(pack.name)"
              >
                <span class="pack-name">{{ pack.name }}</span>
                @if (pack.category?.length) {
                  <span class="pack-category">{{ pack.category!.join(', ') }}</span>
                }
              </button>
            </li>
          }
        </ul>

        @if (lastResult()) {
          <p class="result-message" role="status" aria-live="polite">{{ lastResult() }}</p>
        }

        <div class="dialog-actions">
          <button type="button" (click)="applySelected()" [disabled]="!selectedPack()">
            Apply
          </button>
          <button type="button" (click)="close()">Close</button>
        </div>
      </dialog>
    }
  `,
  styles: `
    .packs-dialog {
      margin: 0;
      padding: 1rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface);
      max-width: 32rem;
      width: 100%;

      h2 { margin: 0 0 0.75rem; font-size: 1rem; }

      input[type='search'] {
        width: 100%;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        box-sizing: border-box;
      }
    }

    .pack-list {
      list-style: none;
      margin: 0 0 0.75rem;
      padding: 0;
      max-height: 16rem;
      overflow: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .pack-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: none;
      border-bottom: 1px solid var(--color-border);
      background: transparent;
      text-align: left;
      cursor: pointer;

      &:last-child { border-bottom: none; }
      &.selected { background: var(--color-surface-raised); }
      &:hover { background: var(--color-surface-raised); }
    }

    .pack-name { font-weight: 500; }
    .pack-category { font-size: 0.8125rem; color: var(--color-text-muted); }

    .result-message {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .dialog-actions {
      display: flex;
      gap: 0.5rem;
    }

    button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;

      &:hover:not(:disabled) { border-color: var(--color-accent); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

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
export class PacksDialog {
  readonly store = inject(CharacterStoreService);

  readonly open = signal(false);
  readonly selectedPack = signal<string | null>(null);
  readonly lastResult = signal('');

  readonly searchModel = signal({ query: '' });
  readonly searchForm = form(this.searchModel);

  readonly filteredPacks = computed(() => {
    const query = this.searchModel().query.trim().toLowerCase();
    const packs = [...this.store.packsCatalog().values()];
    const filtered = query
      ? packs.filter((pack) => pack.name.toLowerCase().includes(query))
      : packs;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  show(): void {
    this.open.set(true);
    this.selectedPack.set(null);
    this.lastResult.set('');
    this.searchModel.set({ query: '' });
  }

  close(): void {
    this.open.set(false);
    this.selectedPack.set(null);
    this.lastResult.set('');
  }

  applySelected(): void {
    const name = this.selectedPack();
    if (!name) return;

    const result = this.store.applyPack(name);
    if (result.ok) {
      this.lastResult.set(`Applied ${name} (${result.applied.length} items).`);
    } else {
      const detail = result.errors.length ? ` Issues: ${result.errors.join('; ')}.` : '';
      this.lastResult.set(
        `Applied ${name} with ${result.applied.length} items; ${result.errors.length} skipped.${detail}`,
      );
    }
  }
}
