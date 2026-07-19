import { PlatformLocation } from '@angular/common';
import { inject } from '@angular/core';

/** Join a site-root path with Angular's configured base href. */
export function joinAppUrl(baseHref: string, path: string): string {
  const base = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
  return `${base}${path.replace(/^\//, '')}`;
}

/** Read the app base href from `<base href>` (set by `ng build --base-href`). */
export function injectAppBaseHref(): string {
  return inject(PlatformLocation).getBaseHrefFromDOM() || '/';
}
