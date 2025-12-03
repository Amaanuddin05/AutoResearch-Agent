import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatSource {
  title: string;
  doc_id: string;
  chunk_type: string;
  paperTitle?: string;
  pdf_url?: string;
  section?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:8000'; // Updated to match backend port

  constructor(private http: HttpClient) {}

  sendMessage(uid: string, message: string, contextIds: string[] = []): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat_rag`, {
      uid,
      message,
      context_ids: contextIds // Backend expects context_ids, not context
    });
  }
}
