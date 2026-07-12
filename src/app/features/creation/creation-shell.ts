import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CharacterStoreService } from '../../core/services/character-store.service';
import { ChummerDataService } from '../../core/services/chummer-data.service';
import { BpSummaryBar } from './components/bp-summary-bar';
import { SelectionDialog } from './components/selection-dialog';
import { CreationTabId, visibleCreationTabs } from './creation-tabs';
import { BpSummaryTab } from './tabs/bp-summary-tab';
import { CommonTab } from './tabs/common-tab';
import { PlaceholderTab } from './tabs/placeholder-tab';

@Component({
  selector: 'app-creation-shell',
  imports: [
    RouterLink,
    BpSummaryBar,
    SelectionDialog,
    CommonTab,
    BpSummaryTab,
    PlaceholderTab,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!store.initialized()) {
      <p role="status">Loading character options…</p>
    } @else if (!store.character()) {
      <p role="status">Character not found.</p>
      <a routerLink="/characters">Back to characters</a>
    } @else {
      <header class="creation-header">
        <div>
          <a routerLink="/characters" class="back-link">← Characters</a>
          <h1>{{ store.character()!.name || 'Unnamed character' }}</h1>
          <p class="meta">Character creation</p>
        </div>
        <div class="header-actions">
          @if (saveMessage()) {
            <span class="save-message" role="status" aria-live="polite">{{ saveMessage() }}</span>
          }
          <button type="button" (click)="saveNow()">Save</button>
        </div>
      </header>

      <app-bp-summary-bar />

      <div class="creation-layout">
        <nav class="tab-nav" aria-label="Character creation tabs">
          @for (tab of tabs(); track tab.id) {
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === tab.id"
              [attr.aria-current]="activeTab() === tab.id ? 'page' : null"
              (click)="activeTab.set(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        <div class="tab-panel">
          @switch (activeTab()) {
            @case ('common') {
              <app-common-tab />
            }
            @case ('bp-summary') {
              <app-bp-summary-tab />
            }
            @default {
              <app-placeholder-tab [title]="activeTabLabel()" />
            }
          }
        </div>
      </div>

      <app-selection-dialog />
    }
  `,
  styles: `
    .creation-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;

      h1 { margin: 0.25rem 0; font-size: 1.5rem; }
      .meta { margin: 0; color: var(--color-text-muted); }
    }

    .back-link {
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.875rem;

      &:hover { color: var(--color-text); }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .save-message {
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;

      &:hover { border-color: var(--color-accent); }
    }

    app-bp-summary-bar {
      display: block;
      margin-bottom: 1rem;
    }

    .creation-layout {
      display: grid;
      grid-template-columns: minmax(10rem, 14rem) 1fr;
      gap: 1rem;
      align-items: start;
    }

    .tab-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      position: sticky;
      top: 1rem;
    }

    .tab-button {
      text-align: left;
      width: 100%;

      &.active {
        border-color: var(--color-accent);
        background: var(--color-surface-raised);
        font-weight: 600;
      }
    }

    .tab-panel {
      padding: 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      min-height: 20rem;
    }

    @media (max-width: 768px) {
      .creation-layout {
        grid-template-columns: 1fr;
      }

      .tab-nav {
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
      }

      .tab-button {
        width: auto;
      }
    }
  `,
})
export class CreationShell implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly store = inject(CharacterStoreService);
  private readonly data = inject(ChummerDataService);

  readonly activeTab = signal<CreationTabId>('common');
  readonly saveMessage = signal('');

  readonly tabs = computed(() => visibleCreationTabs(this.store.character()));

  readonly activeTabLabel = computed(() => {
    const tab = this.tabs().find((entry) => entry.id === this.activeTab());
    return tab?.label ?? 'Tab';
  });

  async ngOnInit(): Promise<void> {
    await this.data.loadManifest();
    await this.store.ensureInitialized();

    const id = this.route.snapshot.paramMap.get('id') ?? undefined;
    if (id && id !== 'new') {
      const loaded = await this.store.openCharacter(id);
      if (!loaded) {
        this.store.createNewCharacter({ id });
      }
    } else {
      this.store.createNewCharacter();
    }
  }

  async saveNow(): Promise<void> {
    await this.store.saveCurrentCharacter();
    this.saveMessage.set('Saved locally');
    window.setTimeout(() => this.saveMessage.set(''), 2000);
  }
}
