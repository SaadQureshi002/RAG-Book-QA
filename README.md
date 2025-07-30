# PDF Owl - AI Document Interaction Platform

A sophisticated full-stack application that enables intelligent document analysis and conversation using Google Gemini AI and FAISS vector search.

## 🏗️ Project Structure

```
pdf-owl/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Tailwind CSS styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
├── backend/                  # FastAPI backend
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── models/
│   │   └── models.py        # Database models
│   ├── database/
│   │   └── database.py      # Database configuration
│   ├── services/
│   │   ├── document_service.py    # Document processing
│   │   ├── embedding_service.py   # Google Gemini embeddings
│   │   └── chat_service.py        # AI chat functionality
│   └── .env.example         # Environment variables template
└── README.md
```

## 🚀 Step-by-Step Setup Guide

### Prerequisites

Make sure you have installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Google API Key** - [Get from Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 1: Clone and Setup Project Structure

1. **Create the main project directory:**

   ```bash
   mkdir pdf-owl
   cd pdf-owl
   ```

2. **Create frontend and backend directories:**
   ```bash
   mkdir frontend backend
   ```

### Step 2: Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd frontend
   ```

2. **Initialize the project and install dependencies:**

   ```bash
   npm init -y
   npm install react react-dom lucide-react axios
   npm install -D @vitejs/plugin-react vite tailwindcss postcss autoprefixer eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
   ```

3. **Initialize Tailwind CSS:**

   ```bash
   npx tailwindcss init -p
   ```

4. **Create the required files** (copy the code from the artifacts above):
   - `package.json` - Frontend dependencies
   - `vite.config.js` - Vite configuration
   - `tailwind.config.js` - Tailwind configuration
   - `postcss.config.js` - PostCSS configuration
   - `index.html` - HTML template
   - `src/main.jsx` - React entry point
   - `src/index.css` - CSS with Tailwind imports
   - `src/App.jsx` - Main React component

### Step 3: Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd ../backend
   ```

2. **Create Python virtual environment:**

   ```bash
   python -m venv venv

   # On Windows:
   venv\Scripts\activate

   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Create the required files and directories:**

   ```bash
   mkdir models database services faiss_indexes
   ```

5. **Create all backend files** (copy the code from the artifacts above):
   - `requirements.txt` - Python dependencies
   - `main.py` - FastAPI application
   - `models/models.py` - Database models
   - `database/database.py` - Database configuration
   - `services/document_service.py` - Document processing service
   - `services/embedding_service.py` - Embedding service
   - `services/chat_service.py` - Chat service
   - `.env.example` - Environment variables template

### Step 4: Environment Configuration

1. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file and add your Google API key:**
   ```bash
   GOOGLE_API_KEY=your_actual_google_api_key_here
   DATABASE_URL=sqlite:///./pdf_owl.db
   ASYNC_DATABASE_URL=sqlite+aiosqlite:///./pdf_owl.db
   API_HOST=0.0.0.0
   API_PORT=8000
   DEBUG=True
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

### Step 5: Database Initialization

The database will be automatically created when you first run the backend server. The SQLite database file will be created in the backend directory.

### Step 6: Running the Application

1. **Start the backend server (from backend directory):**

   ```bash
   # Make sure virtual environment is activated
   python main.py
   ```

   The backend will be available at: `http://localhost:8000`

2. **Start the frontend development server (from frontend directory):**

   ```bash
   npm run dev
   ```

   The frontend will be available at: `http://localhost:3000`

### Step 7: Testing the Application

1. **Open your browser** and go to `http://localhost:3000`
2. **Upload a document** (PDF, TXT, DOC, or DOCX up to 50MB)
3. **Wait for processing** (embeddings generation)
4. **Start chatting** with your document!

## 🔧 Troubleshooting

### Common Issues and Solutions:

**1. Google API Key Issues:**

- Make sure your API key is valid and has access to Gemini API
- Check that the `.env` file is in the backend directory
- Restart the backend server after adding the API key

**2. Database Issues:**

- Delete the `pdf_owl.db` file and restart the backend to reset the database
- Make sure you have write permissions in the backend directory

**3. CORS Issues:**

- Ensure the frontend is running on port 3000
- Check that CORS origins are correctly configured in `main.py`

**4. Module Import Errors:**

- Make sure you're in the correct directory when running commands
- Ensure all dependencies are installed in the virtual environment

**5. File Upload Issues:**

- Check file size (must be under 50MB)
- Ensure file format is supported (PDF, TXT, DOC, DOCX)
- Verify backend server is running and accessible

## 🎯 Features

### ✅ Working Features:

- **Document Upload**: PDF, TXT, DOC, DOCX support up to 50MB
- **Text Extraction**: Automatic content extraction from documents
- **AI Chat**: Intelligent conversation with documents using Google Gemini
- **Vector Search**: FAISS-powered semantic search
- **Embedding Generation**: Google Gemini embeddings for accurate retrieval
- **Chat History**: Persistent conversation storage
- **Dark/Light Mode**: Theme switching
- **Responsive Design**: Works on desktop and mobile
- **Real-time Processing**: Live upload and processing feedback

### 🔧 Technical Stack:

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios
- **Backend**: FastAPI, SQLAlchemy, SQLite, Google Gemini AI
- **AI/ML**: Google Gemini embeddings, FAISS vector search, LangChain
- **Database**: SQLite with async support

## 📚 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

## 🔒 Security Notes

- **API Keys**: Never commit your `.env` file to version control
- **File Uploads**: Files are temporarily stored and then deleted after processing
- **Database**: SQLite database is created locally and contains no sensitive data by default

## 🎨 Customization

The application is designed to be easily customizable:

- **Styling**: Modify Tailwind classes in the React components
- **AI Behavior**: Adjust prompts in `chat_service.py`
- **File Support**: Add new file types in `document_service.py`
- **Database**: Switch to PostgreSQL by updating database configuration

## 📞 Support

If you encounter any issues:

1. Check the browser console for frontend errors
2. Check the terminal/console where the backend is running for server errors
3. Ensure all environment variables are correctly set
4. Verify your Google API key has the necessary permissions

Happy coding! 🚀
