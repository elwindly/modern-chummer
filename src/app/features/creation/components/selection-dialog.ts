import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import {
  listSelectableAttributes,
  parseAttributeSelectionConfig,
} from '../../../core/rules';

@Component({
  selector: 'app-selection-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
          <select id="selection-value" [(ngModel)]="selectionValue">
            @for (option of skillOptions(); track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
        } @else if (selection.kind === 'skill-group') {
          <label for="selection-value">Skill group</label>
          <select id="selection-value" [(ngModel)]="selectionValue">
            @for (option of skillGroupOptions(); track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
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
  `,
  styles: `
    .selection-dialog {
      margin: 0;
      padding: 1rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface);
      max-width: 28rem;
      width: 100%;

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

    button {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;

      &:hover { border-color: var(--color-accent); }
    }
  `,
})
export class SelectionDialog {
  readonly store = inject(CharacterStoreService);
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

  readonly skillOptions = computed(() => this.store.getSelectableSkillsForPendingSelection());

  readonly skillGroupOptions = computed(() =>
    this.store.getSelectableSkillGroupsForPendingSelection(),
  );

  constructor() {
    effect(() => {
      const selection = this.store.pendingSelection();
      if (!selection) {
        this.selectionValue = '';
        return;
      }

      if (selection.kind === 'attribute') {
        this.selectionValue = this.attributeOptions()[0] ?? '';
      } else if (selection.kind === 'skill') {
        this.selectionValue = this.skillOptions()[0] ?? '';
      } else if (selection.kind === 'skill-group') {
        this.selectionValue = this.skillGroupOptions()[0] ?? '';
      } else {
        this.selectionValue = '';
      }
    });
  }

  confirmSelection(): void {
    if (!this.selectionValue.trim()) return;
    this.store.resolveSelection(this.selectionValue.trim());
    this.selectionValue = '';
  }
}
