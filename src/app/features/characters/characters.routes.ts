import { Routes } from '@angular/router';

export const CHARACTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./characters').then((m) => m.Characters),
    title: 'Characters',
  },
  {
    path: 'new',
    loadComponent: () => import('../creation/creation-shell').then((m) => m.CreationShell),
    title: 'New Character',
  },
  {
    path: ':id',
    loadComponent: () => import('../creation/creation-shell').then((m) => m.CreationShell),
    title: 'Edit Character',
  },
];
