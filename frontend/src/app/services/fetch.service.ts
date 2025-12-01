import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FetchService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  fetchPapers(payload: {
    query?: string;
    category?: string;
    filter?: string;
    max_results?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/fetch`, payload);
  }

  fetchAndSummarize(payload: {
  query?: string;
  category?: string;
  filter?: string;
  max_results?: number;
  pdf_url?: string;
  metadata?: any;
}): Observable<any> {
  return this.http.post(`${this.apiUrl}/fetch_and_summarize`, payload);
}

}
