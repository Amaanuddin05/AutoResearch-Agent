import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SearchResult {
  id: string;
  title: string;
  authors: string;
  year: string;
  abstract: string;
  matchPercentage: number;
  isSelected: boolean;
}

interface PaperDetail {
  title: string;
  authors: string;
  institution: string;
  abstract: string;
  keywords: string[];
}

@Component({
  selector: 'app-library',
  imports: [CommonModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss'
})
export class LibraryComponent {
  searchQuery: string = '';
  selectedSort: string = 'Relevance';
  
  activeFilters: string[] = ['Machine Learning', 'Neuroscience'];
  
  sortOptions: string[] = [
    'Relevance',
    'Date Added',
    'Citation Count',
    'Title A-Z'
  ];

  searchResults: SearchResult[] = [
    {
      id: '1',
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, Noam Shazeer, et al.',
      year: '2017',
      abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism...',
      matchPercentage: 92,
      isSelected: true
    },
    {
      id: '2',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      authors: 'Jacob Devlin, Ming-Wei Chang, et al.',
      year: '2018',
      abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations...',
      matchPercentage: 88,
      isSelected: false
    },
    {
      id: '3',
      title: 'Generative Adversarial Networks',
      authors: 'Ian J. Goodfellow, Jean Pouget-Abadie, et al.',
      year: '2014',
      abstract: 'We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability...',
      matchPercentage: 81,
      isSelected: false
    }
  ];

  selectedPaperDetail: PaperDetail = {
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin',
    institution: 'Google Brain, Google Research, University of Toronto',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU.',
    keywords: ['Transformer', 'Attention Mechanism', 'NLP']
  };

  searchPapers(): void {
    console.log('Searching for:', this.searchQuery);
  }

  selectResult(resultId: string): void {
    this.searchResults.forEach(result => {
      result.isSelected = result.id === resultId;
    });
    
    const selectedResult = this.searchResults.find(r => r.id === resultId);
    if (selectedResult) {
      // Update detail panel with selected paper
      console.log('Selected paper:', selectedResult.title);
    }
  }

  removeFilter(filter: string): void {
    this.activeFilters = this.activeFilters.filter(f => f !== filter);
  }

  addFilter(): void {
    console.log('Add new filter');
  }

  viewPDF(): void {
    console.log('Opening PDF...');
  }

  copyCitation(): void {
    console.log('Copying citation...');
  }

  addToCollection(): void {
    console.log('Adding to collection...');
  }

  getMatchColor(percentage: number): string {
    if (percentage >= 90) return 'match-high';
    if (percentage >= 80) return 'match-medium';
    return 'match-low';
  }
}
