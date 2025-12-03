import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FetchService } from '../services/fetch.service';
import { PaperService } from '../services/paper.service';
import { AuthService } from '../services/auth.service';

interface Paper {
  id: string | null;
  arxiv_id: string | null;
  doi: string | null;
  title: string;
  authors: string[];
  published: string | null;
  updated: string | null;
  summary: string | null;
  pdf_url: string | null;
  citationCount?: number;
}

@Component({
  selector: 'app-fetch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fetch.component.html',
  styleUrls: ['./fetch.component.scss'],
})
export class FetchComponent {
  searchMode: 'category' | 'search' = 'category';
  selectedCategory: string = 'Machine Learning';

  query = '';
  filter = 'all';

  isLoading = false;
  hasError = false;
  showEmptyState = true;

  loadingPapers: number[] = Array(10).fill(null);
  isAnalyzing = false;
  progress = 0;

  allPapers: Paper[] = [];
  papers: Paper[] = [];

  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  categories: string[] = [
    'Artificial Intelligence','Machine Learning','Deep Learning','Computer Vision',
    'Natural Language Processing','Computational Linguistics','Robotics','Data Science',
    'Cybersecurity','Human-Computer Interaction','Quantum Computing','Theoretical Physics',
    'Astrophysics','Applied Mathematics','Statistical Modeling','Biochemistry',
    'Bioinformatics','Genomics','Neuroscience','Pharmacology','Molecular Biology',
    'Electrical Engineering','Mechanical Engineering','Civil Engineering',
    'Aerospace Engineering','Materials Science','Cognitive Science','Behavioral Science',
    'Environmental Science','Econometrics','Sustainability Research'
  ];

