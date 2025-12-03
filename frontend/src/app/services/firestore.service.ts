import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc,
  DocumentData,
  CollectionReference,
  DocumentReference
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private db: Firestore = inject(Firestore);

  // Helper Functions
  private getUserRef(uid: string): DocumentReference<DocumentData> {
    return doc(this.db, 'users', uid);
  }

  private getPapersRef(uid: string): CollectionReference<DocumentData> {
    return collection(this.getUserRef(uid), 'papers');
  }

  private getSummariesRef(uid: string): CollectionReference<DocumentData> {
    return collection(this.getUserRef(uid), 'summaries');
  }

  private getInsightsRef(uid: string): CollectionReference<DocumentData> {
    return collection(this.getUserRef(uid), 'insights');
  }

  // --- User ---
  async getUser(uid: string): Promise<any> {
    const userRef = this.getUserRef(uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
  }

  // --- Papers CRUD ---

  async addPaper(uid: string, paperId: string | undefined, data: any): Promise<string> {
    const papersRef = this.getPapersRef(uid);
    let docRef;
    if (paperId) {
      docRef = doc(papersRef, paperId);
    } else {
      docRef = doc(papersRef);
    }
    await setDoc(docRef, data);
    return docRef.id;
  }

  async getAllPapers(uid: string): Promise<any[]> {
    const papersRef = this.getPapersRef(uid);
    const snapshot = await getDocs(papersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updatePaper(uid: string, paperId: string, data: any): Promise<void> {
    const papersRef = this.getPapersRef(uid);
    const docRef = doc(papersRef, paperId);
    await updateDoc(docRef, data);
  }

  async deletePaper(uid: string, paperId: string): Promise<void> {
    const papersRef = this.getPapersRef(uid);
    const docRef = doc(papersRef, paperId);
    await deleteDoc(docRef);
  }

  // --- Summaries CRUD ---

  async saveSummary(uid: string, summaryId: string, data: any): Promise<void> {
    const summariesRef = this.getSummariesRef(uid);
    const docRef = doc(summariesRef, summaryId);
    await setDoc(docRef, data);
  }

  async getSummaries(uid: string): Promise<any[]> {
    const summariesRef = this.getSummariesRef(uid);
    const snapshot = await getDocs(summariesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // --- Insights CRUD ---

  async saveInsight(uid: string, insightId: string, data: any): Promise<void> {
    const insightsRef = this.getInsightsRef(uid);
    const docRef = doc(insightsRef, insightId);
    await setDoc(docRef, data);
  }

  async getInsights(uid: string): Promise<any[]> {
    const insightsRef = this.getInsightsRef(uid);
    const snapshot = await getDocs(insightsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
