import { DOCUMENT, NgFor, NgIf } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-navbar',
  imports: [NgFor, NgIf],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  private readonly themeClass = 'dark-mode';
  private readonly isBrowser = typeof window !== 'undefined';

  isDarkMode = false;
  isMobileMenuOpen = false;
  
  navLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Fetch', path: '/fetch' },
    { label: 'My Library', path: '/library' },
    { label: 'Login', path: '/login' },
    // { label: 'History', path: '/research_history' },
    // { label: 'Analyze', path: '/analyze' },
    { label: 'Chat', path: '/chat' }
  ];

  userAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzG7BAa8uOgl55IHGxRZ1Xds1iSjzcjWnNpu9WntW-QbZIIV8B1gjdC31CI0F0AMR7jYv6qlroSZ-D9ZFM3ZLea1gjHAIM3tkVu4kmmM7Cgx_rPlzMnZ07Ir4TYMDDNuT3IDyr5fUiHYAFrj2jFiaajClaNESRu-qnT9Ky6vGvn3f24ZfAGhx_lYSXq6S4veegxjxjC30sEYqSSoaOmm-67pJKIn6PQzMHAwMLe2YcpU7IhIQmDsZVoKgB_mx4XQxgteIyWkdi4II';

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
