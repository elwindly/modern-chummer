import { Injectable, signal } from '@angular/core';
import { ContentSourceScope } from '../models/content-source-scope';

const STORAGE_KEY = 'mc4-content-source-scope';

@Injectable({ providedIn: 'root' })
export class ContentFilterService {
  readonly scope = signal<ContentSourceScope>(this.readStoredScope());

  setScope(scope: ContentSourceScope): void {
    this.scope.set(scope);
    this.persistScope(scope);
  }

  private readStoredScope(): ContentSourceScope {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'base' ? 'base' : 'all';
    } catch {
      return 'all';
    }
  }

  private persistScope(scope: ContentSourceScope): void {
    try {
      localStorage.setItem(STORAGE_KEY, scope);
    } catch {
      // Ignore storage failures (private browsing, quota, etc.).
    }
  }
}
