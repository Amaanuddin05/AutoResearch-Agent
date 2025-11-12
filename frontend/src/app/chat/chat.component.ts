import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'thinking';
  content: string;
  timestamp: Date;
  sources?: number;
}

interface ContextPaper {
  id: string;
  title: string;
  authors: string;
  year: string;
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  messages: Message[] = [
    {
      id: '1',
      type: 'user',
      content: 'Summarize the key findings on quantum entanglement from my saved papers.',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'assistant',
      content: 'Key findings on quantum entanglement highlight its non-local properties, where particles remain connected regardless of distance. This has major implications for quantum computing, cryptography, and teleportation protocols. The EPR paradox remains a central debate, challenging classical intuition.',
      timestamp: new Date(),
      sources: 3
    },
    {
      id: '3',
      type: 'thinking',
      content: '',
      timestamp: new Date()
    }
  ];

  contextPapers: ContextPaper[] = [
    {
      id: '1',
      title: 'Simulating Physics with Computers',
      authors: 'Feynman, R.',
      year: '1982'
    },
    {
      id: '2',
      title: 'Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?',
      authors: 'Einstein, A., Podolsky, B., & Rosen, N.',
      year: '1935'
    },
    {
      id: '3',
      title: 'Quantum Theory, the Church-Turing Principle and the Universal Quantum Computer',
      authors: 'Deutsch, D.',
      year: '1985'
    }
  ];

  userMessage = '';
  showContextSidebar = true;
  userAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3qwSkx34ovGPZfLiz6mWbc4_hcMMScdQT547wu_pYdYzVkY5USHyAnK5kyYBl8gXct6mjNnPCsuZVf2ZeMm2M3xzE1TSNIhQrREz8Dyo3Zu9-NWwdF81AeUwCPk22HfjF6fPE2JeaaeeydHt29mKj-oy66Ijvq8l6zJfYWfYFu_YJ7tL1MF4zH9_rTYlxQ99gC7PtnPRVF63NVe4vYR4ucEELCwLWgY4K_ciCBfK4oMNSIPDAL4_XR6Ty3JYISZSU17-vigEdBOY';
  assistantAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU9P3KA-3bmVkeijeP6-6ajOoN3Si1JACmerlAVTmFBAEeE3rNHERJlflgiSRoDCmRkp2pZqQwPT84sjrLOZstu7jxXcaYgeq5i06Z-wUeNOmXhFskHmv2YNqiV1vWasohJN0kwq_9l1tto6lBELKYlTzJC28fQFdgVnjMjEKNP5H-chHYpdv3mv7ar3r5Rpz_SoVoH7JCjsUFES8qXTZRE75Iv3E1AUFUFviGfIu99T12gnIaMky4Vqb918w97ME5sidb4q3wc9U';

  toggleContextSidebar(): void {
    this.showContextSidebar = !this.showContextSidebar;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: this.userMessage,
      timestamp: new Date()
    };

    this.messages.push(newMessage);
    this.userMessage = '';

    // Simulate AI thinking
    setTimeout(() => {
      this.messages.push({
        id: (Date.now() + 1).toString(),
        type: 'thinking',
        content: '',
        timestamp: new Date()
      });
    }, 500);
  }

  viewSources(messageId: string): void {
    console.log('View sources for message:', messageId);
    this.showContextSidebar = true;
  }

  attachFile(): void {
    console.log('Attach file clicked');
  }

  viewPaper(paperId: string): void {
    console.log('View paper:', paperId);
  }

}
