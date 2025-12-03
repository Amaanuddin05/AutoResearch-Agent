import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaperService, Paper } from '../services/paper.service';
import { AuthService } from '../services/auth.service';

type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-research-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './research-history.component.html',
  styleUrls: ['./research-history.component.scss']
})
export class ResearchHistoryComponent implements OnInit {
  // ========== STATE ==========
  papers: Paper[] = [];
  filteredPapers: Paper[] = [];
  searchQuery = '';
  viewMode: ViewMode = 'table';
  selectAll = false;

  // Pagination info (you can adjust later)
  currentPage = 1;
  entriesPerPage = 10;
  totalEntries = 0;

  // ========== STATUS ==========
  isLoading = true;
  hasError = false;

  constructor(
    private paperService: PaperService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadResearchHistory();
  }

  /** Fetch saved papers from backend (ChromaDB) */
  async loadResearchHistory(): Promise<void> {
    const uid = await this.authService.getUidOnce();
    if (!uid) {
      this.isLoading = false;
      return;
    }

    this.paperService.loadPapers(uid).subscribe({
      next: () => {
        this.papers = this.paperService.getPapers().map((p) => ({
          ...p,
          selected: false,
          source: p.insights?.citations?.[0] || 'arXiv',
          dateAdded: new Date().toISOString().split('T')[0],
        }));
        this.filteredPapers = [...this.papers];
        this.totalEntries = this.papers.length;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error loading research history:', err);
        this.isLoading = false;
        this.hasError = true;
      },
    });
  }

  /** Search handler */
  onSearchChange(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredPapers = this.papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors.join(', ').toLowerCase()
    );
    this.totalEntries = this.filteredPapers.length;
    this.currentPage = 1;
  }

  /** Select/Deselect all papers */
  toggleSelectAll(): void {
  this.selectAll = !this.selectAll;
  this.filteredPapers.forEach((p) => (p.isSelected = this.selectAll));
}

toggleItemSelection(id: string): void {
  const item = this.filteredPapers.find((p) => p.id === id);
  if (item) item.isSelected = !item.isSelected;
  this.selectAll = this.filteredPapers.every((p) => p.isSelected);
}


  /** View paper → navigate to AnalyzeComponent */
  viewPaper(id: string): void {
    this.router.navigate(['/analyze', id]);
  }

  /** Download PDF */
  downloadPDF(id: string): void {
    const paper = this.papers.find((p) => p.id === id);
    if (paper && paper.pdf_url && paper.pdf_url !== 'N/A') {
      window.open(paper.pdf_url, '_blank');
    } else {
      alert('No PDF available for this paper.');
    }
  }

  /** Delete paper (frontend only for now) */
  deleteItem(id: string): void {
    this.filteredPapers = this.filteredPapers.filter((p) => p.id !== id);
    this.papers = this.papers.filter((p) => p.id !== id);
    this.totalEntries = this.filteredPapers.length;
  }

  /** UI Controls (Filter/Sort) */
  openFilterMenu(): void {
    alert('🔍 Filter options coming soon.');
  }

  openSortMenu(): void {
    alert('↕️ Sort options coming soon.');
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  addNewPaper(): void {
    this.router.navigate(['/fetch']);
  }

  /** Pagination helpers */
  get paginatedItems(): Paper[] {
    const start = (this.currentPage - 1) * this.entriesPerPage;
    return this.filteredPapers.slice(start, start + this.entriesPerPage);
  }

  get paginationStart(): number {
    return (this.currentPage - 1) * this.entriesPerPage + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.entriesPerPage, this.totalEntries);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage * this.entriesPerPage < this.totalEntries)
      this.currentPage++;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= Math.ceil(this.totalEntries / this.entriesPerPage)) {
      this.currentPage = page;
    }
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalEntries / this.entriesPerPage));
  }

}
