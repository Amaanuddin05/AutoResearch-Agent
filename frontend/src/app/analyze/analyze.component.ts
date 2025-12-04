import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaperService, Paper } from '../services/paper.service';
import { AuthService } from '../services/auth.service';
import { RouterModule } from '@angular/router';
import { AnalyzeService, EnrichedPaperData, EnrichedChunk } from '../services/analyze.service';

interface Section {
  id: string;
  title: string;
  emoji: string;
  content: string;
  items?: string[];
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
  authors: string[];
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
  enrichedData: EnrichedPaperData | null = null;
  isLoading = true;
  isSaved = false;
  hasError = false;
  hasEnrichedData = false;
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
    private router: Router,
    private paperService: PaperService,
    private authService: AuthService,
    private analyzeService: AnalyzeService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.hasError = true;
      return;
    }

    const uid = await this.authService.getUidOnce();
    if (!uid) {
      return;
    }

    // Try to fetch enriched data first
    try {
      this.analyzeService.getEnrichedPaper(uid, id).subscribe({
        next: (enrichedData) => {
          this.enrichedData = enrichedData;
          this.hasEnrichedData = true;
          this.loadEnrichedPaper(enrichedData);
          this.isLoading = false;
        },
        error: async (error) => {
          console.warn('⚠️ Enriched data not found, falling back to basic paper data:', error);
          // Fallback to basic paper data
          await this.loadBasicPaper(uid, id);
        }
      });
    } catch (error) {
      console.warn('⚠️ Error fetching enriched data, falling back to basic paper data:', error);
      await this.loadBasicPaper(uid, id);
    }
  }

  async loadBasicPaper(uid: string, id: string): Promise<void> {
    this.paper = (await this.paperService.getPaperById(uid, id)) ?? null;
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

  loadEnrichedPaper(enrichedData: EnrichedPaperData): void {
    // Convert enriched paper data to Paper format
    const paperData = enrichedData.paper;
    this.paper = {
      id: paperData.id,
      title: paperData.title,
      authors: Array.isArray(paperData.authors) 
        ? paperData.authors 
        : (typeof paperData.authors === 'string' ? paperData.authors.split(',').map(a => a.trim()) : []),
      summary: paperData.summary,
      published: paperData.published,
      pdf_url: paperData.pdf_url,
      insights: paperData.insights,
      source: paperData.metadata?.source || 'Research Paper'
    };

    this.isSaved = true;
    this.initializeEnrichedSections(enrichedData);
    this.initializeEnrichedInsights(enrichedData);
    this.fetchRelatedPapers();
  }

  initializeSections(): void {
    if (!this.paper) return;

    const structured = this.paper.insights || {};
    const summary = this.paper.summary || 'No summary available.';

    this.sections = [
      {
        id: 'abstract',
        title: 'Abstract',
        emoji: '📄',
        content: summary,
        isOpen: true,
      },
      {
        id: 'objectives',
        title: 'Research Objectives',
        emoji: '🎯',
        content: structured.objectives?.join(', ') || 'No objectives found.',
        isOpen: false,
      },
      {
        id: 'methodology',
        title: 'Methodology',
        emoji: '🔬',
        content: structured.methods?.join(', ') || 'No methodology described.',
        isOpen: false,
      },
      {
        id: 'findings',
        title: 'Key Findings',
        emoji: '🔑',
        content: structured.findings?.join(', ') || 'No findings available.',
        isOpen: false,
      },
      {
        id: 'limitations',
        title: 'Limitations',
        emoji: '⚠️',
        content: structured.limitations || 'No limitations mentioned.',
        isOpen: false,
      },
      {
        id: 'takeaways',
        title: 'Key Takeaways',
        emoji: '📌',
        content: structured.implications?.join(', ') || 'No key takeaways.',
        isOpen: false,
      },
    ];
  }

  initializeEnrichedSections(enrichedData: EnrichedPaperData): void {
    const chunks = enrichedData.enriched_chunks;
    this.sections = [];

    // Paper Details
    const paperInfo = [
      `**Title:** ${enrichedData.paper.title}`,
      `**Authors:** ${enrichedData.paper.authors}`,
      `**Published:** ${enrichedData.paper.published}`,
      `**PDF:** ${enrichedData.paper.pdf_url !== 'N/A' ? 'Available' : 'Not Available'}`
    ].join('\n');

    this.sections.push({
      id: 'paper-details',
      title: 'Paper Details',
      emoji: '📘',
      content: paperInfo,
      isOpen: true
    });

    // Summary / Insights
    if (enrichedData.paper.insights && Object.keys(enrichedData.paper.insights).length > 0) {
      const insights = enrichedData.paper.insights;
      const insightItems = [];
      if (insights.findings?.length) insightItems.push(`**Findings:** ${insights.findings.join('; ')}`);
      if (insights.methods?.length) insightItems.push(`**Methods:** ${insights.methods.join('; ')}`);
      if (insights.datasets?.length) insightItems.push(`**Datasets:** ${insights.datasets.join('; ')}`);
      if (insights.implications?.length) insightItems.push(`**Implications:** ${insights.implications.join('; ')}`);
      if (insights.citations?.length) insightItems.push(`**Citations:** ${insights.citations.join('; ')}`);

      if (insightItems.length > 0) {
        this.sections.push({
          id: 'summary-insights',
          title: 'Summary / Insights',
          emoji: '🧠',
          content: insightItems.join('\n\n'),
          isOpen: true
        });
      }
    }

    // Rewritten Abstract / Paragraphs
    if (chunks.paragraph_rewrite?.length > 0) {
      this.sections.push({
        id: 'rewritten-paragraphs',
        title: 'Rewritten Abstract / Paragraphs',
        emoji: '✍️',
        content: '',
        items: chunks.paragraph_rewrite.map(c => c.content),
        isOpen: false
      });
    }

    // Key Findings
    if (chunks.finding?.length > 0) {
      this.sections.push({
        id: 'key-findings',
        title: 'Key Findings',
        emoji: '🔑',
        content: '',
        items: chunks.finding.map(c => c.content),
        isOpen: false
      });
    }

    // Methods Used
    if (chunks.method?.length > 0) {
      this.sections.push({
        id: 'methods',
        title: 'Methods Used',
        emoji: '🔬',
        content: '',
        items: chunks.method.map(c => c.content),
        isOpen: false
      });
    }

    // Datasets
    if (chunks.dataset?.length > 0) {
      this.sections.push({
        id: 'datasets',
        title: 'Datasets',
        emoji: '📊',
        content: '',
        items: chunks.dataset.map(c => c.content),
        isOpen: false
      });
    }

    // Key Concepts
    if (chunks.concept?.length > 0) {
      this.sections.push({
        id: 'concepts',
        title: 'Key Concepts',
        emoji: '💡',
        content: '',
        items: chunks.concept.map(c => c.content),
        isOpen: false
      });
    }

    // Implications
    if (chunks.implication?.length > 0) {
      this.sections.push({
        id: 'implications',
        title: 'Implications',
        emoji: '📌',
        content: '',
        items: chunks.implication.map(c => c.content),
        isOpen: false
      });
    }
  }

  initializeEnrichedInsights(enrichedData: EnrichedPaperData): void {
    const chunks = enrichedData.enriched_chunks;
    this.insights = [];

    if (chunks.finding?.length > 0) {
      this.insights.push({
        icon: 'emoji_objects',
        title: 'Findings',
        content: `${chunks.finding.length} key findings identified`
      });
    }

    if (chunks.method?.length > 0) {
      this.insights.push({
        icon: 'construction',
        title: 'Methods',
        content: `${chunks.method.length} methods documented`
      });
    }

    if (chunks.dataset?.length > 0) {
      this.insights.push({
        icon: 'dataset',
        title: 'Datasets',
        content: `${chunks.dataset.length} datasets referenced`
      });
    }

    if (chunks.implication?.length > 0) {
      this.insights.push({
        icon: 'trending_up',
        title: 'Implications',
        content: `${chunks.implication.length} implications extracted`
      });
    }
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

  async toggleSave(): Promise<void> {
    this.isSaved = !this.isSaved;
    const uid = await this.authService.getUidOnce();
    if (this.isSaved && this.paper) {
      await this.paperService.addToLibrary(uid, this.paper);
    } else if (this.paper) {
      await this.paperService.removeFromLibrary(uid, this.paper.id);
    }
  }

  chatWithPaper(): void {
    if (this.paper) {
      this.router.navigate(['/chat'], { queryParams: { paperId: this.paper.id } });
    }
  }

  viewRelatedPaper(paperId: string): void {
    console.log('Viewing related paper:', paperId);
  }
}
