import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FetchService } from '../services/fetch.service';
import { PaperService } from '../services/paper.service';

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
  isLoading = false;
  hasError = false;
  showEmptyState = true;

  query: string = '';
  filter: string = 'all';

  isAnalyzing = false;
  progress = 0;
  progressInterval: any;

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  allPapers: Paper[] = [];
  papers: Paper[] = [];

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

  loadingPapers: number[] = Array(10).fill(null);

  constructor(
    private fetchService: FetchService,
    private router: Router,
    private paperService: PaperService
  ) {}

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  fetchPapers(): void {
    this.isLoading = true;
    this.hasError = false;
    this.showEmptyState = false;
    this.allPapers = [];
    this.papers = [];
    this.currentPage = 1;

    const categoryCode = this.getArxivCategoryCode(this.selectedCategory);

    const searchQuery = this.searchMode === 'search' ? this.query.trim() : '';

    const payload: any = {
      query: searchQuery || null,
      category: searchQuery.length > 0 ? null : categoryCode,
      filter: this.filter,
      max_results: 100
    };

    this.fetchService.fetchPapers(payload).subscribe({
      next: (res) => {
        this.isLoading = false;

        this.allPapers = (res.papers || []).map((p: any) => ({
          id: p.id,
          arxiv_id: p.arxiv_id,
          doi: p.doi,
          title: p.title,
          authors: p.authors,
          summary: p.summary,
          published: p.published,
          updated: p.updated,
          pdf_url: p.pdf_url,
          citationCount: p.citationCount
        }));

        this.updatePagination();
        this.updateDisplayedPapers();
        this.showEmptyState = this.allPapers.length === 0;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.allPapers.length / this.itemsPerPage);
  }

  updateDisplayedPapers(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.papers = this.allPapers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updateDisplayedPapers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 7;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (this.currentPage > 3) {
        pages.push(-1);
      }

      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (this.currentPage < this.totalPages - 2) {
        pages.push(-1);
      }

      pages.push(this.totalPages);
    }

    return pages;
  }

  getArxivCategoryCode(category: string): string {
    const map: Record<string, string> = {
      'Artificial Intelligence': 'cs.AI','Machine Learning': 'cs.LG','Deep Learning': 'cs.LG',
      'Computer Vision': 'cs.CV','Natural Language Processing': 'cs.CL','Computational Linguistics': 'cs.CL',
      'Robotics': 'cs.RO','Data Science': 'cs.LG','Cybersecurity': 'cs.CR','Human-Computer Interaction': 'cs.HC',
      'Quantum Computing': 'quant-ph','Theoretical Physics': 'hep-th','Astrophysics': 'astro-ph',
      'Applied Mathematics': 'math.AP','Statistical Modeling': 'stat.ML','Biochemistry': 'q-bio.BM',
      'Bioinformatics': 'q-bio.QM','Genomics': 'q-bio.GN','Neuroscience': 'q-bio.NC','Pharmacology': 'q-bio.TO',
      'Molecular Biology': 'q-bio.MN','Electrical Engineering': 'eess.SP','Mechanical Engineering': 'physics.class-ph',
      'Civil Engineering': 'physics.soc-ph','Aerospace Engineering': 'astro-ph.IM','Materials Science': 'cond-mat.mtrl-sci',
      'Cognitive Science': 'q-bio.NC','Behavioral Science': 'q-bio.NC','Environmental Science': 'physics.ao-ph',
      'Econometrics': 'econ.EM','Sustainability Research': 'physics.geo-ph'
    };

    return map[category] || 'cs.AI';
  }

  analyzeAndSave(paper: Paper): void {
  if (!paper || !paper.pdf_url) {
    alert("This paper has no PDF URL.");
    return;
  }

  this.isAnalyzing = true;
  this.progress = 0;

  this.progressInterval = setInterval(() => {
    if (this.progress < 95) this.progress += 5;
  }, 2000);

  const payload = {
    pdf_url: paper.pdf_url,
    metadata: {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      published: paper.published,
      pdf_url: paper.pdf_url
    }
  };

  this.fetchService.fetchAndSummarize(payload).subscribe({
      next: (res: any) => {
        this.progress = 100;
        clearInterval(this.progressInterval);

        // Check for nested structure from /analyze_paper
        // res.summary contains { summary: {...}, insights: {...} }
        const data = res.summary || {};
        const summaryObj = data.summary || {};
        const insightsObj = data.insights || {};
        const meta = summaryObj.meta;

        // Save to Library if metadata exists
        if (meta) {
           // Merge summary and insights for the frontend
           const mergedInsights = { ...summaryObj, ...insightsObj };

           // Map to PaperService Paper interface
           const newPaper: any = {
             id: meta.doc_id || meta.id,
             title: meta.title,
             authors: Array.isArray(meta.authors) ? meta.authors : [meta.authors],
             summary: summaryObj.abstract || summaryObj.raw_summary || '',
             published: meta.published,
             pdf_url: meta.pdf_url,
             insights: mergedInsights, // Store merged data
             dateAdded: new Date().toISOString(),
             source: 'Arxiv'
           };
           this.paperService.addToLibrary(newPaper);
        }

        setTimeout(() => {
          this.isAnalyzing = false;
          this.router.navigate(['/library']);
        }, 500);
      },
    error: () => {
      clearInterval(this.progressInterval);
      this.isAnalyzing = false;
      alert("Failed to analyze this paper.");
    }
  });
}


  openPDF(paperId: string): void {
    const paper = this.allPapers.find(
      (p) => p.id === paperId || p.title === paperId
    );

    if (!paper) return;

    const candidates: string[] = [];
    if (paper.pdf_url) candidates.push(paper.pdf_url);
    if (paper.arxiv_id) {
      const id = paper.arxiv_id.toString();
      candidates.push(
        `https://arxiv.org/pdf/${id}.pdf`,
        `https://arxiv.org/abs/${id}`
      );
    }

    const valid = candidates.find((u) => u.startsWith('http'));
    if (valid) {
      window.open(valid, '_blank');
      return;
    }

    alert('No PDF available.');
  }

  retryFetch(): void {
    this.hasError = false;
    this.fetchPapers();
  }
}
