import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChatService, ChatSource } from '../services/chat.service';
import { PaperService, Paper } from '../services/paper.service';
import { HttpClientModule } from '@angular/common/http';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'thinking';
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
  showSources?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  messages: Message[] = [];
  contextPapers: Paper[] = [];
  
  userMessage = '';
  showContextSidebar = false;
  sidebarMode: 'context' | 'sources' = 'context';
  isLoading = false;
  
  // Avatars
  userAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3qwSkx34ovGPZfLiz6mWbc4_hcMMScdQT547wu_pYdYzVkY5USHyAnK5kyYBl8gXct6mjNnPCsuZVf2ZeMm2M3xzE1TSNIhQrREz8Dyo3Zu9-NWwdF81AeUwCPk22HfjF6fPE2JeaaeeydHt29mKj-oy66Ijvq8l6zJfYWfYFu_YJ7tL1MF4zH9_rTYlxQ99gC7PtnPRVF63NVe4vYR4ucEELCwLWgY4K_ciCBfK4oMNSIPDAL4_XR6Ty3JYISZSU17-vigEdBOY';
  assistantAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU9P3KA-3bmVkeijeP6-6ajOoN3Si1JACmerlAVTmFBAEeE3rNHERJlflgiSRoDCmRkp2pZqQwPT84sjrLOZstu7jxXcaYgeq5i06Z-wUeNOmXhFskHmv2YNqiV1vWasohJN0kwq_9l1tto6lBELKYlTzJC28fQFdgVnjMjEKNP5H-chHYpdv3mv7ar3r5Rpz_SoVoH7JCjsUFES8qXTZRE75Iv3E1AUFUFviGfIu99T12gnIaMky4Vqb918w97ME5sidb4q3wc9U';

  constructor(
    private chatService: ChatService,
    private paperService: PaperService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadContextPapers();
  }

  loadContextPapers() {
    this.paperService.loadPapers().subscribe({
      next: (papers) => {
        this.contextPapers = papers.map((p: Paper) => ({...p, isSelected: false}));
        this.checkQueryParams();
      },
      error: (err) => {
        console.error('Failed to load context papers:', err);
        // Fallback to local storage if API fails
        this.contextPapers = this.paperService.getAllPapers().map(p => ({...p, isSelected: false}));
        this.checkQueryParams();
      }
    });
  }

  checkQueryParams() {
    // Check for query params
    this.route.queryParams.subscribe(params => {
      const paperId = params['paperId'];
      if (paperId) {
        let selected = this.contextPapers.find(p => p.id === paperId);
        
        if (selected) {
           // Deselect others and select this one
           this.contextPapers.forEach(p => p.isSelected = (p.id === paperId));
           
           this.messages.push({
            id: '0',
            type: 'assistant',
            content: `Hello! I'm ready to chat about "${selected.title}". What would you like to know?`,
            timestamp: new Date()
          });
          return;
        }
      }
      
      // Default greeting if no specific paper selected
      if (this.messages.length === 0) {
        this.messages.push({
          id: '0',
          type: 'assistant',
          content: 'Hello! I am your Research Agent. I can answer questions based on your saved papers. What would you like to know?',
          timestamp: new Date()
        });
      }
    });
  }

  toggleContextSidebar(): void {
    this.showContextSidebar = !this.showContextSidebar;
    if (this.showContextSidebar) {
      this.sidebarMode = 'context';
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.isLoading) return;

    const userMsg = this.userMessage;
    this.userMessage = '';
    this.isLoading = true;

    // Add User Message
    this.messages.push({
      id: Date.now().toString(),
      type: 'user',
      content: userMsg,
      timestamp: new Date()
    });

    // Add Thinking Message
    const thinkingId = 'thinking-' + Date.now();
    this.messages.push({
      id: thinkingId,
      type: 'thinking',
      content: '',
      timestamp: new Date()
    });

    // Call Backend
    // Filter context to only selected papers
    const selectedContextIds = this.contextPapers
      .filter(p => p.isSelected)
      .map(p => p.id);

    this.chatService.sendMessage(userMsg, selectedContextIds).subscribe({
      next: (response) => {
        // Remove thinking message
        this.messages = this.messages.filter(m => m.id !== thinkingId);

        // Map sources to include paper details
        const mappedSources = response.sources.map(src => {
             const paper = this.paperService.getAllPapers().find(p => p.id === src.doc_id);
             return {
                 ...src,
                 paperTitle: paper?.title || src.title || 'Unknown Paper',
                 pdf_url: paper?.pdf_url || undefined,
                 section: src.chunk_type // Map chunk_type to section
             };
        });

        // Add Assistant Message
        this.messages.push({
          id: Date.now().toString(),
          type: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          sources: mappedSources
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.messages = this.messages.filter(m => m.id !== thinkingId);
        this.messages.push({
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  currentSources: ChatSource[] = [];

  toggleSources(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message && message.sources && message.sources.length > 0) {
      message.showSources = !message.showSources;
    }
  }

  openAddSources(): void {
    // Refresh papers from service in case they were added recently
    const savedPapers = this.paperService.getAllPapers();
    
    // Create a map of current papers to preserve selection
    const currentMap = new Map(this.contextPapers.map(p => [p.id, p]));
    
    // Start with saved papers
    const newContextPapers = savedPapers.map(p => {
      const existing = currentMap.get(p.id);
      return { ...p, isSelected: existing ? existing.isSelected : false };
    });

    // Add any currently selected papers that are NOT in saved papers (e.g. from Analyze navigation)
    this.contextPapers.forEach(p => {
      if (p.isSelected && !newContextPapers.find(np => np.id === p.id)) {
        newContextPapers.push({ ...p, isSelected: true });
      }
    });

    this.contextPapers = newContextPapers;
    this.sidebarMode = 'context';
    this.showContextSidebar = true;
  }



  viewPaper(paperId: string): void {
    console.log('View paper:', paperId);
  }

  togglePaperSelection(paper: Paper): void {
    paper.isSelected = !paper.isSelected;
  }

}
