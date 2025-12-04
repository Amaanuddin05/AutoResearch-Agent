import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EnrichedChunk {
  id: string;
  content: string;
  metadata: any;
}

export interface EnrichedPaperData {
  paper: {
    id: string;
    title: string;
    authors: string;
    published: string;
    pdf_url: string;
    summary: string;
    insights: any;
    metadata: any;
  };
  enriched_chunks: {
    paragraph_rewrite: EnrichedChunk[];
    finding: EnrichedChunk[];
    method: EnrichedChunk[];
    dataset: EnrichedChunk[];
    implication: EnrichedChunk[];
    concept: EnrichedChunk[];
    section_summary: EnrichedChunk[];
    limitation: EnrichedChunk[];
    citation: EnrichedChunk[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AnalyzeService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  getEnrichedPaper(uid: string, paperId: string): Observable<EnrichedPaperData> {
    return this.http.get<EnrichedPaperData>(
      `${this.apiUrl}/get_enriched_paper/${paperId}`,
      { params: { uid } }
    );
  }
}
