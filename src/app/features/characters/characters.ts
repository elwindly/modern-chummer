import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterStoreService } from '../../core/services/character-store.service';
import { ChummerDataService } from '../../core/services/chummer-data.service';
import {
  listSelectableAttributes,
  parseAttributeSelectionConfig,
} from '../../core/rules';

@Component({
  selector: 'app-characters',
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>Characters</h1>
      <p>Character creation preview — reactive rules engine integration.</p>
    </header>

    @if (!store.initialized()) {
      <p role="status">Loading character options…</p>
    } @else {
      <section class="actions" aria-label="Character actions">
        <button type="button" (click)="store.createNewCharacter()">New character</button>
        <button type="button" (click)="store.initializeMetatype('Human')">Start as Human</button>
        <button type="button" (click)="store.initializeMetatype('Ork')">Start as Ork</button>
      </section>

      @if (store.character(); as character) {
        <section class="sheet" aria-labelledby="sheet-heading">
          <h2 id="sheet-heading">{{ character.name || 'Unnamed character' }}</h2>
          <p class="meta">
            {{ character.metatype }}
            @if (character.metavariant) {
              ({{ character.metavariant }})
            }
            · {{ character.qualities.length }} qualities
          </p>

          <div class="stats-grid" aria-label="Derived statistics">
            @if (store.derivedStats(); as stats) {
              <div class="stat">
                <span class="label">Physical CM</span>
                <span class="value">{{ stats.physicalCm }}</span>
              </div>
              <div class="stat">
                <span class="label">Stun CM</span>
                <span class="value">{{ stats.stunCm }}</span>
              </div>
              <div class="stat">
                <span class="label">Damage resist</span>
                <span class="value">{{ stats.damageResistance }}</span>
              </div>
            }
            @if (store.bpBreakdown(); as bp) {
              <div class="stat">
                <span class="label">BP remaining</span>
                <span class="value" [class.overspent]="bp.remaining < 0">{{ bp.remaining }}</span>
              </div>
            }
            @if (store.nuyenBreakdown(); as nuyen) {
              <div class="stat">
                <span class="label">Nuyen remaining</span>
                <span class="value">{{ nuyen.remaining | number }}</span>
              </div>
            }
          </div>

          <div class="attributes" aria-label="Primary attributes">
            @for (code of primaryAttributes; track code) {
              <label class="attr-row">
                <span>{{ code }}</span>
                <input
                  type="number"
                  [ngModel]="character.attributes[code].base"
                  (ngModelChange)="store.setAttributeBase(code, $event)"
                  [min]="character.attributes[code].min"
                  [max]="character.attributes[code].max"
                />
                <span class="total">{{ store.getAttributeValue(code) }}</span>
              </label>
            }
          </div>

          <div class="qualities" aria-label="Add qualities">
            <button type="button" (click)="addQuality('Tough as Nails (Rating 1)')">
              Add Tough as Nails
            </button>
            <button type="button" (click)="addQuality('Aptitude')">Add Aptitude</button>
            <button type="button" (click)="addQuality('Exceptional Attribute')">
              Add Exceptional Attribute
            </button>
          </div>

          @if (character.qualities.length) {
            <ul class="quality-list">
              @for (quality of character.qualities; track quality) {
                <li>{{ quality }}</li>
              }
            </ul>
          }

          @if (store.validation(); as validation) {
            <div
              class="validation"
              [class.valid]="validation.valid"
              role="status"
              aria-live="polite"
            >
              @if (validation.valid) {
                Character passes current validation checks.
              } @else {
                <ul>
                  @for (issue of validation.issues; track issue.code) {
                    <li>{{ issue.message }}</li>
                  }
                </ul>
              }
            </div>
          }
        </section>
      }

      @if (store.pendingSelection(); as selection) {
        <dialog class="selection-dialog" open aria-labelledby="selection-title">
          <h2 id="selection-title">{{ selection.sourceName }}: {{ selection.prompt }}</h2>

          @if (selection.kind === 'attribute') {
            <label for="selection-value">Attribute</label>
            <select id="selection-value" [(ngModel)]="selectionValue">
              @for (option of attributeOptions(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select>
          } @else if (selection.kind === 'skill') {
            <label for="selection-value">Skill</label>
            <input id="selection-value" type="text" [(ngModel)]="selectionValue" />
          } @else {
            <label for="selection-value">Value</label>
            <input id="selection-value" type="text" [(ngModel)]="selectionValue" />
          }

          <div class="dialog-actions">
            <button type="button" (click)="confirmSelection()">Confirm</button>
            <button type="button" (click)="store.cancelGrant()">Cancel</button>
          </div>
        </dialog>
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
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      cursor: pointer;

      &:hover { border-color: var(--color-accent); }
    }

    .sheet {
      padding: 1.25rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      margin-bottom: 1rem;

      h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
      .meta { margin: 0 0 1rem; color: var(--color-text-muted); }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .stat {
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);

      .label {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .value {
        font-size: 1.25rem;
        font-weight: 600;

        &.overspent { color: #c0392b; }
      }
    }

    .attributes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .attr-row {
      display: grid;
      grid-template-columns: 2rem 1fr 2rem;
      gap: 0.5rem;
      align-items: center;

      input {
        width: 100%;
        padding: 0.25rem;
      }

      .total {
        text-align: right;
        color: var(--color-text-muted);
      }
    }

    .qualities {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .quality-list {
      margin: 0 0 1rem;
      padding-left: 1.25rem;
      color: var(--color-text-muted);
    }

    .validation {
      padding: 0.75rem;
      border-radius: var(--radius);
      border: 1px solid #c0392b;
      background: #fdecea;

      &.valid {
        border-color: #27ae60;
        background: #eafaf1;
      }

      ul {
        margin: 0;
        padding-left: 1.25rem;
      }
    }

    .selection-dialog {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface);

      h2 { margin: 0 0 1rem; font-size: 1rem; }

      label { display: block; margin-bottom: 0.25rem; }

      select, input {
        width: 100%;
        margin-bottom: 1rem;
        padding: 0.5rem;
      }

      .dialog-actions {
        display: flex;
        gap: 0.5rem;
      }
    }
  `,
})
export class Characters implements OnInit {
  readonly store = inject(CharacterStoreService);
  private readonly data = inject(ChummerDataService);

  readonly primaryAttributes = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL'] as const;

  selectionValue = '';

  readonly attributeOptions = computed(() => {
    const selection = this.store.pendingSelection();
    const character = this.store.character();
    if (!selection || selection.kind !== 'attribute' || !character) {
      return [] as string[];
    }

    const configNode = selection.config['selectattribute'] as Record<string, unknown>;
    const config = parseAttributeSelectionConfig(configNode);
    return listSelectableAttributes(config, character.flags.magEnabled, character.flags.resEnabled);
  });

  async ngOnInit(): Promise<void> {
    await this.data.loadManifest();
    await this.store.ensureInitialized();
  }

  async addQuality(name: string): Promise<void> {
    const qualities = await this.data.loadItems('qualities', 'qualities');
    const record = qualities.find((item) => item['name'] === name);
    if (!record) return;

    this.store.applyQuality(name, record['bonus'] as Record<string, unknown> | undefined);

    if (this.store.pendingSelection()?.kind === 'attribute') {
      const options = this.attributeOptions();
      this.selectionValue = options[0] ?? '';
    } else if (this.store.pendingSelection()?.kind === 'skill') {
      this.selectionValue = 'Pistols';
    }
  }

  confirmSelection(): void {
    if (!this.selectionValue.trim()) return;
    this.store.resolveSelection(this.selectionValue.trim());
    this.selectionValue = '';
  }
}
