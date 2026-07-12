import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Modern Chummer — Shadowrun 4',
  },
  {
    path: 'reference',
    loadChildren: () => import('./features/reference/reference.routes').then((m) => m.REFERENCE_ROUTES),
    title: 'Reference',
  },
  {
    path: 'characters',
    loadChildren: () => import('./features/characters/characters.routes').then((m) => m.CHARACTER_ROUTES),
    title: 'Characters',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
