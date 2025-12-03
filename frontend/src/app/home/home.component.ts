import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Paper, PaperService } from '../services/paper.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
   savedPapers: Paper[] = [];
  isLoading = true;

  constructor(
    private paperService: PaperService,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    const uid = await this.authService.getUidOnce();
    if (!uid) {
      this.isLoading = false;
      return;
    }

    // Load saved papers from ChromaDB
    this.paperService.loadPapers(uid).subscribe({
      next: () => {
        const allPapers = this.paperService.getPapers();
        this.savedPapers = allPapers.slice(0, 6); // Show up to 6 on home
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading saved papers:', err);
        this.isLoading = false;
      },
    });
  }

  /** Navigate to detailed view */
  viewSummary(paperId: string): void {
    this.router.navigate(['/analyze', paperId]);
  }

  /** Toggle favorite (for UI only right now) */
  toggleFavorite(paperId: string): void {
    const paper = this.savedPapers.find(p => p.id === paperId);
    if (paper) paper.isFavorite = !paper.isFavorite;
  }

  async deletePaper(id: string) {
  if (!confirm('Are you sure you want to delete this paper permanently?')) return;

  const uid = await this.authService.getUidOnce();
  this.paperService.deletePaperFromDB(uid, id).subscribe({
    next: (res) => {
      console.log('🗑️', res);
      // remove from local list immediately
      this.savedPapers = this.savedPapers.filter(p => p.id !== id);
    },
    error: (err) => {
      console.error('⚠️ Failed to delete paper:', err);
      alert('Error deleting paper.');
    }
  });
}

}
