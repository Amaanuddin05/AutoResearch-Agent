import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  isSignUpMode = false;

  switchToSignUp(): void {
    this.isSignUpMode = true;
  }

  switchToSignIn(): void {
    this.isSignUpMode = false;
  }
}
