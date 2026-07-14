import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { createEmptyProfile, type CharacterProfile } from '../../../core/rules';

interface ProfileFormModel {
  sex: string;
  age: string;
  height: string;
  weight: string;
  description: string;
  notes: string;
}

function toProfileFormModel(profile: CharacterProfile): ProfileFormModel {
  return {
    sex: profile.sex ?? '',
    age: profile.age ?? '',
    height: profile.height ?? '',
    weight: profile.weight ?? '',
    description: profile.description ?? '',
    notes: profile.notes ?? '',
  };
}

function profileFormEqual(a: ProfileFormModel, b: ProfileFormModel): boolean {
  return (
    a.sex === b.sex &&
    a.age === b.age &&
    a.height === b.height &&
    a.weight === b.weight &&
    a.description === b.description &&
    a.notes === b.notes
  );
}

function toCharacterProfile(model: ProfileFormModel): CharacterProfile {
  return {
    sex: model.sex || undefined,
    age: model.age || undefined,
    height: model.height || undefined,
    weight: model.weight || undefined,
    description: model.description || undefined,
    notes: model.notes || undefined,
  };
}

@Component({
  selector: 'app-character-info-tab',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character()) {
      <section aria-labelledby="info-heading">
        <h2 id="info-heading">Character Info</h2>
        <p class="muted">Descriptive details stored with the character.</p>

        <div class="info-grid">
          <label class="field-row">
            <span>Sex</span>
            <input type="text" [formField]="profileForm.sex" />
          </label>

          <label class="field-row">
            <span>Age</span>
            <input type="text" [formField]="profileForm.age" />
          </label>

          <label class="field-row">
            <span>Height</span>
            <input type="text" [formField]="profileForm.height" />
          </label>

          <label class="field-row">
            <span>Weight</span>
            <input type="text" [formField]="profileForm.weight" />
          </label>
        </div>

        <label class="field-row block">
          <span>Description</span>
          <textarea rows="4" [formField]="profileForm.description"></textarea>
        </label>

        <label class="field-row block">
          <span>Notes</span>
          <textarea rows="4" [formField]="profileForm.notes"></textarea>
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

  readonly profileModel = linkedSignal(() =>
    toProfileFormModel(this.store.character()?.profile ?? createEmptyProfile()),
  );

  readonly profileForm = form(this.profileModel);

  constructor() {
    effect(() => {
      const next = this.profileModel();
      const current = toProfileFormModel(this.store.character()?.profile ?? createEmptyProfile());
      if (profileFormEqual(current, next)) return;

      untracked(() => this.store.updateProfile(toCharacterProfile(next)));
    });
  }
}
