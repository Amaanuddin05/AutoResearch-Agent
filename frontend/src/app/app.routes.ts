import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { FetchComponent } from './fetch/fetch.component';
import { AnalyzeComponent } from './analyze/analyze.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'home', component: HomeComponent },
    { path:'fetch', component: FetchComponent },
    { path:'analyze', component: AnalyzeComponent },

];
