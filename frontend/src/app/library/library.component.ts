import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Paper, PaperService } from '../services/paper.service';
import { AuthService } from '../services/auth.service';
import { FetchService } from '../services/fetch.service';

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

  // Upload features properties
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

  // Upload Features Methods
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
        dateAdded: new Date().toISOString(),
        source: 'Upload',
      };

      const uid = await this.authService.getUidOnce();
      await this.paperService.addToLibrary(uid, newPaper);

      // Force-refresh library lists
      this.savedPapers = this.paperService.getPapers();
      this.filteredPapers = [...this.savedPapers];

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
