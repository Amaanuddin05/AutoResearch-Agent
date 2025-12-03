import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FetchService {

  private nodeApiUrl = 'http://localhost:5000';
  private mlApiUrl = 'http://localhost:8000'; 

  constructor(private http: HttpClient) {}

  fetchPapers(payload: {
    uid: string;
    query?: string | null;
    category?: string | null;
    filter?: string | null;
    max_results?: number;
  }): Observable<any> {
    return this.http.post(`${this.nodeApiUrl}/fetch`, payload);
  }

  fetchAndSummarize(payload: {
    uid: string;
    pdf_url: string;
    metadata: any;
  }): Observable<any> {
    return this.http.post(`${this.nodeApiUrl}/fetch_and_summarize`, payload);
  }


  getAnalysisStatus(uid: string, jobId: string): Observable<any> {
    return this.http.get(`${this.nodeApiUrl}/status/${jobId}`, {
      params: { uid }
    });
  }
}