  constructor(
    private fetchService: FetchService,
    private router: Router,
    private paperService: PaperService,
    private authService: AuthService
  ) {}

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length <= maxLength ? text : text.substring(0, maxLength).trim() + '...';
  }

  // ⭐ MAIN FETCH FUNCTION (RESTORED TO ORIGINAL NODE BACKEND LOGIC)
  async fetchPapers(): Promise<void> {
    const uid = await this.authService.getUidOnce();
    if (!uid) return;

    this.isLoading = true;
    this.hasError = false;
    this.showEmptyState = false;
    this.allPapers = [];
    this.papers = [];
    this.currentPage = 1;

    const categoryCode = this.getArxivCategoryCode(this.selectedCategory);
    const searchQuery = this.searchMode === 'search' ? this.query.trim() : null;

    const payload = {
      uid,
      query: searchQuery || null,
      category: searchQuery ? null : categoryCode,
      filter: this.filter,
      max_results: 100,
    };

    this.fetchService.fetchPapers(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        const incoming = res.papers || [];
        this.allPapers = incoming.map((p: any) => ({
          id: p.id || p.arxiv_id || null,
          arxiv_id: p.arxiv_id || null,
          doi: p.doi || null,
          title: p.title || 'Untitled',
          authors:
            Array.isArray(p.authors)
              ? p.authors
              : typeof p.authors === 'string'
              ? p.authors.split(',').map((a: string) => a.trim())
              : [],
          summary: p.summary ?? null,
          published: p.published ?? p.publishedDate ?? null,
          updated: p.updated ?? null,
          pdf_url: p.pdf_url || null,
          citationCount: p.citationCount ?? null,
        }));

        this.updatePagination();
        this.updateDisplayedPapers();
        this.showEmptyState = this.allPapers.length === 0;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      },
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.allPapers.length / this.itemsPerPage);
  }

  updateDisplayedPapers(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.papers = this.allPapers.slice(start, start + this.itemsPerPage);
  }

  // ⭐ NEEDED FOR TEMPLATE
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 7;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.currentPage > 3) pages.push(-1);

      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (this.currentPage < this.totalPages - 2) pages.push(-1);

      pages.push(this.totalPages);
    }

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedPapers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getArxivCategoryCode(category: string): string {
    const map: Record<string, string> = {
      'Artificial Intelligence': 'cs.AI',
      'Machine Learning': 'cs.LG',
      'Deep Learning': 'cs.LG',
      'Computer Vision': 'cs.CV',
      'Natural Language Processing': 'cs.CL',
      'Computational Linguistics': 'cs.CL',
      'Robotics': 'cs.RO',
      'Data Science': 'cs.LG',
      'Cybersecurity': 'cs.CR',
      'Human-Computer Interaction': 'cs.HC',
      'Quantum Computing': 'quant-ph',
      'Theoretical Physics': 'hep-th',
      'Astrophysics': 'astro-ph',
      'Applied Mathematics': 'math.AP',
      'Statistical Modeling': 'stat.ML',
      'Biochemistry': 'q-bio.BM',
      'Bioinformatics': 'q-bio.QM',
      'Genomics': 'q-bio.GN',
      'Neuroscience': 'q-bio.NC',
      'Pharmacology': 'q-bio.TO',
      'Molecular Biology': 'q-bio.MN',
      'Electrical Engineering': 'eess.SP',
      'Mechanical Engineering': 'physics.class-ph',
      'Civil Engineering': 'physics.soc-ph',
      'Aerospace Engineering': 'astro-ph.IM',
      'Materials Science': 'cond-mat.mtrl-sci',
      'Cognitive Science': 'q-bio.NC',
      'Behavioral Science': 'q-bio.NC',
      'Environmental Science': 'physics.ao-ph',
      'Econometrics': 'econ.EM',
      'Sustainability Research': 'physics.geo-ph',
    };
    return map[category] || 'cs.AI';
  }

  // ⭐ ANALYSIS WORKFLOW
  async analyzeAndSave(paper: Paper): Promise<void> {
    if (!paper || !paper.pdf_url) {
      alert('This paper has no PDF URL.');
      return;
    }

    this.isAnalyzing = true;
    this.progress = 0;

    const uid = await this.authService.getUidOnce();

    const payload = {
      uid,
      pdf_url: paper.pdf_url,
      metadata: {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        published: paper.published,
        pdf_url: paper.pdf_url,
      },
    };

    this.fetchService.fetchAndSummarize(payload).subscribe({
      next: (res: any) => {
        if (res.job_id) {
          this.pollProgress(uid, res.job_id);
        } else {
          this.handleAnalysisComplete(res);
        }
      },
      error: () => {
        this.isAnalyzing = false;
        alert('Failed to start analysis.');
      },
    });
  }

  pollProgress(uid: string, jobId: string): void {
    const interval = setInterval(() => {
      this.fetchService.getAnalysisStatus(uid, jobId).subscribe({
        next: (status: any) => {
          if (status.status === 'processing') {
            this.progress = status.progress || this.progress;
          } else if (status.status === 'completed') {
            clearInterval(interval);
            this.progress = 100;
            this.handleAnalysisComplete(status.result);
          } else if (status.status === 'failed') {
            clearInterval(interval);
            this.isAnalyzing = false;
            alert(`Analysis failed: ${status.error}`);
          }
        },
        error: () => {
          clearInterval(interval);
          this.isAnalyzing = false;
          alert('Lost connection to analysis service.');
        },
      });
    }, 1000);
  }

  async handleAnalysisComplete(data: any): Promise<void> {
    const summaryObj = data.summary || {};
    const insightsObj = data.insights || {};
    const meta = summaryObj.meta;

    if (meta) {
      const mergedInsights = { ...summaryObj, ...insightsObj };

      const newPaper: any = {
        id: meta.doc_id || meta.id,
        title: meta.title,
        authors: Array.isArray(meta.authors)
          ? meta.authors
          : [meta.authors],
        summary: summaryObj.abstract || summaryObj.raw_summary || '',
        published: meta.published,
        pdf_url: meta.pdf_url,
        insights: mergedInsights,
        dateAdded: new Date().toISOString(),
        source: 'Arxiv',
      };

      const uid = await this.authService.getUidOnce();
      await this.paperService.addToLibrary(uid, newPaper);
    }

    setTimeout(() => {
      this.isAnalyzing = false;
      this.router.navigate(['/library']);
    }, 500);
  }

  openPDF(paperId: string): void {
    const paper = this.allPapers.find((p) => p.id === paperId || p.title === paperId);
    if (!paper) return;

    const urls = [];
    if (paper.pdf_url) urls.push(paper.pdf_url);
    if (paper.arxiv_id) {
      urls.push(`https://arxiv.org/pdf/${paper.arxiv_id}.pdf`);
      urls.push(`https://arxiv.org/abs/${paper.arxiv_id}`);
    }

    const valid = urls.find((u) => u.startsWith('http'));
    if (valid) window.open(valid, '_blank');
    else alert('No PDF available.');
  }

  retryFetch(): void {
    this.hasError = false;
    this.fetchPapers();
  }
}
