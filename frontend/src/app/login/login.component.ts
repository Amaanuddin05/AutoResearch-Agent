import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    const signUpButton = document.getElementById('signUp') as HTMLButtonElement | null;
    const signInButton = document.getElementById('signIn') as HTMLButtonElement | null;
    const container = document.getElementById('container') as HTMLElement | null;

    if (signUpButton && signInButton && container) {
      signUpButton.addEventListener('click', () => {
        container.classList.add('right-panel-active');
      });

      signInButton.addEventListener('click', () => {
        container.classList.remove('right-panel-active');
      });
    }
  }
}
