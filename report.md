# DocuMind: AI-Powered Document Interaction Platform
## Project Report - May 2026

---

## Executive Summary

DocuMind is a full-stack web application that enables users to upload documents and engage in intelligent conversations powered by AI embeddings and semantic search. The platform combines a React frontend with a FastAPI backend, utilizing FAISS for vector storage and Google Gemini embeddings for semantic understanding.

**Key Features:**
- Multi-format document upload (PDF, TXT, DOC, DOCX)
- AI-powered chat interface with document context
- Real-time vector embeddings and similarity search
- Chat session management
- Responsive dark/light mode UI
- Fallback demo mode for offline operation

---

## Technical Architecture

### Frontend Stack
- **Framework:** React 18
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **HTTP Client:** Native Fetch API with custom axios wrapper
- **State Management:** React Hooks (useState, useRef, useCallback, useEffect)

### Backend Stack
- **Framework:** FastAPI (Python)
- **Database:** SQLAlchemy ORM with async support
- **API Type:** RESTful with CORS support
- **Embeddings:** Google Gemini (embedding-001)
- **Vector Store:** FAISS for semantic search
- **Server:** Uvicorn (ASGI server)

### Database Models
Three main SQLAlchemy models structure the data:

1. **Document Model**
   - Stores uploaded documents with metadata
   - Relationships to Chat and DocumentEmbedding tables
   - Tracks file size, type, and processing timestamps

2. **Chat Model**
   - Manages chat sessions per document
   - Maintains conversation history
   - Links to Document and Message tables

3. **Message Model**
   - Individual messages within chat sessions
   - Stores similarity scores for AI responses
   - Tracks user vs. AI message distinction

4. **DocumentEmbedding Model**
   - Stores vector embeddings for document chunks
   - Maintains chunk text and index for retrieval
   - Enables semantic search functionality

---

## Backend Implementation

### API Endpoints

#### Health & Status
```python
GET /api/health
Returns: {"status": "ok", "service": "DocuMind API"}

GET /
Returns: {"message": "DOCUMIND API is running", "status": "healthy"}
```

#### Document Management
```python
POST /api/upload
- Accepts: Multipart form data with file upload
- Validations:
  - Allowed types: PDF, TXT, DOC, DOCX
  - Max size: 50MB
- Returns: Document metadata with ID, name, size, timestamp
- Processing: Extracts text, generates embeddings, stores in vector DB

GET /api/documents
- Returns: List of all uploaded documents with metadata
- Fields: id, name, size, uploaded timestamp, status
```

#### Chat Operations
```python
POST /api/chats
- Creates new chat session
- Parameters: title (string), document_id (integer)
- Returns: Chat object with ID, title, document_id, created_at

GET /api/chats
- Retrieves all chat sessions
- Returns: Array of chat objects with preview and timestamp

GET /api/chats/{document_id}/messages
- Fetches message history for a document
- Returns: Array of messages with type (user/ai), content, timestamp

POST /api/chat
- Main chat interaction endpoint
- Parameters:
  - message: User query (string)
  - document_id: Target document (integer)
  - chat_id: Optional conversation ID (integer)
- Returns: AI response with similarity score
```

### Core Services

#### DocumentService
Handles document processing:
- File validation and extraction
- Text chunking for embeddings
- Database persistence
- Retrieval of document metadata

#### ChatService
Manages conversation logic:
- Chat session creation
- Message storage and retrieval
- Response generation with context
- Document-message linking

#### EmbeddingService
Processes embeddings:
- Text embedding generation via Google Gemini
- Vector storage in FAISS
- Semantic similarity search
- Chunk indexing and retrieval

---

## Frontend Implementation

### Application Structure

The React application (App.jsx) is a single-page application with the following key components:

#### State Management
```javascript
const [isDarkMode, setIsDarkMode] = useState(true);
const [currentDocument, setCurrentDocument] = useState(null);
const [chatMessages, setChatMessages] = useState([]);
const [chatInput, setChatInput] = useState("");
const [isUploading, setIsUploading] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(true);
const [infoSidebarOpen, setInfoSidebarOpen] = useState(false);
const [chats, setChats] = useState([]);
const [documents, setDocuments] = useState([]);
const [currentChatId, setCurrentChatId] = useState(null);
const [backendConnected, setBackendConnected] = useState(false);
const [connectionAttempted, setConnectionAttempted] = useState(false);
```

