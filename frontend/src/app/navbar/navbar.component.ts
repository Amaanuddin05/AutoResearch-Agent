import { DOCUMENT, NgFor, NgIf, AsyncPipe } from '@angular/common';
import { Component, Inject, OnInit, Renderer2, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-navbar',
  imports: [NgFor, NgIf, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private readonly themeClass = 'dark-mode';
  private readonly isBrowser = typeof window !== 'undefined';
  private authService = inject(AuthService);
  private router = inject(Router);

  isDarkMode = false;
  isMobileMenuOpen = false;
  currentUser$: Observable<User | null> = this.authService.currentUser$;
  
  navLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Fetch', path: '/fetch' },
    { label: 'My Library', path: '/library' },
    { label: 'Chat', path: '/chat' }
  ];

  constructor(
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.applyInitialTheme();
  }

  toggleTheme(): void {
    this.setDarkMode(!this.isDarkMode);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }

  private applyInitialTheme(): void {
    if (!this.isBrowser) {
      return;
    }

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      this.setDarkMode(true, false);
      return;
    }

    if (storedTheme === 'light') {
      this.setDarkMode(false, false);
      return;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    this.setDarkMode(prefersDark, false);
  }

  private setDarkMode(enable: boolean, persist = true): void {
    this.isDarkMode = enable;

    if (!this.isBrowser) {
      return;
    }

    if (enable) {
      this.renderer.addClass(this.document.documentElement, this.themeClass);
      this.renderer.addClass(this.document.body, this.themeClass);
      if (persist) {
        localStorage.setItem('theme', 'dark');
      }
    } else {
      this.renderer.removeClass(this.document.documentElement, this.themeClass);
      this.renderer.removeClass(this.document.body, this.themeClass);
      if (persist) {
        localStorage.setItem('theme', 'light');
      }
    }
  }
}
