import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CharacterStoreService } from '../../../core/services/character-store.service';

@Component({
  selector: 'app-bp-summary-bar',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="bp-bar" aria-label="Build point summary">
      @if (store.bpBreakdown(); as bp) {
        <div class="bp-item">
          <span class="label">BP remaining</span>
          <span class="value" [class.overspent]="bp.remaining < 0">{{ bp.remaining }}</span>
        </div>
      }
      @if (store.nuyenBreakdown(); as nuyen) {
        <div class="bp-item">
          <span class="label">Nuyen remaining</span>
          <span class="value">{{ nuyen.remaining | number }}</span>
        </div>
      }
      @if (store.validation(); as validation) {
        <div class="validation status-badge" [class.valid]="validation.valid" role="status" aria-live="polite">
          @if (validation.valid) {
            Valid
          } @else {
            {{ validation.issues.length }} issue(s)
          }
        </div>
      }
    </aside>
  `,
  styles: `
    .bp-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
    }

    .bp-item {
      display: flex;
      flex-direction: column;
      min-width: 6rem;

      .label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .value {
        font-size: 1.125rem;
        font-weight: 600;

        &.overspent { color: var(--color-danger); }
      }
    }

    .validation {
      margin-left: auto;
    }
  `,
})
export class BpSummaryBar {
  readonly store = inject(CharacterStoreService);
}
