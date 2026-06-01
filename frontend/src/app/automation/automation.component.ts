// // import { Component } from '@angular/core';

// // @Component({
// //   selector: 'app-automation',
// //   imports: [],
// //   templateUrl: './automation.component.html',
// //   styleUrl: './automation.component.scss'
// // })
// // export class AutomationComponent {

// // }
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

// interface DigestHistoryItem {
//   id: string;
//   sentAt: string;
//   status: 'sent' | 'failed';
//   papersCount: number;
//   topics: string[];
// }

// @Component({
//   selector: 'app-automation',
//   standalone: true,
//   imports: [CommonModule, FormsModule],
//   templateUrl: './automation.component.html',
//   styleUrls: ['./automation.component.scss'],
// })
// export class AutomationComponent implements OnInit {

//   // ── Email ──────────────────────────────────────────────────
//   emailAddress = '';

//   // ── Schedule ───────────────────────────────────────────────
//   frequency: 'daily' | 'weekly' | 'biweekly' = 'daily';
//   dayOfWeek = 'monday';
//   deliveryTime = '08:00';

//   // ── Topics ─────────────────────────────────────────────────
//   availableTopics: string[] = [
//     'Artificial Intelligence',
//     'Machine Learning',
//     'Deep Learning',
//     'Computer Vision',
//     'Natural Language Processing',
//     'Robotics',
//     'Data Science',
//     'Cybersecurity',
//     'Quantum Computing',
//     'Bioinformatics',
//     'Neuroscience',
//     'Econometrics',
//   ];
//   selectedTopics: string[] = [];

//   // ── Digest Options ─────────────────────────────────────────
//   papersPerDigest: '3' | '5' | '10' | '15' = '5';
//   digestContent: 'summary' | 'full' | 'brief' = 'full';

//   // ── Status ─────────────────────────────────────────────────
//   isEnabled = false;
//   nextRunAt: string | null = null;

//   // ── History ────────────────────────────────────────────────
//   isLoadingHistory = false;
//   digestHistory: DigestHistoryItem[] = [];

//   // ── Toast ──────────────────────────────────────────────────
//   showToast = false;
//   toastMessage = '';

//   ngOnInit(): void {
//     // TODO: load saved automation config from Firestore
//     // TODO: load digest history
//   }

//   // ── Topic helpers ──────────────────────────────────────────
//   isTopicSelected(topic: string): boolean {
//     return this.selectedTopics.includes(topic);
//   }

//   toggleTopic(topic: string): void {
//     if (this.isTopicSelected(topic)) {
//       this.selectedTopics = this.selectedTopics.filter(t => t !== topic);
//     } else {
//       this.selectedTopics.push(topic);
//     }
//   }

//   // ── Validation ─────────────────────────────────────────────
//   canSave(): boolean {
//     return (
//       this.emailAddress.trim().length > 0 &&
//       this.isValidEmail(this.emailAddress) &&
//       this.selectedTopics.length > 0
//     );
//   }

//   isValidEmail(email: string): boolean {
//     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//   }

//   // ── Schedule label ─────────────────────────────────────────
//   getScheduleLabel(): string {
//     const timeLabel = this.deliveryTime;
//     if (this.frequency === 'daily') return `Daily at ${timeLabel}`;
//     if (this.frequency === 'weekly') {
//       const day = this.dayOfWeek.charAt(0).toUpperCase() + this.dayOfWeek.slice(1);
//       return `Every ${day} at ${timeLabel}`;
//     }
//     if (this.frequency === 'biweekly') {
//       const day = this.dayOfWeek.charAt(0).toUpperCase() + this.dayOfWeek.slice(1);
//       return `Every other ${day} at ${timeLabel}`;
//     }
//     return '—';
//   }

//   // ── Actions ────────────────────────────────────────────────
//   saveAutomation(): void {
//     if (!this.canSave()) return;
//     // TODO: save config to Firestore under users/{uid}/automation_config
//     // TODO: trigger n8n webhook to register/update schedule
//     this.showSuccessToast(this.isEnabled ? 'Automation updated!' : 'Automation enabled!');
//     this.isEnabled = true;
//   }

//   disableAutomation(): void {
//     // TODO: update Firestore config isEnabled = false
//     // TODO: notify n8n to skip this user
//     this.isEnabled = false;
//     this.showSuccessToast('Automation disabled.');
//   }

