import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-placeholder-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="placeholder-heading">
      <h2 id="placeholder-heading">{{ title() }}</h2>
      <p class="muted">{{ description() }}</p>
    </section>
  `,
  styles: `
    h2 { margin: 0 0 0.75rem; }
    .muted { color: var(--color-text-muted); margin: 0; }
  `,
})
export class PlaceholderTab {
  readonly title = input.required<string>();
  readonly description = input(
    'This tab shell is wired up. Detailed editing for this section comes in a later milestone.',
  );
}
