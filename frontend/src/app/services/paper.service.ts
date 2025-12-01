import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Paper {
  id: string;
  title: string;
  authors: string[];       
  summary: string | null;
  published: string | null; 
  pdf_url: string | null;
  citationCount?: number;
  insights?: any;
  isFavorite?: boolean;
  isSelected?: boolean;
  dateAdded?: string;
  source?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaperService {
  private apiUrl = 'http://localhost:8000';
  private papersSubject = new BehaviorSubject<Paper[]>([]);
  papers$ = this.papersSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPapers(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/search_papers`, {
        query: 'research',
        n_results: 50,
      })
      .pipe(
        tap((res) => {
          const parsed = this.mapChromaResponse(res);
          this.papersSubject.next(parsed);
        })
      );
  }

  getPapers(): Paper[] {
    return this.papersSubject.getValue();
  }

  getPaperById(id: string): Paper | undefined {
    const papers = [...this.getPapers(), ...this.getAllPapers()];
    return papers.find((p) => p.id === id || p.title === id);
  }

  private mapChromaResponse(response: any): Paper[] {
    if (!response || !Array.isArray(response.papers)) return [];

    return response.papers.map((p: any) => {
      const parsedInsights =
        typeof p.insights === 'string'
          ? JSON.parse(p.insights || '{}')
          : p.insights || {};

      const authors =
        typeof p.authors === 'string'
          ? p.authors.split(',').map((a: string) => a.trim())
          : p.authors || [];

      return {
        id: p.id,
        title: p.title || 'Untitled',
        authors,
        summary: p.summary || null,
        published: p.published || null,
        pdf_url: p.pdf_url || null,
        insights: parsedInsights,
        dateAdded: new Date().toISOString(),
        source: 'ChromaDB',
      };
    });
  }

  getAllPapers(): Paper[] {
    const stored = localStorage.getItem('savedPapers');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  addToLibrary(paper: Paper): void {
    const saved = this.getAllPapers();
    if (!saved.find((p) => p.id === paper.id)) {
      saved.push({
        ...paper,
        dateAdded: new Date().toISOString(),
      });
      localStorage.setItem('savedPapers', JSON.stringify(saved));
    }
  }

  removeFromLibrary(paperId: string): void {
    const saved = this.getAllPapers().filter((p) => p.id !== paperId);
    localStorage.setItem('savedPapers', JSON.stringify(saved));
  }

  deletePaperFromDB(paperId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete_paper/${paperId}`);
  }
}
