# 🧠 DocuMind: Intelligent RAG Platform

DocuMind is a premium AI-powered document interaction platform that leverages the **Retrieval-Augmented Generation (RAG)** architecture. It allows users to upload documents, perform semantic search via vector embeddings, and have intelligent conversations with their data using **Google Gemini 1.5 Flash**.

![DocuMind Interface](https://raw.githubusercontent.com/lucide-react/lucide/main/icons/brain-circuit.svg)

## 🚀 Core Features

- **Multi-Format Support**: Process PDF, TXT, and DOCX files up to 50MB.
- **Advanced RAG Pipeline**: Uses LangChain for document orchestration and FAISS for high-performance vector search.
- **Premium AI Integration**: Powered by Google Gemini 1.5 Flash for rapid, accurate, and context-aware responses.
- **Robust Connectivity**: Built-in health checks and resilient API proxying for a seamless developer experience.
- **Premium UI/UX**: A modern, responsive React interface featuring:
  - ✨ Real-time processing status
  - 🌙 Dynamic Dark/Light mode
  - 💬 Persistent chat history
  - 📱 Fully responsive design for mobile and desktop

## 🏗️ Technical Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite.
- **AI/ML**: Google Gemini (Chat & Embeddings), FAISS Vector Store, LangChain.
- **Database**: SQLite with async support for persistent storage of chats and document metadata.

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Backend Configuration
Navigate to the `backend` directory and set up your environment:

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Unix/MacOS
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```env
GOOGLE_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///./documind.db
ASYNC_DATABASE_URL=sqlite+aiosqlite:///./documind.db
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 2. Frontend Configuration
Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

## 🏃 Running the Application

1. **Start the Backend Server**:
   ```bash
   cd backend
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

2. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Access the application at `http://localhost:3000`.

## 📜 How it Works
1. **Ingestion**: Documents are uploaded and split into optimized chunks.
2. **Embedding**: `gemini-embedding-001` converts text chunks into high-dimensional vectors.
3. **Vector Store**: Chunks are indexed in a local **FAISS** database.
4. **Retrieval**: When you ask a question, the system finds the most relevant chunks using semantic similarity.
5. **Generation**: `gemini-1.5-flash` uses the retrieved context to generate a precise, grounded answer.

## 🔒 Security
- **Local Storage**: Your documents are processed locally; only text chunks are sent to Google Gemini for embedding and generation.
- **Environment Safety**: Always keep your `GOOGLE_API_KEY` in the `.env` file and never commit it to version control.


