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
import { CharacterInfoTab } from './tabs/character-info-tab';
import { CommonTab } from './tabs/common-tab';
import { PlaceholderTab } from './tabs/placeholder-tab';
import { SkillsTab } from './tabs/skills-tab';
import { MartialArtsTab } from './tabs/martial-arts-tab';
import { StreetGearTab } from './tabs/street-gear-tab';
import { CyberwareTab } from './tabs/cyberware-tab';
import { MagicianTab } from './tabs/magician-tab';
import { AdeptTab } from './tabs/adept-tab';
import { TechnomancerTab } from './tabs/technomancer-tab';
import { CritterTab } from './tabs/critter-tab';
import { InitiationTab } from './tabs/initiation-tab';
import { VehiclesTab } from './tabs/vehicles-tab';

@Component({
  selector: 'app-creation-shell',
  imports: [
    RouterLink,
    BpSummaryBar,
    SelectionDialog,
    CommonTab,
    CharacterInfoTab,
    BpSummaryTab,
    SkillsTab,
    MartialArtsTab,
    StreetGearTab,
    CyberwareTab,
    MagicianTab,
    AdeptTab,
    TechnomancerTab,
    CritterTab,
    InitiationTab,
    VehiclesTab,
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
          @if (store.character()!.created) {
            <p class="meta finalized-meta">
              <span class="finalized-badge">Finalized</span>
              Creation complete — reopen to keep editing the build.
            </p>
          } @else {
            <p class="meta">Character creation</p>
          }
        </div>
        <div class="header-actions">
          @if (saveMessage()) {
            <span class="save-message" role="status" aria-live="polite">{{ saveMessage() }}</span>
          }
          <button type="button" (click)="saveNow()">Save</button>
          <button type="button" (click)="exportChum()">Export .chum</button>
          @if (store.character()!.created) {
            <button type="button" (click)="reopenCreation()">Reopen for editing</button>
          } @else {
            <button type="button" (click)="finalizeCharacter()">Finalize character</button>
          }
        </div>
      </header>

      @if (store.character()!.created) {
        <div class="finalized-banner" role="status">
          This character is marked finalized. Saving keeps that status.
          Any edit reopens creation so you can finalize again when ready.
        </div>
      } @else if (store.reopenedByEdit()) {
        <div class="reopened-banner" role="status">
          Creation was reopened because you edited a finalized character.
        </div>
      }

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
            @case ('info') {
              <app-character-info-tab />
            }
            @case ('skills') {
              <app-skills-tab />
            }
            @case ('martial-arts') {
              <app-martial-arts-tab />
            }
            @case ('street-gear') {
              <app-street-gear-tab />
            }
            @case ('cyberware') {
              <app-cyberware-tab />
            }
            @case ('magician') {
              <app-magician-tab />
            }
            @case ('adept') {
              <app-adept-tab />
            }
            @case ('technomancer') {
              <app-technomancer-tab />
            }
            @case ('critter') {
              <app-critter-tab />
            }
            @case ('initiation') {
              <app-initiation-tab />
            }
            @case ('vehicles') {
              <app-vehicles-tab />
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
      .finalized-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    }

    .finalized-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      color: var(--color-text);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .finalized-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      color: var(--color-text);
      font-size: 0.9375rem;
    }

    .reopened-banner {
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
      font-size: 0.9375rem;
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

  exportChum(): void {
    const character = this.store.character();
    const xml = this.store.exportCurrentChum();
    if (!xml || !character) {
      this.saveMessage.set('Nothing to export');
      window.setTimeout(() => this.saveMessage.set(''), 2000);
      return;
    }

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${character.name.trim() || 'character'}.chum`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.saveMessage.set('Exported .chum file');
    window.setTimeout(() => this.saveMessage.set(''), 2000);
  }

  finalizeCharacter(): void {
    const result = this.store.finalizeCharacter();
    if (result.valid) {
      this.saveMessage.set('Character finalized');
    } else {
      const message = result.issues[0]?.message ?? 'Validation failed';
      this.saveMessage.set(`Cannot finalize: ${message}`);
    }
    window.setTimeout(() => this.saveMessage.set(''), 4000);
  }

  reopenCreation(): void {
    this.store.reopenCreation();
    this.saveMessage.set('Creation reopened — finalize again when ready');
    window.setTimeout(() => this.saveMessage.set(''), 4000);
  }
}
