import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContentFilterService } from '../core/services/content-filter.service';
import { ContentSourceScope } from '../core/models/content-source-scope';

@Component({
  selector: 'app-source-filter-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-group" role="group" [attr.aria-label]="ariaLabel()">
      @for (option of options; track option.scope) {
        <button
          type="button"
          class="filter-btn"
          [class.active]="filter.scope() === option.scope"
          [attr.aria-pressed]="filter.scope() === option.scope"
          (click)="filter.setScope(option.scope)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .filter-group {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      font: inherit;

      &:hover {
        border-color: var(--color-accent);
      }

      &.active {
        border-color: var(--color-accent);
        background: var(--color-surface-raised);
        font-weight: 600;
      }
    }
  `,
})
export class SourceFilterControl {
  readonly filter = inject(ContentFilterService);

  readonly options: Array<{ scope: ContentSourceScope; label: string }> = [
    { scope: 'all', label: 'All books' },
    { scope: 'base', label: 'Core rulebook' },
  ];

  ariaLabel(): string {
    return 'Content source filter';
  }
}
