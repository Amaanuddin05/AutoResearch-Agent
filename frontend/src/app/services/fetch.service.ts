import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FetchService {
  private apiUrl = 'http://localhost:8000'; // FastAPI backend URL

  constructor(private http: HttpClient) {}

  fetchFromArxiv(category: string, max_results: number): Observable<any> {
    const params = { category, max_results };
    return this.http.get(`${this.apiUrl}/fetch_papers`, { params });
  }
  analyzePaper(paper: any): Observable<any> {
    const body = {
      path: paper.pdf_url,
      metadata: {
        title: paper.title,
        authors: paper.authors,
        pdf_url: paper.pdf_url,
        published: paper.publishedDate,
      },
    };
    return this.http.post(`${this.apiUrl}/analyze_paper`, body);
  }
}
