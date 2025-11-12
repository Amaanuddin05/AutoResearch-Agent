import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HistoryItem {
  id: string;
  title: string;
  authors: string;
  source: string;
  dateAdded: string;
  selected: boolean;
}

type ViewMode = 'table' | 'grid';


@Component({
  selector: 'app-research-history',
  imports: [CommonModule, FormsModule],
  templateUrl: './research-history.component.html',
  styleUrl: './research-history.component.scss'
})
export class ResearchHistoryComponent {
  historyItems: HistoryItem[] = [
    {
      id: '1',
      title: 'The Attention Mechanism in Neural Networks',
      authors: 'D. Bahdanau, K. Cho, Y. Bengio',
      source: 'ICLR 2015',
      dateAdded: '2023-10-26',
      selected: false
    },
    {
      id: '2',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'J. Devlin, M. Chang, K. Lee',
      source: 'NAACL 2019',
      dateAdded: '2023-10-25',
      selected: false
    },
    {
      id: '3',
      title: 'Generative Adversarial Networks',
      authors: 'I. Goodfellow, J. Pouget-Abadie, M. Mirza',
      source: 'NIPS 2014',
      dateAdded: '2023-10-22',
      selected: false
    },
    {
      id: '4',
      title: 'A Neural Algorithm of Artistic Style',
      authors: 'L. Gatys, A. Ecker, M. Bethge',
      source: 'arXiv 2015',
      dateAdded: '2023-10-21',
      selected: false
    }
  ];

  searchQuery = '';
  viewMode: ViewMode = 'table';
  selectAll = false;
  currentPage = 1;
  totalPages = 235;
  totalEntries = 2345;
  entriesPerPage = 10;

  get filteredItems(): HistoryItem[] {
    if (!this.searchQuery.trim()) {
      return this.historyItems;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.historyItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.authors.toLowerCase().includes(query) ||
      item.source.toLowerCase().includes(query)
    );
  }

  get paginationStart(): number {
    return (this.currentPage - 1) * this.entriesPerPage + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.entriesPerPage, this.totalEntries);
  }

  addNewPaper(): void {
    console.log('Add new paper clicked');
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.historyItems.forEach(item => item.selected = this.selectAll);
  }

  toggleItemSelection(itemId: string): void {
    const item = this.historyItems.find(h => h.id === itemId);
    if (item) {
      item.selected = !item.selected;
    }
    this.selectAll = this.historyItems.every(h => h.selected);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  viewPaper(itemId: string): void {
    console.log('View paper:', itemId);
  }

  downloadPDF(itemId: string): void {
    console.log('Download PDF:', itemId);
  }

  deleteItem(itemId: string): void {
    this.historyItems = this.historyItems.filter(h => h.id !== itemId);
    console.log('Deleted item:', itemId);
  }

  openFilterMenu(): void {
    console.log('Open filter menu');
  }

  openSortMenu(): void {
    console.log('Open sort menu');
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
