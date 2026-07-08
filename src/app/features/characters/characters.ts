import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-characters',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <h1>Characters</h1>
      <p>Character creation and career tracking — coming soon.</p>
    </header>

    <section class="placeholder" aria-labelledby="coming-soon">
      <h2 id="coming-soon">Planned features</h2>
      <ul>
        <li>Metatype and attribute allocation</li>
        <li>Skills, qualities, and magic paths</li>
        <li>Gear shopping with nuyen tracking</li>
        <li>Local save via IndexedDB</li>
        <li>Import legacy Chummer character XML</li>
      </ul>

      <p>
        For now, use the
        <a routerLink="/reference">rules reference</a>
        to explore game data.
      </p>
    </section>
  `,
  styles: `
    .page-header {
      margin-bottom: 2rem;

      h1 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--color-text-muted); }
    }

    .placeholder {
      padding: 1.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);

      h2 {
        font-size: 1rem;
        margin: 0 0 1rem;
      }

      ul {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
        color: var(--color-text-muted);
      }

      p { margin: 0; }
    }
  `,
})
export class Characters {}
