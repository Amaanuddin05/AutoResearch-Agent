import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaperService, Paper } from '../services/paper.service';
import { AuthService } from '../services/auth.service';
import { FetchService } from '../services/fetch.service';

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

  // ========== UPLOAD PROPERTIES ==========
  showUploadModal = false;
  selectedFile: File | null = null;
  isDragActive = false;
  isUploading = false;
  uploadProgress = 0;
  uploadProgressMessage = 'Starting upload...';

  constructor(
    private paperService: PaperService,
    private router: Router,
    private authService: AuthService,
    private fetchService: FetchService
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
    this.openUploadModal();
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

  // ========== UPLOAD METHODS ==========
  openUploadModal(): void {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.isDragActive = false;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadProgressMessage = 'Starting upload...';
  }

  closeUploadModal(): void {
    if (this.isUploading) return; // Prevent closing while processing
    this.showUploadModal = false;
    this.selectedFile = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else if (file) {
      alert('Please select a valid PDF file.');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else if (file) {
      alert('Please drop a valid PDF file.');
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async triggerUpload(): Promise<void> {
    if (!this.selectedFile) return;

    const uid = await this.authService.getUidOnce();
    if (!uid) {
      alert('Please log in to upload papers.');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadProgressMessage = 'Uploading PDF...';

    this.fetchService.uploadPdf(this.selectedFile, uid).subscribe({
      next: (res: any) => {
        if (res.job_id) {
          this.pollUploadProgress(uid, res.job_id);
        } else {
          this.handleUploadComplete(res);
        }
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Upload error:', err);
        alert(err.error?.error || 'Failed to upload and analyze PDF.');
      }
    });
  }

  pollUploadProgress(uid: string, jobId: string): void {
    const interval = setInterval(() => {
      this.fetchService.getAnalysisStatus(uid, jobId).subscribe({
        next: (status: any) => {
          if (status.status === 'processing') {
            if (status.totalChunks && status.totalChunks > 0 && status.processedChunks < status.totalChunks) {
              const processed = status.processedChunks ?? 0;
              if (processed > 0) {
                // Map the chunk summarization phase to 10% -> 80% of the bar
                this.uploadProgress = 10 + Math.round((processed / status.totalChunks) * 70);
              } else {
                this.uploadProgress = status.progress ?? this.uploadProgress;
              }
            } else {
              this.uploadProgress = status.progress ?? this.uploadProgress;
            }
            this.uploadProgressMessage = status.message || this.uploadProgressMessage;
          } else if (status.status === 'completed') {
            clearInterval(interval);
            this.uploadProgress = 100;
            this.uploadProgressMessage = 'Done!';
            this.handleUploadComplete(status.result);
          } else if (status.status === 'failed') {
            clearInterval(interval);
            this.isUploading = false;
            alert(`Analysis failed: ${status.error}`);
          }
        },
        error: () => {
          clearInterval(interval);
          this.isUploading = false;
          alert('Lost connection to analysis service.');
        }
      });
    }, 1000);
  }

  async handleUploadComplete(data: any): Promise<void> {
    const summaryObj = data?.summary || {};
    const insightsObj = data?.insights || {};
    const meta = summaryObj.meta;

    let navigateTo = '';

    if (meta) {
      const mergedInsights = { ...summaryObj, ...insightsObj };
      const paperId = meta.doc_id || meta.id;

      const newPaper: any = {
        id: paperId,
        title: meta.title,
        authors: Array.isArray(meta.authors) ? meta.authors : [meta.authors],
        summary: summaryObj.abstract || summaryObj.raw_summary || '',
        published: meta.published,
        pdf_url: meta.pdf_url,
        insights: mergedInsights,
        dateAdded: new Date().toISOString().split('T')[0],
        source: 'Upload',
      };

      const uid = await this.authService.getUidOnce();
      await this.paperService.addToLibrary(uid, newPaper);

      // Force refresh the library lists
      await this.loadResearchHistory();

      if (paperId) navigateTo = `/analyze/${paperId}`;
    }

    setTimeout(() => {
      this.isUploading = false;
      this.showUploadModal = false;
      this.selectedFile = null;
      if (navigateTo) {
        this.router.navigate([navigateTo]);
      }
    }, 500);
  }

}
