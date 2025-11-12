import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { FetchComponent } from './fetch/fetch.component';
import { AnalyzeComponent } from './analyze/analyze.component';
import { LibraryComponent } from './library/library.component';
import { ChatComponent } from './chat/chat.component';
import { ResearchHistoryComponent } from './research-history/research-history.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path:'fetch', component: FetchComponent },
    { path:'analyze', component: AnalyzeComponent },
    { path:'library', component: LibraryComponent },
    { path:'chat', component: ChatComponent },
    { path:'research_history', component: ResearchHistoryComponent },


];
