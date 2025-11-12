import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FetchService } from '../services/fetch.service';

interface Paper {
  id: string;
  title: string;
  authors: string;
  publishedDate: string;
  summary: string;
  pdf_url: string;
}

@Component({
  selector: 'app-fetch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fetch.component.html',
  styleUrls: ['./fetch.component.scss'],
})
export class FetchComponent {
  selectedCategory: string = 'Machine Learning';
  numberOfResults: number = 50;
  isLoading = false;
  hasError = false;
  showEmptyState = true;

  // 🔥 NEW Loader for "Analyze & Save"
  isAnalyzing = false;
  progress = 0;
  progressInterval: any;

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

  papers: Paper[] = [];
  loadingPapers: number[] = [1, 2, 3];

  constructor(
    private fetchService: FetchService,
    private router: Router
  ) {}

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.numberOfResults = parseInt(target.value);
  }

  fetchPapers(): void {
    this.isLoading = true;
    this.hasError = false;
    this.showEmptyState = false;
    this.papers = [];

    const categoryCode = this.getArxivCategoryCode(this.selectedCategory);

    this.fetchService.fetchFromArxiv(categoryCode, this.numberOfResults).subscribe({
      next: (res) => {
        this.isLoading = false;

        this.papers = (res.papers || []).map((p: any, index: number) => ({
          id: String(index),
          title: p.title,
          authors: p.authors,
          publishedDate: p.publishedDate,
          summary: p.summary,
          pdf_url: p.pdf_url,
        }));

        this.showEmptyState = this.papers.length === 0;
      },
      error: (err) => {
        console.error('❌ Error fetching from arXiv:', err);
        this.isLoading = false;
        this.hasError = true;
      }
    });
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

  // ------------------------------------------------------------
  // 🔥 NEW Analyze + Save Progress Loader
  // ------------------------------------------------------------
  analyzeAndSave(paperId: string): void {
    const paper = this.papers.find((p) => p.id === paperId);
    if (!paper) return;

    this.isAnalyzing = true;
    this.progress = 0;

    // Smooth loading animation
    this.progressInterval = setInterval(() => {
      if (this.progress < 95) this.progress += 5;
    }, 2000);

    this.fetchService.analyzePaper(paper).subscribe({
      next: () => {
        this.progress = 100;
        clearInterval(this.progressInterval);

        setTimeout(() => {
          this.isAnalyzing = false;
          this.router.navigate(['/library']); // redirect
        }, 500);
      },
      error: (err) => {
        clearInterval(this.progressInterval);
        this.isAnalyzing = false;
        alert("❌ Failed to analyze this paper.");
        console.error(err);
      }
    });
  }

  openPDF(paperId: string): void {
    const paper = this.papers.find(
      (p) => p.id === paperId || p.title === paperId
    );

    if (!paper) return;

    const candidates: string[] = [];
    if ((paper as any).pdf_url) candidates.push((paper as any).pdf_url);
    if ((paper as any).pdfUrl) candidates.push((paper as any).pdfUrl);
    if ((paper as any).pdf) candidates.push((paper as any).pdf);
    if ((paper as any).abs_url) candidates.push((paper as any).abs_url);
    if ((paper as any).arxiv_id) {
      const id = (paper as any).arxiv_id.toString();
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


    alert('❌ No PDF available.');
  }

  retryFetch(): void {
    this.hasError = false;
    this.fetchPapers();
  }

  get sliderPercentage(): number {
    return (this.numberOfResults / 100) * 100;
  }
}
