import { Injectable, inject, signal } from '@angular/core';
import { ChummerDataService } from './chummer-data.service';
import { Book } from '../models/chummer-data.types';

@Injectable({ providedIn: 'root' })
export class BookRegistryService {
  private readonly data = inject(ChummerDataService);

  private readonly booksByCode = signal<Map<string, Book>>(new Map());
  private readonly loaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    if (this.loaded()) return;
    if (!this.loadPromise) {
      this.loadPromise = this.load();
    }
    await this.loadPromise;
  }

  private async load(): Promise<void> {
    try {
      const doc = await this.data.loadBooks();
      const map = new Map<string, Book>();
      for (const book of doc.books ?? []) {
        map.set(book.code, book);
      }
      this.booksByCode.set(map);
      this.loaded.set(true);
    } catch {
      this.loaded.set(false);
    }
  }

  resolve(code: string | undefined): string {
    if (!code) return '';
    return this.booksByCode().get(code)?.name ?? code;
  }
}
