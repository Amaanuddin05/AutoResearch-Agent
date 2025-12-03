import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, from, map } from 'rxjs';
import { FirestoreService } from './firestore.service';

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
  private firestoreService = inject(FirestoreService);

  constructor(private http: HttpClient) {}

  /**
   * Search papers from backend (ChromaDB/Arxiv)
   */
  searchPapers(uid: string, query: string, n_results = 50): Observable<Paper[]> {
    return this.http
      .post(`${this.apiUrl}/search_papers`, {
        uid,
        query,
        n_results,
      })
      .pipe(
        map((res) => this.mapChromaResponse(res)),
        tap((parsed) => {
          // We might not want to overwrite the main subject with search results 
          // if the subject is intended for "Library" papers.
          // But based on previous code, it seemed to do so.
          // For now, we'll just return the observable.
        })
      );
  }

  /**
   * Load saved papers from Firestore
   */
  loadPapers(uid: string): Observable<Paper[]> {
    return from(this.firestoreService.getAllPapers(uid)).pipe(
      map((rawPapers) => rawPapers.map((p) => this.normalizePaper(p))),
      tap((papers) => {
        this.papersSubject.next(papers);
      })
    );
  }

  getPapers(): Paper[] {
    return this.papersSubject.getValue();
  }

  async getPaperById(uid: string, id: string): Promise<Paper | undefined> {
    // First check local state
    const localPaper = this.getPapers().find((p) => p.id === id || p.title === id);
    if (localPaper) return localPaper;

    // Fallback to fetching all papers
    const papers = await this.firestoreService.getAllPapers(uid);
    const found = papers.find((p: any) => p.id === id || p.title === id);
    return found ? this.normalizePaper(found) : undefined;
  }

  /**
   * Add paper to Firestore Library
   */
  async addToLibrary(uid: string, paper: Paper): Promise<void> {
    const normalized = this.normalizePaper(paper);
    
    // Ensure ID exists
    if (!normalized.id) {
       // Fallback for random ID
       normalized.id = typeof crypto !== 'undefined' && crypto.randomUUID 
         ? crypto.randomUUID() 
         : Date.now().toString();
    }

    // Add to Firestore
    await this.firestoreService.addPaper(uid, normalized.id, normalized);

    // Update local state
    const current = this.getPapers();
    if (!current.find(p => p.id === normalized.id)) {
      this.papersSubject.next([...current, normalized]);
    }
  }

  /**
   * Remove from Firestore Library
   */
  async removeFromLibrary(uid: string, paperId: string): Promise<void> {
    await this.firestoreService.deletePaper(uid, paperId);
    // Update local state
    const current = this.getPapers().filter(p => p.id !== paperId);
    this.papersSubject.next(current);
  }

  /**
   * Delete from Firestore (alias for removeFromLibrary, kept for compatibility)
   */
  deletePaperFromDB(uid: string, paperId: string): Observable<void> {
    return from(this.removeFromLibrary(uid, paperId));
  }

  /**
   * Delete from Backend (ChromaDB)
   */
  deletePaperFromBackend(uid: string, paperId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete_paper/${paperId}`, {
      params: { uid }
    });
  }

  // --- Helpers ---

  private normalizePaper(raw: any): Paper {
    // Ensure ID
    const id = raw.id || raw.doc_id || raw.metadata?.doc_id || '';
    
    // Ensure Authors
    let authors: string[] = [];
    if (Array.isArray(raw.authors)) {
      authors = raw.authors;
    } else if (typeof raw.authors === 'string') {
      authors = raw.authors.split(',').map((a: string) => a.trim());
    }

    // Ensure Insights
    let insights = {};
    if (typeof raw.insights === 'string') {
      try {
        insights = JSON.parse(raw.insights);
      } catch {
        insights = {};
      }
    } else {
      insights = raw.insights || {};
    }

    // Ensure Date
    const dateAdded = raw.dateAdded || new Date().toISOString();

    return {
      id,
      title: raw.title || raw.metadata?.title || 'Untitled',
      authors,
      summary: raw.summary || raw.metadata?.summary || null,
      published: raw.published || raw.metadata?.published || null,
      pdf_url: raw.pdf_url || raw.metadata?.pdf_url || null,
      citationCount: raw.citationCount || 0,
      insights,
      isFavorite: !!raw.isFavorite,
      isSelected: !!raw.isSelected,
      dateAdded,
      source: raw.source || 'Unknown'
    };
  }

  private mapChromaResponse(response: any): Paper[] {
    if (!response || !Array.isArray(response.papers)) return [];
    return response.papers.map((p: any) => this.normalizePaper(p));
  }
}
