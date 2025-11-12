import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Paper {
  id: string;
  title: string;
  authors: string;
  year: string;
  description: string;
  isFavorite: boolean;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  savedPapers: Paper[] = [
    {
      id: '1',
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar...',
      year: '2017',
      description: 'The foundational paper introducing the Transformer architecture, a novel network architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely...',
      isFavorite: false
    },
    {
      id: '2',
      title: 'Generative Adversarial Networks',
      authors: 'Ian J. Goodfellow, Jean Pouget-Abadie...',
      year: '2014',
      description: 'A seminal paper on a class of machine learning frameworks where two neural networks contest with each other in a game. It has been a key driver for recent advances in generative models...',
      isFavorite: false
    },
    {
      id: '3',
      title: 'Deep Residual Learning for Image Recognition',
      authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren...',
      year: '2015',
      description: 'Introduced the concept of residual networks (ResNets), which ease the training of networks that are substantially deeper than those used previously, leading to significant improvements in image recognition...',
      isFavorite: false
    }
  ];

  searchPapers(): void {
    console.log('Search papers clicked');
    // Add navigation or search logic here
  }

  viewSummary(paperId: string): void {
    console.log('View summary for paper:', paperId);
    // Add navigation to summary view
  }

  toggleFavorite(paperId: string): void {
    const paper = this.savedPapers.find(p => p.id === paperId);
    if (paper) {
      paper.isFavorite = !paper.isFavorite;
    }
  }

  deletePaper(paperId: string): void {
    this.savedPapers = this.savedPapers.filter(p => p.id !== paperId);
    console.log('Deleted paper:', paperId);
  }

  findPaper(): void {
    console.log('Find paper clicked');
    // Add navigation or search logic here
  }
}
