import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Paper {
  id: string;
  title: string;
  authors: string;
  publishedDate: string;
  summary: string;
}

@Component({
  selector: 'app-fetch',
  imports: [CommonModule, FormsModule],
  templateUrl: './fetch.component.html',
  styleUrl: './fetch.component.scss'
})
export class FetchComponent {
  selectedCategory: string = 'Machine Learning';
  numberOfResults: number = 50;
  isLoading: boolean = false;
  hasError: boolean = false;
  showEmptyState: boolean = true;
  
  categories: string[] = [
    'Machine Learning',
    'Biochemistry',
    'Computational Linguistics',
    'Artificial Intelligence',
    'Quantum Computing',
    'Neuroscience'
  ];

  papers: Paper[] = [
    {
      id: '1',
      title: 'The Impact of Neural Networks on Computational Linguistics',
      authors: 'Jane Doe, John Smith, et al.',
      publishedDate: 'Oct 2023',
      summary: 'A brief, two-to-three-line summary of the paper\'s core findings and its overall contribution to the field of natural language processing.'
    },
    {
      id: '2',
      title: 'Advancements in Protein Folding using AlphaFold',
      authors: 'Alice Johnson, Robert Brown',
      publishedDate: 'Sep 2023',
      summary: 'This paper explores recent breakthroughs in predicting protein structures with high accuracy, detailing the methodological improvements and implications for drug discovery.'
    }
  ];

  loadingPapers: number[] = [1, 2, 3];

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.numberOfResults = parseInt(target.value);
  }

  fetchPapers(): void {
    this.isLoading = true;
    this.hasError = false;
    this.showEmptyState = false;

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      // Simulate success/error
      // this.hasError = true; // Uncomment to test error state
    }, 2000);
  }

  analyzeAndSave(paperId: string): void {
    console.log('Analyzing and saving paper:', paperId);
  }

  openPDF(paperId: string): void {
    console.log('Opening PDF for paper:', paperId);
  }

  retryFetch(): void {
    this.hasError = false;
    this.fetchPapers();
  }

  get sliderPercentage(): number {
    return (this.numberOfResults / 100) * 100;
  }
}
