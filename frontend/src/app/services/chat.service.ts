import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatSource {
  title: string;
  doc_id: string;
  chunk_type: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:5000'; // Node.js backend

  constructor(private http: HttpClient) {}

  sendMessage(message: string, contextIds: string[] = []): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, {
      message,
      context: contextIds
    });
  }
}
