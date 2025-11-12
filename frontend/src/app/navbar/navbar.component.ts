import { NgFor,NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  imports: [NgFor,NgIf],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
   isDarkMode = false;
  isMobileMenuOpen = false;
  
  navLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Fetch', path: '/fetch' },
    { label: 'My Library', path: '/library' },
    // { label: 'History', path: '/research_history' },
    // { label: 'Analyze', path: '/analyze' },
    { label: 'Chat', path: '/chat' }
  ];

  userAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzG7BAa8uOgl55IHGxRZ1Xds1iSjzcjWnNpu9WntW-QbZIIV8B1gjdC31CI0F0AMR7jYv6qlroSZ-D9ZFM3ZLea1gjHAIM3tkVu4kmmM7Cgx_rPlzMnZ07Ir4TYMDDNuT3IDyr5fUiHYAFrj2jFiaajClaNESRu-qnT9Ky6vGvn3f24ZfAGhx_lYSXq6S4veegxjxjC30sEYqSSoaOmm-67pJKIn6PQzMHAwMLe2YcpU7IhIQmDsZVoKgB_mx4XQxgteIyWkdi4II';

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    console.log('Dark mode:', this.isDarkMode);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
