import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'home', 
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'fetch', 
    loadComponent: () => import('./fetch/fetch.component').then(m => m.FetchComponent),
    canActivate: [authGuard]
  },
  {
    path: 'analyze/:id',
    loadComponent: () => import('./analyze/analyze.component').then(m => m.AnalyzeComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'chat', 
    loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  { 
    path: 'library', 
    loadComponent: () => import('./research-history/research-history.component').then(m => m.ResearchHistoryComponent),
    canActivate: [authGuard]
  },
  { 
    path: '', 
    redirectTo: '/home', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: '/home' 
  }
];
