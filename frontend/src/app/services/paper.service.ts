import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Paper {
  id: string;
  title: string;
  authors: string;
  publishedDate: string;
  summary: string;
  insights?: any;
  pdf_url?: string;
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

  /** Convert backend /search_papers response → Paper[] */
  private mapChromaResponse(response: any): Paper[] {
    if (response && Array.isArray(response.papers)) {
      return response.papers.map((p: any) => {
        let insights: any = {};
        try {
          // Some insights may come as a stringified JSON
          insights =
            typeof p.insights === 'string'
              ? JSON.parse(p.insights)
              : p.insights || {};
        } catch (e) {
          insights = {};
        }

        return {
          id: p.id,
          title: p.title || 'Untitled',
          authors: p.authors || 'Unknown',
          publishedDate: p.published || 'N/A',
          summary: p.summary || 'No summary available.',
          pdf_url: p.pdf_url || 'N/A',
          insights,
          isFavorite: false,
          isSelected: false,
          dateAdded: new Date().toISOString(),
          source: 'ChromaDB',
        };
      });
    }

    console.error('Unexpected /search_papers response format:', response);
    return [];
  }

  getAllPapers(): Paper[] {
    const stored = localStorage.getItem('savedPapers');
    return stored ? JSON.parse(stored) : [];
  }

  addToLibrary(paper: Paper): void {
    const saved = this.getAllPapers();
    if (!saved.find((p) => p.id === paper.id)) {
      saved.push({ ...paper, dateAdded: new Date().toISOString() });
      localStorage.setItem('savedPapers', JSON.stringify(saved));
    }
  }

  removeFromLibrary(paperId: string): void {
    const saved = this.getAllPapers().filter((p) => p.id !== paperId);
    localStorage.setItem('savedPapers', JSON.stringify(saved));
  }

  /** Permanently delete a paper from ChromaDB */
deletePaperFromDB(paperId: string): Observable<any> {
  return this.http.delete(`${this.apiUrl}/delete_paper/${paperId}`);
}


}
