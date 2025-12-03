import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Paper, PaperService } from '../services/paper.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-library',
  imports: [CommonModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnInit {
  searchQuery: string = '';
  selectedSort: string = 'Date Added';
  
  activeFilters: string[] = [];
  
  sortOptions: string[] = [
    'Relevance',
    'Date Added',
    'Title A-Z'
  ];

  savedPapers: Paper[] = [];
  filteredPapers: Paper[] = [];
  selectedPaper: Paper | null = null;

  constructor(
    private paperService: PaperService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPapers();
  }

  async loadPapers(): Promise<void> {
    const uid = await this.authService.getUidOnce();
    if (!uid) return;

    // First try to load from local storage
    this.savedPapers = this.paperService.getPapers();
    this.filteredPapers = [...this.savedPapers];
    
    if (this.savedPapers.length > 0) {
      this.selectedPaper = this.savedPapers[0];
    }

    // Also sync with ChromaDB in background
    this.paperService.loadPapers(uid).subscribe({
      next: (papers) => {
        // Optional: Merge or update logic if needed
        // For now, we rely on local storage for the library view
        // but this ensures the service has the latest state
      }
    });
  }

  searchPapers(): void {
    if (!this.searchQuery.trim()) {
      this.filteredPapers = [...this.savedPapers];
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredPapers = this.savedPapers.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.authors.some(a => a.toLowerCase().includes(query))
    );
  }

  selectPaper(paper: Paper): void {
    this.selectedPaper = paper;
  }

  viewSummary(paperId: string): void {
    this.router.navigate(['/analyze', paperId]);
  }
  
  chatWithPaper(paperId: string): void {
    this.router.navigate(['/chat'], { queryParams: { paperId } });
  }

  async deletePaper(paperId: string): Promise<void> {
    if (!confirm('Are you sure you want to remove this paper from your library?')) return;
    
    const uid = await this.authService.getUidOnce();
    await this.paperService.removeFromLibrary(uid, paperId);
    this.loadPapers(); // Refresh list
    
    // Also try to delete from backend
    this.paperService.deletePaperFromDB(uid, paperId).subscribe();
  }

  viewPDF(url: string | null): void {
    if (url) window.open(url, '_blank');
  }
}
