import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { FetchComponent } from './fetch/fetch.component';
import { LibraryComponent } from './library/library.component';
import { ChatComponent } from './chat/chat.component';
import { ResearchHistoryComponent } from './research-history/research-history.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'fetch', component: FetchComponent },
  {
    path: 'analyze/:id',
    loadComponent: () =>
      import('./analyze/analyze.component').then((m) => m.AnalyzeComponent),
  },
  { path: 'library', component: ResearchHistoryComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'research_history', component: ResearchHistoryComponent },
  { path: 'login', component: LoginComponent },


];