//   // ── Toast helper ───────────────────────────────────────────
//   showSuccessToast(message: string): void {
//     this.toastMessage = message;
//     this.showToast = true;
//     setTimeout(() => (this.showToast = false), 3000);
//   }
// }

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DigestHistoryItem {
  id: string;
  sentAt: string;
  status: 'sent' | 'failed';
  papersCount: number;
  topics: string[];
}

@Component({
  selector: 'app-automation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './automation.component.html',
  styleUrls: ['./automation.component.scss'],
})
export class AutomationComponent implements OnInit {

  // ── Email ──────────────────────────────────────────────────
  emailAddress = '';

  // ── Schedule ───────────────────────────────────────────────
  frequency: 'daily' | 'weekly' | 'biweekly' = 'daily';
  dayOfWeek = 'monday';
  deliveryTime = '08:00';

  // ── Topics ─────────────────────────────────────────────────
  availableTopics: string[] = [
    'Artificial Intelligence',
    'Machine Learning',
    'Deep Learning',
    'Computer Vision',
    'Natural Language Processing',
    'Robotics',
    'Data Science',
    'Cybersecurity',
    'Quantum Computing',
    'Bioinformatics',
    'Neuroscience',
    'Econometrics',
  ];
  selectedTopics: string[] = [];

  // ── Digest Options ─────────────────────────────────────────
  papersPerDigest: '3' | '5' | '10' | '15' = '5';
  digestContent: 'summary' | 'full' | 'brief' = 'full';

  // ── Status ─────────────────────────────────────────────────
  isEnabled = false;
  nextRunAt: string | null = null;

  // ── History ────────────────────────────────────────────────
  isLoadingHistory = false;
  digestHistory: DigestHistoryItem[] = [
    {
      id: '1',
      sentAt: 'Today at 8:00 AM',
      status: 'sent',
      papersCount: 5,
      topics: ['Machine Learning', 'Computer Vision']
    },
    {
      id: '2',
      sentAt: 'Yesterday at 8:00 AM',
      status: 'sent',
      papersCount: 5,
      topics: ['Deep Learning', 'NLP']
    },
    {
      id: '3',
      sentAt: '2 days ago at 8:00 AM',
      status: 'sent',
      papersCount: 5,
      topics: ['Machine Learning']
    },

    {
      id: '5',
      sentAt: '4 days ago at 8:00 AM',
      status: 'sent',
      papersCount: 5,
      topics: ['Computer Vision', 'Deep Learning']
    }
  ];

  // ── Toast ──────────────────────────────────────────────────
  showToast = false;
  toastMessage = '';

  ngOnInit(): void {
    // TODO: load saved automation config from Firestore
    // TODO: load digest history
  }

  // ── Topic helpers ──────────────────────────────────────────
  isTopicSelected(topic: string): boolean {
    return this.selectedTopics.includes(topic);
  }

  toggleTopic(topic: string): void {
    if (this.isTopicSelected(topic)) {
      this.selectedTopics = this.selectedTopics.filter(t => t !== topic);
    } else {
      this.selectedTopics.push(topic);
    }
  }

  // ── Validation ─────────────────────────────────────────────
  canSave(): boolean {
    return (
      this.emailAddress.trim().length > 0 &&
      this.isValidEmail(this.emailAddress) &&
      this.selectedTopics.length > 0
    );
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Schedule label ─────────────────────────────────────────
  getScheduleLabel(): string {
    const timeLabel = this.deliveryTime;
    if (this.frequency === 'daily') return `Daily at ${timeLabel}`;
    if (this.frequency === 'weekly') {
      const day = this.dayOfWeek.charAt(0).toUpperCase() + this.dayOfWeek.slice(1);
      return `Every ${day} at ${timeLabel}`;
    }
    if (this.frequency === 'biweekly') {
      const day = this.dayOfWeek.charAt(0).toUpperCase() + this.dayOfWeek.slice(1);
      return `Every other ${day} at ${timeLabel}`;
    }
    return '—';
  }

  // ── Actions ────────────────────────────────────────────────
  saveAutomation(): void {
    if (!this.canSave()) return;
    // TODO: save config to Firestore under users/{uid}/automation_config
    // TODO: trigger n8n webhook to register/update schedule
    this.showSuccessToast(this.isEnabled ? 'Automation updated!' : 'Automation enabled!');
    this.isEnabled = true;
  }

  disableAutomation(): void {
    // TODO: update Firestore config isEnabled = false
    // TODO: notify n8n to skip this user
    this.isEnabled = false;
    this.showSuccessToast('Automation disabled.');
  }

  // ── Toast helper ───────────────────────────────────────────
  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }
}