import { Routes } from '@angular/router';

export const REFERENCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./reference-index').then((m) => m.ReferenceIndex),
    title: 'Reference — Modern Chummer',
  },
  {
    path: ':categoryId',
    loadComponent: () => import('./reference-browse').then((m) => m.ReferenceBrowse),
    title: 'Reference — Modern Chummer',
  },
];
