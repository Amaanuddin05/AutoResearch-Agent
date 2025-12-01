import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaperService, Paper } from '../services/paper.service';
import { RouterModule } from '@angular/router';

interface Section {
  id: string;
  title: string;
  content: string;
  isOpen: boolean;
}

interface Insight {
  icon: string;
  title: string;
  content: string;
  tags?: string[];
}

interface RelatedPaper {
  id: string;
  title: string;
  authors: string[]; // <-- changed to array
  published: string | null;
  summary: string | null;
}

@Component({
  selector: 'app-analyze',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './analyze.component.html',
  styleUrls: ['./analyze.component.scss'],
})
export class AnalyzeComponent implements OnInit {
  paper: Paper | null = null;
  isLoading = true;
  isSaved = false;
  hasError = false;
  breadcrumbs = [
    { label: 'My Library', link: '/research-history' },
    { label: 'Analyzed Papers', link: '/analyze' },
    { label: 'Details', link: null },
  ];

  sections: Section[] = [];
  insights: Insight[] = [];
  relatedPapers: RelatedPaper[] = [];

  constructor(
    private route: ActivatedRoute,
    private paperService: PaperService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.hasError = true;
      return;
    }

    this.paper = this.paperService.getPaperById(id) ?? null;
    if (!this.paper) {
      console.warn('⚠️ Paper not found:', id);
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.isSaved = true;
    this.initializeSections();
    this.initializeInsights();
    this.fetchRelatedPapers();
    this.isLoading = false;
  }

  initializeSections(): void {
    if (!this.paper) return;

    const structured = this.paper.insights || {};
    const summary = this.paper.summary || 'No summary available.';

    this.sections = [
      {
        id: 'abstract',
        title: 'Abstract',
        content: summary,
        isOpen: true,
      },
      {
        id: 'objectives',
        title: 'Research Objectives',
        content: structured.objectives?.join(', ') || 'No objectives found.',
        isOpen: false,
      },
      {
        id: 'methodology',
        title: 'Methodology',
        content: structured.methods?.join(', ') || 'No methodology described.',
        isOpen: false,
      },
      {
        id: 'findings',
        title: 'Key Findings',
        content: structured.findings?.join(', ') || 'No findings available.',
        isOpen: false,
      },
      {
        id: 'limitations',
        title: 'Limitations',
        content: structured.limitations || 'No limitations mentioned.',
        isOpen: false,
      },
      {
        id: 'takeaways',
        title: 'Key Takeaways',
        content: structured.implications?.join(', ') || 'No key takeaways.',
        isOpen: false,
      },
    ];
  }

  initializeInsights(): void {
    if (!this.paper?.insights) return;

    const i = this.paper.insights;
    this.insights = [
      {
        icon: 'emoji_objects',
        title: 'Findings',
        content: i.findings?.join('; ') || 'No findings available.',
      },
      {
        icon: 'construction',
        title: 'Methods',
        content: i.methods?.join('; ') || 'No methods described.',
      },
      {
        icon: 'dataset',
        title: 'Datasets',
        content: i.datasets?.join('; ') || 'No datasets mentioned.',
      },
      {
        icon: 'trending_up',
        title: 'Implications',
        content: i.implications?.join('; ') || 'No implications extracted.',
      },
    ];
  }

  fetchRelatedPapers(): void {
    if (!this.paper) return;

    this.relatedPapers = [
      {
        id: '1',
        title: 'Extensions of ' + this.paper.title,
        authors: this.paper.authors,
        published: this.paper.published,
        summary: this.paper.summary,
      },
      {
        id: '2',
        title: 'Follow-up Studies on ' + this.paper.title,
        authors: this.paper.authors,
        published: this.paper.published,
        summary: this.paper.summary,
      },
    ];
  }

  toggleSection(sectionId: string): void {
    const section = this.sections.find((s) => s.id === sectionId);
    if (section) section.isOpen = !section.isOpen;
  }

  viewPDF(): void {
    if (this.paper?.pdf_url && this.paper.pdf_url !== 'N/A') {
      window.open(this.paper.pdf_url, '_blank');
    } else {
      alert('❌ No PDF available for this paper.');
    }
  }

  toggleSave(): void {
    this.isSaved = !this.isSaved;
    if (this.isSaved && this.paper) {
      this.paperService.addToLibrary(this.paper);
    } else if (this.paper) {
      this.paperService.removeFromLibrary(this.paper.id);
    }
  }

  chatWithPaper(): void {
    console.log('🧠 Chatting about paper:', this.paper?.title);
  }

  viewRelatedPaper(paperId: string): void {
    console.log('Viewing related paper:', paperId);
  }
}
