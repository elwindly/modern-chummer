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
import { PacksDialog } from './components/packs-dialog';
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
    PacksDialog,
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
          <div class="creation-options" aria-label="Creation options">
            <label>
              <span class="option-label">BP</span>
              <input
                type="number"
                min="0"
                [value]="store.character()!.buildPoints"
                (change)="onBuildPointsChange($event)"
              />
            </label>
            <label>
              <span class="option-label">Max avail</span>
              <input
                type="number"
                min="0"
                [value]="store.character()!.maximumAvailability"
                (change)="onMaxAvailabilityChange($event)"
              />
            </label>
          </div>
          @if (saveMessage()) {
            <span class="save-message" role="status" aria-live="polite">{{ saveMessage() }}</span>
          }
          <button type="button" (click)="packsDialog.show()">Add PACKS</button>
          <button type="button" (click)="printCharacter()">Print</button>
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
      <app-packs-dialog #packsDialog />
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
      flex-wrap: wrap;
    }

    .creation-options {
      display: flex;
      gap: 0.5rem;
      align-items: center;

      label {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.875rem;
      }

      input {
        width: 4.5rem;
        padding: 0.35rem 0.5rem;
      }
    }

    .option-label {
      color: var(--color-text-muted);
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

  onBuildPointsChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.store.setBuildPoints(value);
    }
  }

  onMaxAvailabilityChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.store.setMaximumAvailability(value);
    }
  }

  printCharacter(): void {
    const character = this.store.character();
    if (!character) return;

    const attrs = Object.entries(character.attributes)
      .map(
        ([code, state]) =>
          `<tr><th>${escapeHtml(code)}</th><td>${state.base}</td></tr>`,
      )
      .join('');

    const skills = character.skills
      .map(
        (skill) =>
          `<li>${escapeHtml(skill.name)} ${skill.rating}${
            skill.specialization ? ` (${escapeHtml(skill.specialization)})` : ''
          }</li>`,
      )
      .join('');

    const gear = character.gear
      .map((item) => `<li>${escapeHtml(item.name)}</li>`)
      .join('');
    const weapons = character.weapons
      .map((item) => `<li>${escapeHtml(item.name)}</li>`)
      .join('');
    const ware = [
      ...character.cyberware.map((item) => `<li>${escapeHtml(item.name)}</li>`),
      ...character.bioware.map((item) => `<li>${escapeHtml(item.name)}</li>`),
    ].join('');
    const spells = character.spells
      .map((spell) => `<li>${escapeHtml(spell.name)}</li>`)
      .join('');

    const name = escapeHtml(character.name || 'Unnamed character');
    const title = escapeHtml(character.name || 'Character');
    const meta = escapeHtml(
      `${character.metatype}${character.metavariant ? ` · ${character.metavariant}` : ''}`,
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #111; }
    h1 { margin: 0 0 0.25rem; }
    h2 { margin: 1.25rem 0 0.5rem; font-size: 1rem; border-bottom: 1px solid #ccc; }
    table { border-collapse: collapse; }
    th, td { padding: 0.25rem 0.75rem 0.25rem 0; text-align: left; }
    ul { margin: 0; padding-left: 1.25rem; }
    .meta { color: #555; margin: 0 0 1rem; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <p class="meta">${meta}</p>
  <h2>Attributes</h2>
  <table>${attrs}</table>
  <h2>Skills</h2>
  <ul>${skills || '<li>None</li>'}</ul>
  <h2>Gear</h2>
  <ul>${gear || '<li>None</li>'}</ul>
  <h2>Weapons</h2>
  <ul>${weapons || '<li>None</li>'}</ul>
  <h2>Cyberware / Bioware</h2>
  <ul>${ware || '<li>None</li>'}</ul>
  <h2>Spells</h2>
  <ul>${spells || '<li>None</li>'}</ul>
</body>
</html>`;

    // Do not use "noopener" in window features: it makes open() return null while
    // still opening a blank tab, so the sheet never gets written.
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
