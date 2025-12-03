import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, authState, User } from '@angular/fire/auth';
import { Observable, firstValueFrom, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  currentUser$: Observable<User | null> = authState(this.auth);
  currentUid$: Observable<string | null> = this.currentUser$.pipe(
    map(user => user?.uid ?? null)
  );

  async getUidOnce(): Promise<string> {
    const user = await firstValueFrom(this.currentUser$);
    return user?.uid ?? '';
  }

  signUp(email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  loginWithGoogle(): Promise<any> {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
