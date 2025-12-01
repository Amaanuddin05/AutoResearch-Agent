export interface Paper {
  id: string;
  title: string;
  authors: string[];       
  summary: string | null;
  published: string | null; 
  pdf_url: string | null;
  citationCount?: number;
  insights?: any;
  isFavorite?: boolean;
  isSelected?: boolean;
  dateAdded?: string;
  source?: string;
}
