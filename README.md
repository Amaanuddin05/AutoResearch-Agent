# 🔬 AutoResearch Agent

> **AI-Powered Research Paper Analysis & Summarization Platform**

AutoResearch Agent is an intelligent research assistant that automatically fetches, summarizes, and extracts insights from academic papers using advanced LLM technology. Built with a modern tech stack, it provides researchers with a powerful tool to manage and interact with scientific literature.

[![Angular](https://img.shields.io/badge/Angular-19-red?logo=angular)](https://angular.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)
[![LLaMA](https://img.shields.io/badge/LLaMA-3-blue)](https://ollama.ai/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Setup Instructions](#-setup-instructions)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

AutoResearch Agent streamlines the research workflow by:

1. **Fetching Papers**: Upload PDFs or paste arXiv URLs to retrieve research papers
2. **AI Summarization**: Automatically generates structured summaries using LLaMA 3 via Ollama
3. **Insight Extraction**: Identifies key findings, methods, datasets, limitations, and implications
4. **Semantic Search**: Uses ChromaDB vector store for intelligent paper retrieval
5. **Interactive Chat**: RAG-powered chat interface to query your research library
6. **History Management**: Stores all analyzed papers in Firebase Firestore with user authentication

### How It Works

```
┌─────────────┐      ┌──────┐      ┌─────────┐      ┌──────────┐      ┌───────────┐
│   Angular   │ ───▶ │ n8n  │ ───▶ │ FastAPI │ ───▶ │ ChromaDB │ ───▶ │ Firestore │
│  Frontend   │      │Webhook│      │ ML API  │      │  Vector  │      │ Database  │
└─────────────┘      └──────┘      └─────────┘      └──────────┘      └───────────┘
       │                 │                │                                    │
       └─────────────────┴────────────────┴────────────────────────────────────┘
                              Node.js Backend Orchestration
```

The system follows a multi-agent pipeline:
- **Frontend** (Angular): User interface for uploading papers and viewing results
- **n8n Workflow**: Automation layer that orchestrates the analysis pipeline
- **FastAPI Backend**: Python ML service running LangChain + LLaMA 3 for summarization
- **Node.js Server**: Express API handling file uploads, routing, and webhook callbacks
- **ChromaDB**: Vector database for semantic search and RAG context retrieval
- **Firestore**: Persistent storage for user data, papers, summaries, and chat history

---

## ✨ Features

### Core Capabilities

- 📄 **Multi-Source Paper Input**
  - Upload PDF files directly
  - Paste arXiv URLs for automatic fetching
  - Batch processing support

- 🤖 **AI-Powered Analysis**
  - Structured summarization (abstract, objectives, methodology, findings, limitations)
  - Automatic insight extraction (methods, datasets, citations, implications)
  - Multi-chunk processing for long papers
  - LLaMA 3 (8B) via Ollama for high-quality summaries

- 🔍 **Semantic Search**
  - ChromaDB vector embeddings using sentence-transformers
  - Query your research library with natural language
  - Context-aware paper retrieval

- 💬 **RAG Chat Interface**
  - Chat with your papers using retrieval-augmented generation
  - Select specific papers as context sources
  - Fallback to general LLM when no relevant context found

- 🔐 **User Authentication**
  - Firebase Authentication (Email/Password + Google OAuth)
  - User-specific paper libraries
  - Secure Firestore rules for data isolation

- 📚 **Research Library**
  - View all analyzed papers
  - Delete unwanted entries
  - Navigate to detailed analysis or chat

- 🎨 **Modern UI/UX**
  - Responsive Angular 19 design
  - Tailwind CSS styling
  - Real-time progress tracking
  - Dark mode support

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Angular 19 (Standalone Components)
- **Styling**: Tailwind CSS 4.x
- **Authentication**: Firebase Auth (@angular/fire)
- **Database**: Firebase Firestore
- **HTTP Client**: Angular HttpClient + RxJS

### Backend (Node.js)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5.x
- **File Handling**: Multer
- **HTTP Client**: Axios
- **XML Parsing**: xml2js (for arXiv API)

### ML Backend (Python)
- **Framework**: FastAPI + Uvicorn
- **LLM Framework**: LangChain
- **Model**: LLaMA 3 (8B) via Ollama
- **Vector Store**: ChromaDB
- **Embeddings**: sentence-transformers
- **PDF Processing**: PyMuPDF (fitz)

### Infrastructure
- **Automation**: n8n (workflow orchestration)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Deployment**: Netlify (frontend), Render/Railway (backends)

---

## 🏗 Architecture

### System Flow

1. **User uploads paper** → Angular frontend
2. **Frontend triggers n8n webhook** → Sends PDF/URL + user metadata
3. **n8n calls FastAPI** → `/analyze_paper` endpoint
4. **FastAPI processes**:
   - Downloads PDF (if URL provided)
   - Extracts text using PyMuPDF
   - Chunks text and generates summaries via LLaMA 3
   - Extracts structured insights
   - Stores embeddings in ChromaDB
   - Runs enrichment pipeline (section summaries, paragraph rewrites, concept extraction)
5. **FastAPI returns results** → Back to n8n
6. **n8n sends to Node backend** → `/webhook/n8n/paper_result`
7. **Node backend stores in Firestore** → User-specific collection
8. **Frontend polls/receives update** → Displays results to user

### Multi-Agent Pipeline

- **Fetcher Agent**: Downloads and extracts paper content
- **Summarizer Agent**: Generates structured summaries using LLaMA 3
- **Insight Agent**: Extracts key research elements (methods, datasets, findings)
- **Enrichment Agent**: Creates semantic chunks for RAG (sections, paragraphs, concepts)
- **Chat Agent**: Handles RAG-based Q&A with context compression

---

## 📁 Folder Structure

```
Research Agent/
├── frontend/                    # Angular 19 Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── analyze/        # Paper analysis component
│   │   │   ├── chat/           # RAG chat interface
│   │   │   ├── fetch/          # Paper upload/fetch component
│   │   │   ├── home/           # Landing page
│   │   │   ├── library/        # Research library view
│   │   │   ├── login/          # Authentication component
│   │   │   ├── navbar/         # Navigation bar
│   │   │   ├── guards/         # Auth guards
│   │   │   ├── services/       # Angular services (auth, firestore, API)
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   ├── app.routes.ts   # Routing configuration
│   │   │   └── firebase.config.ts
│   │   └── ...
│   ├── package.json
│   └── angular.json
│
├── server/                      # Node.js Express Backend
│   ├── controllers/            # Request handlers
│   │   ├── fetchController.js  # Paper fetching logic
│   │   ├── summaryController.js
│   │   ├── chatController.js
│   │   └── ...
│   ├── routes/                 # API routes
│   │   ├── fetchRoutes.js
│   │   ├── summaryRoutes.js
│   │   ├── chatRoutes.js
│   │   └── ...
│   ├── services/               # Business logic
│   ├── middleware/             # Express middleware
│   ├── config/                 # Configuration files
│   ├── index.js                # Server entry point
│   └── package.json
│
├── ml/                          # FastAPI ML Backend
│   ├── app.py                  # Main FastAPI application
│   ├── summarizer_agent.py     # Summarization logic
│   ├── insight_agent.py        # Insight extraction
│   ├── chat_agent.py           # RAG chat handler
│   ├── vector_store.py         # ChromaDB operations
│   ├── requirements.txt        # Python dependencies
│   └── chroma_db/              # Vector database storage
│
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Firestore indexes
├── firebase.json                # Firebase configuration
├── netlify.toml                 # Netlify deployment config
├── .firebaserc                  # Firebase project config
└── README.md                    # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js**: v18+ (for Angular and Express)
- **Python**: 3.10+ (for FastAPI)
- **Ollama**: Installed with LLaMA 3 model
- **Firebase Project**: With Auth and Firestore enabled
- **n8n**: Installed locally or cloud instance

---

### A) Frontend Setup (Angular)

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Create/update `src/app/firebase.config.ts`:
   ```typescript
   export const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Set environment variables**
   
   Create `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:5000',
     mlApiUrl: 'http://localhost:8000',
     n8nWebhookUrl: 'YOUR_N8N_WEBHOOK_URL'
   };
   ```

5. **Run development server**
   ```bash
   npm start
   ```
   
   Navigate to `http://localhost:4200`

---

### B) Backend Setup (Node.js)

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   
   Create `.env` file:
   ```env
   PORT=5000
   ML_API_URL=http://localhost:8000
   N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL
   
   # Firebase Admin SDK (download from Firebase Console)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   ```

4. **Start server**
   ```bash
   npm start
   ```
   
   Server runs on `http://localhost:5000`

---

### C) FastAPI ML Backend Setup

1. **Navigate to ml directory**
   ```bash
   cd ml
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Ollama**
   
   Update `app.py` with your Ollama host:
   ```python
   llm = OllamaLLM(
       model="llama3:8b",
       base_url="http://localhost:11434"  # Change if Ollama runs elsewhere
   )
   ```

5. **Ensure Ollama is running**
   ```bash
   ollama serve
   ollama pull llama3:8b
   ```

6. **Run FastAPI application**
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
   
   API docs available at `http://localhost:8000/docs`

---

### D) n8n Workflow Setup

1. **Install n8n**
   
   **Option 1: npm**
   ```bash
   npm install -g n8n
   n8n start
   ```
   
   **Option 2: Docker**
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```

2. **Create workflow**
   
   Access n8n at `http://localhost:5678`

3. **Configure workflow nodes**:

   **Node 1: Webhook Trigger**
   - Method: POST
   - Path: `/webhook/analyze-paper`
   - Response: Immediately
   
   **Node 2: HTTP Request to FastAPI**
   - Method: POST
   - URL: `http://localhost:8000/analyze_paper`
   - Body:
     ```json
     {
       "path": "{{ $json.pdf_url }}",
       "metadata": "{{ $json.metadata }}",
       "uid": "{{ $json.uid }}"
     }
     ```
   
   **Node 3: Wait for Job Completion**
   - Poll `/analysis_status/{{ $json.job_id }}`
   - Until status = "completed"
   
   **Node 4: HTTP Request to Node Backend**
   - Method: POST
   - URL: `http://localhost:5000/webhook/n8n/paper_result`
   - Body: `{{ $json.result }}`

4. **Activate workflow** and copy webhook URL

5. **Update frontend environment** with n8n webhook URL

---

### E) Firebase Setup

1. **Create Firebase project** at [console.firebase.google.com](https://console.firebase.google.com)

2. **Enable Authentication**
   - Email/Password provider
   - Google OAuth provider

3. **Create Firestore database**
   - Start in production mode
   - Choose region

4. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```
   
   Rules from `firestore.rules`:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
         
         match /papers/{paperId} {
           allow read, write: if request.auth != null && request.auth.uid == uid;
         }
       }
     }
   }
   ```

5. **Download Admin SDK key**
   - Project Settings → Service Accounts → Generate New Private Key
   - Use in Node.js backend `.env`

---

## 📡 API Endpoints

### Node.js Backend (`http://localhost:5000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload PDF file |
| POST | `/fetch` | Fetch paper from arXiv URL |
| GET | `/download/:filename` | Download processed paper |
| POST | `/chat` | Send chat message (proxies to FastAPI) |
| POST | `/webhook/n8n/paper_result` | Receive results from n8n |

### FastAPI ML Backend (`http://localhost:8000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/analyze_paper` | Start async paper analysis (returns job_id) |
| GET | `/analysis_status/{job_id}` | Check analysis progress |
| POST | `/summarize` | Summarize text |
| POST | `/structured_summary` | Generate structured PDF summary |
| POST | `/extract_insights` | Extract research insights |
| POST | `/store_paper` | Store paper in ChromaDB |
| POST | `/search_papers` | Semantic search in user's library |
| POST | `/chat_rag` | RAG-powered chat with papers |
| GET | `/fetch_papers` | Fetch papers from arXiv |
| DELETE | `/delete_paper/{paper_id}` | Delete paper from ChromaDB |
| GET | `/debug_list_papers` | Debug endpoint to list stored papers |

### n8n Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook/analyze-paper` | Trigger analysis workflow |

---

## 🔐 Environment Variables

### Frontend (`environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',           // Node.js backend
  mlApiUrl: 'http://localhost:8000',         // FastAPI backend
  n8nWebhookUrl: 'YOUR_N8N_WEBHOOK_URL'      // n8n workflow webhook
};
```

### Node.js Backend (`.env`)

```env
PORT=5000
ML_API_URL=http://localhost:8000
N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

### FastAPI Backend (`app.py`)

```python
# Ollama Configuration
llm = OllamaLLM(
    model="llama3:8b",
    base_url="http://localhost:11434"  # Or remote Ollama server
)
```

### Firebase (`firebase.config.ts`)

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 🌐 Deployment

### Frontend (Netlify)

1. **Connect repository** to Netlify

2. **Configure build settings**:
   - Build command: `npm run build -- --configuration production`
   - Publish directory: `dist/frontend/browser`
   - Base directory: `frontend`

3. **Set environment variables** in Netlify dashboard

4. **Deploy** (automatic on push to main)

**Alternative**: Use `netlify.toml` (already configured in project root)

---

### Node.js Backend (Render/Heroku/Railway)

**Render**:
1. Create new Web Service
2. Connect repository
3. Build command: `cd server && npm install`
4. Start command: `cd server && npm start`
5. Add environment variables
6. Deploy

**Railway**:
```bash
railway login
railway init
railway up
```

**Heroku**:
```bash
heroku create autoresearch-backend
git subtree push --prefix server heroku main
```

---

### FastAPI Backend (Railway/DigitalOcean/Render)

**Railway**:
1. Create new service
2. Select `ml` directory
3. Railway auto-detects Python
4. Add environment variables
5. Deploy

**DigitalOcean App Platform**:
1. Create new app
2. Select repository
3. Detect Python app
4. Set run command: `uvicorn app:app --host 0.0.0.0 --port 8080`
5. Deploy

**Docker** (for any platform):
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Ollama Remote Setup

For production, host Ollama on a dedicated server:

1. **Install Ollama** on server
   ```bash
   curl https://ollama.ai/install.sh | sh
   ```

2. **Pull model**
   ```bash
   ollama pull llama3:8b
   ```

3. **Run as service**
   ```bash
   ollama serve
   ```

4. **Update FastAPI** `base_url` to server IP/domain

---

### Firebase Deployment

1. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy indexes** (if needed)
   ```bash
   firebase deploy --only firestore:indexes
   ```

---

## 📸 Screenshots

### Home Page
![Home Page](screenshots/home.png)
*Landing page with authentication and navigation*

### Paper Analysis
![Analysis Page](screenshots/analyze.png)
*Structured summary and insights extraction results*

### RAG Chat Interface
![Chat Page](screenshots/chat.png)
*Interactive chat with research papers using RAG*

### Research Library
![History Page](screenshots/history.png)
*Manage and browse analyzed papers*

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/Amaanuddin05/AutoResearch-Agent.git
   cd AutoResearch-Agent
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**

### Development Guidelines

- **Frontend**: Follow Angular style guide, use standalone components
- **Backend**: Use ES modules, async/await patterns
- **Python**: Follow PEP 8, use type hints
- **Commits**: Use conventional commits (feat, fix, docs, etc.)

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features (e.g., support for more paper sources)
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Internationalization

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 AutoResearch Agent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **LangChain** for the LLM framework
- **Ollama** for local LLM inference
- **ChromaDB** for vector storage
- **Firebase** for authentication and database
- **Angular Team** for the amazing framework
- **FastAPI** for the high-performance Python API

---

## 📞 Support

For questions, issues, or feature requests:

- 🐛 [Open an issue](https://github.com/Amaanuddin05/AutoResearch-Agent/issues)
- 💬 [Start a discussion](https://github.com/Amaanuddin05/AutoResearch-Agent/discussions)
- 📧 Contact: [your-email@example.com]

---

<div align="center">

**Built with ❤️ by researchers, for researchers**

⭐ Star this repo if you find it useful!

</div>
