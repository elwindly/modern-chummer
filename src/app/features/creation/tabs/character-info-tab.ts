import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CharacterStoreService } from '../../../core/services/character-store.service';

@Component({
  selector: 'app-character-info-tab',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="info-heading">
        <h2 id="info-heading">Character Info</h2>
        <p class="muted">Descriptive details stored with the character.</p>

        <div class="info-grid">
          <label class="field-row">
            <span>Sex</span>
            <input
              type="text"
              [ngModel]="character.profile.sex ?? ''"
              (ngModelChange)="updateProfileField('sex', $event)"
            />
          </label>

          <label class="field-row">
            <span>Age</span>
            <input
              type="text"
              [ngModel]="character.profile.age ?? ''"
              (ngModelChange)="updateProfileField('age', $event)"
            />
          </label>

          <label class="field-row">
            <span>Height</span>
            <input
              type="text"
              [ngModel]="character.profile.height ?? ''"
              (ngModelChange)="updateProfileField('height', $event)"
            />
          </label>

          <label class="field-row">
            <span>Weight</span>
            <input
              type="text"
              [ngModel]="character.profile.weight ?? ''"
              (ngModelChange)="updateProfileField('weight', $event)"
            />
          </label>
        </div>

        <label class="field-row block">
          <span>Description</span>
          <textarea
            rows="4"
            [ngModel]="character.profile.description ?? ''"
            (ngModelChange)="updateProfileField('description', $event)"
          ></textarea>
        </label>

        <label class="field-row block">
          <span>Notes</span>
          <textarea
            rows="4"
            [ngModel]="character.profile.notes ?? ''"
            (ngModelChange)="updateProfileField('notes', $event)"
          ></textarea>
        </label>
      </section>
    }
  `,
  styles: `
    h2 { margin: 0 0 0.75rem; }

    .muted {
      color: var(--color-text-muted);
      margin: 0 0 1rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .field-row {
      display: grid;
      gap: 0.25rem;

      span { font-weight: 500; font-size: 0.875rem; }

      input, textarea {
        padding: 0.5rem;
        width: 100%;
      }

      &.block { margin-bottom: 1rem; }
    }
  `,
})
export class CharacterInfoTab {
  readonly store = inject(CharacterStoreService);

  updateProfileField(
    field: 'sex' | 'age' | 'height' | 'weight' | 'description' | 'notes',
    value: string,
  ): void {
    this.store.updateProfile({ [field]: value });
  }
}
