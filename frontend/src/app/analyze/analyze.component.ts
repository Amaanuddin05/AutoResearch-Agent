import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  authors: string;
}

@Component({
  selector: 'app-analyze',
  imports: [CommonModule],
  templateUrl: './analyze.component.html',
  styleUrl: './analyze.component.scss'
})
export class AnalyzeComponent {
  breadcrumbs = [
    { label: 'My Library', link: '/library' },
    { label: 'Quantum Computing', link: '/library/quantum' },
    { label: 'A Neural Algorithm of Artistic Style', link: null }
  ];

  paperInfo = {
    title: 'A Neural Algorithm of Artistic Style',
    authors: 'Leon A. Gatys, Alexander S. Ecker, Matthias Bethge',
    publication: 'Published in Journal of Vision, 2015'
  };

  sections: Section[] = [
    {
      id: 'abstract',
      title: 'Abstract',
      content: 'We introduce an artificial system based on a Deep Neural Network that creates artistic images of high perceptual quality. The system uses neural representations to separate and recombine content and style of arbitrary images, providing a neural algorithm for the creation of artistic images.',
      isOpen: true
    },
    {
      id: 'objectives',
      title: 'Research Objectives',
      content: 'The main goal is to develop a system capable of separating the content of an image from its artistic style, and then apply the style of one image to the content of another. This explores how deep neural networks perceive and represent visual information.',
      isOpen: false
    },
    {
      id: 'methodology',
      title: 'Methodology',
      content: 'The approach utilizes a pre-trained VGG-19 network. Content is represented by feature maps from higher layers, while style is represented by the correlations (Gram matrix) between feature maps across multiple layers. A new image is synthesized by iteratively optimizing it to match both the content representation of the content image and the style representation of the style image.',
      isOpen: false
    },
    {
      id: 'findings',
      title: 'Key Findings',
      content: 'The algorithm successfully creates high-quality artistic images that combine the content of a photograph with the style of famous artworks. It demonstrates that representations of content and style in Convolutional Neural Networks are separable.',
      isOpen: false
    },
    {
      id: 'limitations',
      title: 'Study Limitations',
      content: 'The process can be computationally expensive. The quality of the output is highly dependent on the choice of layers used for content and style representations, and finding the optimal balance requires experimentation. The method does not capture all aspects of artistic style.',
      isOpen: false
    },
    {
      id: 'takeaways',
      title: 'Key Takeaways',
      content: 'This work provides a foundational algorithm for neural style transfer and offers deep insights into how CNNs process and understand visual information, separating what an image depicts from how it is depicted.',
      isOpen: false
    }
  ];

  insights: Insight[] = [
    {
      icon: 'emoji_objects',
      title: 'Key Finding',
      content: 'Content and style can be separated and recombined using deep neural network representations.'
    },
    {
      icon: 'construction',
      title: 'Method Used',
      content: '',
      tags: ['CNN', 'VGG-19', 'Gram Matrix']
    },
    {
      icon: 'dataset',
      title: 'Datasets',
      content: 'No specific training dataset mentioned; uses a pre-trained VGG-19 model.'
    },
    {
      icon: 'trending_up',
      title: 'Potential Implications',
      content: 'Pioneered the field of neural style transfer, impacting creative AI and digital art generation.'
    }
  ];

  relatedPapers: RelatedPaper[] = [
    {
      id: '1',
      title: 'Image Style Transfer Using Convolutional Neural Networks',
      authors: 'L. A. Gatys, A. S. Ecker, M. Bethge'
    },
    {
      id: '2',
      title: 'A Learned Representation For Artistic Style',
      authors: 'V. Dumoulin, J. Shlens, M. Kudlur'
    },
    {
      id: '3',
      title: 'Perceptual Losses for Real-Time Style Transfer',
      authors: 'J. Johnson, A. Alahi, L. Fei-Fei'
    }
  ];

  isSaved: boolean = true;

  toggleSection(sectionId: string): void {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.isOpen = !section.isOpen;
    }
  }

  viewPDF(): void {
    console.log('Opening PDF...');
  }

  toggleSave(): void {
    this.isSaved = !this.isSaved;
    console.log('Saved status:', this.isSaved);
  }

  chatWithPaper(): void {
    console.log('Opening chat interface...');
  }

  viewRelatedPaper(paperId: string): void {
    console.log('Viewing related paper:', paperId);
  }
}