#### Key Functions

**1. Document Upload Handler**
```javascript
const handleFileUpload = (files) => {
  // Validates file type (PDF, TXT, DOC, DOCX)
  // Validates file size (50MB max)
  // Initiates document processing
  // Handles FormData with axios.post to /api/upload
  // Gracefully falls back to demo mode on failure
}
```

**2. Chat Communication**
```javascript
const sendMessage = async () => {
  // Sends user message to /api/chat endpoint
  // Parameters: message, document_id, chat_id
  // Receives AI response with similarity score
  // Updates chat history
  // Handles offline fallback with demo response
}
```

**3. Data Loading**
```javascript
useEffect(() => {
  const loadInitialData = async () => {
    // Attempts 3 retries to connect to backend
    // Loads chats and documents on success
    // Sets backendConnected flag for UI states
  }
}, [connectionAttempted])
```

#### UI Components

**Layout:**
- Left Sidebar: Document list, chat history, new chat button
- Main Content: Document display, chat interface
- Right Info Sidebar: Technical metrics, backend status
- Top Bar: Document info, theme toggle, settings

**File Upload Area:**
- Drag-and-drop support
- Click to browse functionality
- Visual feedback with icon and instructions

**Chat Interface:**
- Message display with user/AI distinction
- Timestamps for each message
- Typing indicator animation
- Input field with send button

**Status Indicators:**
- Backend connection status
- Document processing status
- Message generation progress

### HTTP Client Implementation

Custom axios-like implementation using Fetch API:
```javascript
const axios = {
  get: async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { data: await response.json() };
  },
  post: async (url, data, config = {}) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(url, {
      method: "POST",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      body: isFormData ? data : JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}`);
    }
    return { data: await response.json() };
  }
};
```

---

## Database Schema

### Documents Table
```
Column          | Type      | Constraint
----------------|-----------|------------
id              | INTEGER   | PRIMARY KEY
filename        | STRING    | NOT NULL
file_size       | INTEGER   | NOT NULL
content         | TEXT      | NULLABLE
file_type       | STRING    | NOT NULL
created_at      | DATETIME  | DEFAULT: utcnow
updated_at      | DATETIME  | DEFAULT: utcnow
```

### Chats Table
```
Column          | Type      | Constraint
----------------|-----------|------------
id              | INTEGER   | PRIMARY KEY
title           | STRING    | NOT NULL
document_id     | INTEGER   | FK: documents.id
created_at      | DATETIME  | DEFAULT: utcnow
updated_at      | DATETIME  | DEFAULT: utcnow
```

### Messages Table
```
Column          | Type      | Constraint
----------------|-----------|------------
id              | INTEGER   | PRIMARY KEY
chat_id         | INTEGER   | FK: chats.id
content         | TEXT      | NOT NULL
is_user         | BOOLEAN   | NOT NULL
similarity_score| FLOAT     | NULLABLE
created_at      | DATETIME  | DEFAULT: utcnow
```

### DocumentEmbeddings Table
```
Column          | Type      | Constraint
----------------|-----------|------------
id              | INTEGER   | PRIMARY KEY
document_id     | INTEGER   | FK: documents.id
chunk_text      | TEXT      | NOT NULL
chunk_index     | INTEGER   | NOT NULL
embedding       | BINARY    | NOT NULL (serialized numpy array)
created_at      | DATETIME  | DEFAULT: utcnow
```

---

## File Upload & Processing Flow

1. **Client-Side Validation**
   - File type check
   - File size verification (50MB limit)

2. **Upload to Backend**
   ```
   POST /api/upload with FormData
   ```

3. **Server-Side Processing**
   - Temporary file storage
   - Document text extraction
   - Content chunking
   - Embedding generation via Google Gemini
   - Vector storage in FAISS
   - Database persistence

4. **Response to Client**
   - Document metadata
   - Success/error status
   - Automatic chat session creation

5. **Fallback Behavior**
   - If backend unavailable, demo mode activates
   - Client-side storage of documents
   - Simulated AI responses for demonstration

---

## Chat Interaction Flow

1. **User Sends Message**
   - Message displayed immediately in chat
   - Loading indicator shows processing state

2. **Backend Processing**
   - Message embedding generated
   - FAISS semantic search finds relevant document chunks
   - Context + message sent to Google Gemini API
   - AI generates contextual response

3. **Response Return**
   - AI response displayed with timestamp
   - Similarity score tracked
   - Message saved to database
   - Chat preview updated

4. **Offline Fallback**
   - Demo response generated client-side
   - Explains operation in demo mode
   - Provides backend connection troubleshooting

---

## Error Handling & Validation

### Backend Validation
- File type whitelist: PDF, TXT, DOC, DOCX
- File size limit: 50MB
- Document existence verification
- HTTP status codes with descriptive messages

### Frontend Error Handling
- Network error catching with retry logic
- User-friendly error messages
- Graceful fallback to demo mode
- Connection status indicators
- Detailed backend setup instructions

### CORS Configuration
```python
allowed_origins = os.getenv(
  "ALLOWED_ORIGINS",
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
).split(",")

