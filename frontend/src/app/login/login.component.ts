import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  isSignUpMode = signal(false);

  signUpForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  switchToSignUp(): void {
    this.isSignUpMode.set(true);
  }

  switchToSignIn(): void {
    this.isSignUpMode.set(false);
  }

  async onSignUp() {
  if (this.signUpForm.invalid) return;

  const { email, password, name } = this.signUpForm.value;

  try {
    const cred = await this.authService.signUp(email!, password!);

    // Create Firestore user document
    await setDoc(doc(this.firestore, `users/${cred.user.uid}`), {
      email,
      name,
      createdAt: new Date().toISOString()
    });

    this.router.navigate(['/']);
  } catch (error) {
    console.error('Sign up error:', error);
    alert('Sign up failed. Please try again.');
  }
}


  async onSignIn() {
    if (this.signInForm.invalid) return;

    const { email, password } = this.signInForm.value;
    
    try {
      await this.authService.login(email!, password!);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please try again.');
    }
  }

  async onGoogleLogin() {
  try {
    const cred = await this.authService.loginWithGoogle();

    await setDoc(doc(this.firestore, `users/${cred.user.uid}`), {
      email: cred.user.email,
      name: cred.user.displayName,
      createdAt: new Date().toISOString()
    }, { merge: true });

    this.router.navigate(['/']);
  } catch (error) {
    console.error('Google login error:', error);
  }
}

}
