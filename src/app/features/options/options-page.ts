import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CharacterOptions, DEFAULT_CHARACTER_OPTIONS } from '../../core/rules';
import { CharacterStoreService } from '../../core/services/character-store.service';

@Component({
  selector: 'app-options-page',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>Creation options</h1>
      <p>Build method, BP/karma pools, and house-rule costs for character creation.</p>
    </header>

    @if (!store.initialized()) {
      <p role="status">Loading…</p>
    } @else {
      <form class="options-form" (submit)="$event.preventDefault()">
        <fieldset>
          <legend>Build method</legend>
          <label>
            Method
            <select [formField]="optionsForm.buildMethod" (change)="apply()">
              <option value="BP">Build Points</option>
              <option value="Karma">Karma</option>
            </select>
          </label>
          <label>
            Build points
            <input type="number"  [formField]="optionsForm.buildPoints" (change)="apply()" />
          </label>
          <label>
            Build karma
            <input type="number"  [formField]="optionsForm.buildKarma" (change)="apply()" />
          </label>
          <label>
            Maximum availability
            <input
              type="number"
              [formField]="optionsForm.maximumAvailability"
              (change)="apply()"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>BP costs</legend>
          <label>
            Nuyen per BP
            <input type="number"  [formField]="optionsForm.nuyenPerBp" (change)="apply()" />
          </label>
          <label>
            Attribute
            <input type="number"  [formField]="optionsForm.bpAttribute" (change)="apply()" />
          </label>
          <label>
            Spell
            <input type="number"  [formField]="optionsForm.bpSpell" (change)="apply()" />
          </label>
          <label>
            Complex form
            <input type="number"  [formField]="optionsForm.bpComplexForm" (change)="apply()" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Karma costs</legend>
          <label>
            Nuyen per karma
            <input type="number"  [formField]="optionsForm.karmaNuyen" (change)="apply()" />
          </label>
          <label>
            Attribute (× rating)
            <input type="number"  [formField]="optionsForm.karmaAttribute" (change)="apply()" />
          </label>
          <label>
            Active skill (× rating)
            <input type="number"  [formField]="optionsForm.karmaActiveSkill" (change)="apply()" />
          </label>
          <label>
            Spell
            <input type="number"  [formField]="optionsForm.karmaSpell" (change)="apply()" />
          </label>
          <label>
            Free knowledge under karma
            <input type="checkbox" [formField]="optionsForm.freeKarmaKnowledge" (change)="apply()" />
          </label>
        </fieldset>

        <fieldset>
          <legend>House rules</legend>
          <label>
            Allow exceed attribute BP cap
            <input
              type="checkbox"
              [formField]="optionsForm.allowExceedAttributeBp"
              (change)="apply()"
            />
          </label>
          <label>
            More lethal gameplay
            <input
              type="checkbox"
              [formField]="optionsForm.moreLethalGameplay"
              (change)="apply()"
            />
          </label>
        </fieldset>

        <p class="status" role="status">{{ status() }}</p>
        <a routerLink="/characters">Back to characters</a>
      </form>
    }
  `,
  styles: `
    .page-header {
      margin-bottom: 1.5rem;
      h1 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--color-text-muted); }
    }

    .options-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 36rem;
    }

    fieldset {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
    }

    label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    input, select {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      min-width: 8rem;
    }

    input[type='checkbox'] { min-width: auto; }

    .status { color: var(--color-text-muted); font-size: 0.875rem; }
  `,
})
export class OptionsPage implements OnInit {
  readonly store = inject(CharacterStoreService);
  readonly status = signal('Changes apply immediately to new and open characters.');

  readonly optionsModel = signal<CharacterOptions>({ ...DEFAULT_CHARACTER_OPTIONS });
  readonly optionsForm = form(this.optionsModel);

  async ngOnInit(): Promise<void> {
    await this.store.ensureInitialized();
    this.optionsModel.set({ ...this.store.options() });
  }

  apply(): void {
    const next = { ...this.optionsModel() };
    this.store.setOptions(next);
    this.status.set(
      next.buildMethod === 'Karma'
        ? `Using Karma creation (${next.buildKarma} karma).`
        : `Using BP creation (${next.buildPoints} BP).`,
    );
  }
}
