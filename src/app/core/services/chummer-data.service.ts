import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BooksDocument, ChummerDataDocument, ChummerItem, DataManifest } from '../models/chummer-data.types';
import { extractCollection, normalizeCollectionItems } from '../utils/collection-utils';
import { injectAppBaseHref, joinAppUrl } from '../utils/app-url';

@Injectable({ providedIn: 'root' })
export class ChummerDataService {
  private readonly http = inject(HttpClient);
  private readonly baseHref = injectAppBaseHref();
  private readonly cache = new Map<string, Promise<ChummerDataDocument>>();

  readonly manifest = signal<DataManifest | null>(null);
  readonly manifestError = signal<string | null>(null);

  async loadManifest(): Promise<DataManifest | null> {
    if (this.manifest()) return this.manifest();

    try {
      const data = await firstValueFrom(
        this.http.get<DataManifest>(joinAppUrl(this.baseHref, 'manifest.json')),
      );
      this.manifest.set(data);
      this.manifestError.set(null);
      return data;
    } catch {
      this.manifestError.set('Game data not found. Run npm run convert first.');
      return null;
    }
  }

  loadDocument(file: string): Promise<ChummerDataDocument> {
    const key = file.replace(/\.json$/, '');
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        firstValueFrom(
          this.http.get<ChummerDataDocument>(joinAppUrl(this.baseHref, `data/${key}.json`)),
        ),
      );
    }
    return this.cache.get(key)!;
  }

  async loadItems(file: string, collectionKey: string): Promise<ChummerItem[]> {
    const doc = await this.loadDocument(file);
    const raw = doc[collectionKey];
    return normalizeCollectionItems(extractCollection(raw));
  }

  async loadBooks(): Promise<BooksDocument> {
    return this.loadDocument('books') as Promise<BooksDocument>;
  }

  clearCache(): void {
    this.cache.clear();
    this.manifest.set(null);
    this.manifestError.set(null);
  }
}
