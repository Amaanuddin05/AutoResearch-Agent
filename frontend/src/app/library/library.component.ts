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
  isCleaningUp = false;

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
    if (!confirm('Are you sure you want to delete this paper permanently?')) return;

    const uid = await this.authService.getUidOnce();

    // 1. Remove from Firestore + local BehaviorSubject
    await this.paperService.removeFromLibrary(uid, paperId);

    // 2. Delete from ChromaDB backend
    this.paperService.deletePaperFromBackend(uid, paperId).subscribe({
      next: (res) => console.log('🗑️ Deleted from ChromaDB:', res),
      error: (err) => console.warn('⚠️ ChromaDB delete failed (may already be gone):', err)
    });

    // 3. Update local UI lists immediately
    this.savedPapers   = this.savedPapers.filter(p => p.id !== paperId);
    this.filteredPapers = this.filteredPapers.filter(p => p.id !== paperId);

    // 4. Clear sidebar if the deleted paper was selected
    if (this.selectedPaper?.id === paperId) {
      this.selectedPaper = this.filteredPapers[0] ?? null;
    }
  }

  viewPDF(url: string | null): void {
    if (url) window.open(url, '_blank');
  }

  async cleanupOrphans(): Promise<void> {
    const uid = await this.authService.getUidOnce();
    if (!uid) return;

    this.isCleaningUp = true;
    this.paperService.cleanupOrphans(uid).subscribe({
      next: (res) => {
        this.isCleaningUp = false;
        // Remove orphans from local lists
        this.savedPapers    = this.savedPapers.filter(p => !res.deleted_ids.includes(p.id));
        this.filteredPapers = this.filteredPapers.filter(p => !res.deleted_ids.includes(p.id));
        if (this.selectedPaper && res.deleted_ids.includes(this.selectedPaper.id)) {
          this.selectedPaper = this.filteredPapers[0] ?? null;
        }
        const msg = res.deleted_ids.length > 0
          ? `🗑️ Removed ${res.deleted_ids.length} orphan paper(s) with no RAG data.`
          : '✅ No orphan papers found. Library is clean!';
        alert(msg);
      },
      error: (err) => {
        this.isCleaningUp = false;
        console.error('⚠️ Cleanup failed:', err);
        alert('Cleanup failed. Check console for details.');
      }
    });
  }
