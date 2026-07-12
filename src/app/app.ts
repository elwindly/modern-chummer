import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <a class="skip-link" href="#main-content">Skip to main content</a>

      <header class="app-header" role="banner">
        <div class="header-inner">
          <a routerLink="/" class="brand" aria-label="Modern Chummer home">
            <span class="brand-mark" aria-hidden="true">C4</span>
            <span class="brand-text">
              <span class="brand-title">Modern Chummer</span>
              <span class="brand-subtitle">Shadowrun 4th Anniversary Edition</span>
            </span>
          </a>

          <nav class="main-nav" aria-label="Main navigation">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
              Home
            </a>
            <a routerLink="/reference" routerLinkActive="active">Reference</a>
            <a routerLink="/characters" routerLinkActive="active">Characters</a>
          </nav>
        </div>
      </header>

      <main id="main-content" class="app-main" role="main">
        <router-outlet />
      </main>

      <footer class="app-footer" role="contentinfo">
        <p>Game data from ChummerGenSR4. Shadowrun is © The Topps Company, Inc.</p>
      </footer>
    </div>
  `,
  styles: `
    .app-shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .skip-link {
      position: absolute;
      top: -100%;
      left: 1rem;
      z-index: 100;
      padding: 0.5rem 1rem;
      background: var(--color-focus);
      color: #fff;
      border-radius: var(--radius);

      &:focus {
        top: 1rem;
      }
    }

    .app-header {
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--color-text);
      text-decoration: none;

      &:hover {
        text-decoration: none;
      }
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      color: var(--color-accent);
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.875rem;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-weight: 600;
      font-size: 1.125rem;
    }

    .brand-subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .main-nav {
      display: flex;
      gap: 0.25rem;

      a {
        padding: 0.5rem 1rem;
        border-radius: var(--radius);
        color: var(--color-text-muted);
        text-decoration: none;
        font-weight: 500;

        &:hover {
          color: var(--color-text);
          background: var(--color-surface-raised);
          text-decoration: none;
        }

        &.active {
          color: var(--color-text);
          background: var(--color-surface-raised);
        }

        &:focus-visible {
          outline: 2px solid var(--color-focus);
          outline-offset: 2px;
        }
      }
    }

    .app-main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .app-footer {
      border-top: 1px solid var(--color-border);
      padding: 1rem 1.5rem;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.8125rem;

      p {
        margin: 0;
      }
    }
  `,
})
export class App {}
