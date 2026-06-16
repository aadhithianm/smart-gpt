# StudyGPT 🎓🤖

StudyGPT is an advanced, AI-powered study assistant and Retrieval-Augmented Generation (RAG) platform. It allows users to upload educational materials (PDFs, Word documents, PowerPoint presentations) and interact with them through semantically indexed AI chat, auto-generated quizzes, flashcard decks with spaced-repetition reviews, custom-tailored study plans, and learning analytics.

---

## 🚀 Key Features

*   **🗂️ Workspace Segregation:** Multi-tenant workspaces to isolate documents, chats, quizzes, and decks by subject or team.
*   **📚 Document Library & Parsing:** Supports parsing and chunking of `.pdf`, `.docx`, and `.pptx` files. Automatic chunking and 768-dimensional text vectorization using the Gemini `text-embedding-004` model.
*   **💬 Conversational Study Buddy:** AI-driven chat featuring hybrid search (documents + web search) with source citations, page-number tracking, and snippet references.
*   **📝 AI Quiz Generator:** Generate Multiple Choice Questions (MCQs), short-answer, and exam-style questions. Track history, attempts, and accuracy.
*   **🎴 Flashcards & Spaced Repetition:** Generate flashcard decks and review them using a custom Leitner-system spaced repetition mechanism (Box 1–5 scheduling).
*   **📆 Tailored Study Plans:** Auto-generate daily task checklists based on study goals, duration, and subject.
*   **📊 Learning Analytics:** High-level dashboard showcasing hours studied, accuracy rates, and quiz completion.
*   **🔒 Security & RLS:** Complete user and workspace isolation utilizing PostgreSQL Row Level Security (RLS) policies.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    subgraph Frontend [React SPA - Vite]
        UI[User Interface] --> API[Axios Client & Auth API]
        SBA[Supabase Auth & Client] --> UI
    end

    subgraph Backend [FastAPI - Uvicorn]
        API_Route[FastAPI Endpoints] --> Services[AI & Document Services]
        Services --> GenAI[Google GenAI SDK - Gemini]
        Services --> DB_ORM[SQLAlchemy ORM / Asyncpg]
    end

    subgraph Database [Supabase PostgreSQL]
        DB_ORM --> pgvector[PostgreSQL + pgvector]
        pgvector --> RLS[Row Level Security]
    end

    UI -- API requests --> API_Route
```

### Technology Stack
*   **Frontend:** React, Vite, Axios, TailwindCSS (optional, currently using modern vanilla CSS modules)
*   **Backend:** FastAPI, Python 3.10+, SQLAlchemy (Async), Asyncpg, Pydantic v2
*   **AI Services:** Google GenAI SDK (Gemini 2.0 / 1.5 Pro/Flash, `text-embedding-004`)
*   **Database:** Supabase PostgreSQL with `pgvector` for vector similarity search and HNSW indexes, custom PL/pgSQL triggers.

---

## 📦 Directory Structure

```text
study-gpt/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/              # API router and controllers
│   │   ├── core/             # Configuration and settings
│   │   ├── db/               # Database connection and models
│   │   ├── services/         # Document parsing, chunking, and AI logic
│   │   └── main.py           # Entry point for FastAPI
│   ├── .venv/                # Python virtual environment
│   ├── requirements.txt      # Backend dependencies
│   ├── schema.sql            # PostgreSQL DDL and DB migrations
│   └── .env                  # Backend credentials (git-ignored)
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── context/          # React Context API providers
│   │   ├── pages/            # Application views (Quizzes, Flashcards, Chat, etc.)
│   │   ├── App.jsx           # Main routing & application wrapper
│   │   └── api.js            # Axios client with JWT auto-injection
│   ├── package.json          # Node dependencies and scripts
│   ├── vite.config.js        # Vite build configuration
│   └── .env                  # Frontend configuration (git-ignored)
│
├── .graphifyignore           # Exclusions file for Graphify indexing
└── README.md                 # Root documentation
```

---

## 🔍 Graphify Workspace Indexing

This repository is optimized for **Graphify**—a developer tool that parses codebases into queryable semantic knowledge graphs. 

To ensure the indexing process remains clean, performant, and secure, a [`.graphifyignore`](file:///.graphifyignore) file is placed in the project root. It mimics the syntax of `.gitignore` and instructs the Graphify indexing engine to skip:
*   Large dependency trees (`node_modules/`, Python `.venv/`)
*   Compiled cache files (`__pycache__/`, `*.pyc`)
*   Build directories (`dist/`, `dist-ssr/`, `graphify-out/`)
*   Sensitive configuration files (`.env`, `.env.*`)

---

## ⚙️ Local Development Setup

### Prerequisites
*   **Node.js** (v18+)
*   **Python** (3.10+)
*   **PostgreSQL** instance with `vector` extension enabled (or a Supabase project)

---

### 1. Database Setup
1. Log into your Supabase console or local PostgreSQL instance.
2. Run the SQL script found in [`backend/schema.sql`](file:///backend/schema.sql) to initialize all tables, indexes, RLS policies, match functions, and authentication-sync triggers.

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell)
   .\.venv\Scripts\Activate.ps1
   # On macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   PROJECT_NAME="StudyGPT"
   API_V1_STR="/api"
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_KEY="your-supabase-service-role-key"
   SUPABASE_JWT_SECRET="your-supabase-jwt-signing-secret"
   GEMINI_API_KEY="your-gemini-api-key"
   DATABASE_URL="postgresql+asyncpg://postgres:password@db-host:5432/postgres"
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API documentation will be available at `http://localhost:8000/docs`.

---

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   VITE_API_URL="http://localhost:8000/api"
   ```
4. Start the frontend developer server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## 🛡️ License

This project is licensed under the MIT License.
