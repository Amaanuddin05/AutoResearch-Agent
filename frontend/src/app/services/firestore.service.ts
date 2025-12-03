import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, collectionData } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Paper } from '../models/paper.model';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore = inject(Firestore);

  savePaper(userId: string, paper: Paper): Observable<void> {
    const paperRef = doc(this.firestore, `users/${userId}/papers/${paper.id}`);
    const cleanPaper = JSON.parse(JSON.stringify(paper));
    return from(setDoc(paperRef, { ...cleanPaper, dateAdded: new Date().toISOString() }));
  }

  getPapers(userId: string): Observable<Paper[]> {
    const papersRef = collection(this.firestore, `users/${userId}/papers`);
    return collectionData(papersRef, { idField: 'id' }) as Observable<Paper[]>;
  }

  deletePaper(userId: string, paperId: string): Observable<void> {
    const paperRef = doc(this.firestore, `users/${userId}/papers/${paperId}`);
    return from(deleteDoc(paperRef));
  }
}