app.add_middleware(
  CORSMiddleware,
  allow_origins=allowed_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)
```

---

## Performance Considerations

### Vector Search Optimization
- FAISS indexing for fast similarity search
- Chunked document processing
- Serialized embeddings for efficient storage
- Batch embedding generation capability

### Frontend Optimization
- Lazy loading of chat messages
- Auto-scroll with refs for performance
- Event debouncing for input
- Efficient re-renders with React hooks

### Backend Performance
- Async database operations
- Connection pooling via SQLAlchemy
- Efficient file handling with tempfile
- Streaming for large document uploads

---

## Security Features

### File Security
- File type validation (whitelist approach)
- File size limits (50MB)
- Temporary file cleanup after processing
- Secure file naming with timestamps

### API Security
- CORS policy enforcement
- Input validation on all endpoints
- HTTP exception handling
- Environment variable configuration for secrets

### Data Privacy
- Optional client-side processing in demo mode
- No data logging in responses
- Configurable origins for CORS

---

## Deployment Architecture

```
┌─────────────┐
│   Frontend  │
│  React 18   │
│  (Port 3000)│
└──────┬──────┘
       │ HTTP/Fetch
       ▼
┌─────────────────┐
│  FastAPI Backend│
│  (Port 8000)    │
├─────────────────┤
│  Services:      │
│ - Document      │
│ - Chat          │
│ - Embedding     │
└──────┬──────────┘
       │
       ├─────────────────────┬──────────────┐
       ▼                     ▼              ▼
   ┌────────┐        ┌──────────────┐  ┌────────┐
   │Database│        │FAISS Vectors │  │ Google │
   │(SQLite)│        │              │  │ Gemini │
   │        │        │              │  │ API    │
   └────────┘        └──────────────┘  └────────┘
```

---

## Configuration & Environment

### Backend Configuration
```python
# .env file
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
GOOGLE_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./documind.db
```

### Frontend Configuration
```javascript
const API_BASE_URL = ""; // Empty for same-origin, or specify port
```

### Running the Application

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Testing & Quality Assurance

### Backend Testing Considerations
- Unit tests for document parsing
- API endpoint testing with pytest
- Embedding generation validation
- Database transaction testing

### Frontend Testing Considerations
- Component rendering tests
- File upload validation tests
- Chat message display tests
- Backend connection retry logic tests

---

## Future Enhancements

1. **Advanced Features**
   - Multi-document conversations
   - Document summarization
   - Export chat history
   - Collaborative document sharing

2. **Performance**
   - Caching layer for frequent queries
   - Batch embedding processing
   - WebSocket for real-time updates

3. **User Experience**
   - User authentication system
   - Document organization folders
   - Search across all documents
   - Chat templates and suggestions

4. **Integration**
   - Support for more LLM models
   - Integration with cloud storage
   - OAuth authentication
   - Webhook support for external systems

---

## Conclusion

DocuMind represents a production-ready implementation of a modern RAG (Retrieval-Augmented Generation) system. By combining semantic search with large language models, it provides an intuitive interface for users to extract meaningful insights from their documents through natural conversation.

The architecture is scalable, with clear separation of concerns between frontend and backend, comprehensive error handling, and graceful degradation in offline scenarios.

**Project Status:** Development Complete - Ready for Deployment
**Last Updated:** May 11, 2026