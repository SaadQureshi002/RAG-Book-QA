import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  MessageCircle,
  FileText,
  Send,
  X,
  Plus,
  Moon,
  Sun,
  Info,
  Brain,
  Database,
  Shield,
  Zap,
  Menu,
  Settings,
} from "lucide-react";

// Real axios implementation for backend connection
const axios = {
  get: async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { data: await response.json() };
  },
  post: async (url, data, config = {}) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(url, {
      method: "POST",
      headers: isFormData ? {} : { "Content-Type": "application/json" },
      body: isFormData ? data : JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`HTTP ${response.status}`);
      error.detail = errorData.detail || response.statusText;
      throw error;
    }
    return { data: await response.json() };
  },
};

const API_BASE_URL = "";

const DocuMind = () => {
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

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (connectionAttempted) return;
      setConnectionAttempted(true);

        // Try to check backend connection with retries
        let connected = false;
        for (let i = 0; i < 3; i++) {
          try {
            await axios.get(`${API_BASE_URL}/api/health`);
            connected = true;
            break;
          } catch (e) {
            console.warn(`Connection attempt ${i+1} failed...`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (connected) {
          setBackendConnected(true);
          // Load real data if backend is available
          const [chatsResponse, docsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/chats`),
            axios.get(`${API_BASE_URL}/api/documents`),
          ]);

          setChats(chatsResponse.data);
          setDocuments(docsResponse.data);
        } else {
          throw new Error("Could not connect to backend after multiple attempts");
        }
    };

    loadInitialData();
  }, [connectionAttempted]);

  // Process document with backend fallback
  const processDocument = async (file) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData);

      const newDoc = response.data;
      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
      setBackendConnected(true);

      setChatMessages([
        {
          id: Date.now(),
          type: "system",
          content: `Document "${file.name}" has been successfully processed and is ready for analysis.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Create new chat session
      const chatResponse = await axios.post(`${API_BASE_URL}/api/chats`, {
        title: `Chat about ${file.name}`,
        document_id: newDoc.id,
      });
      setCurrentChatId(chatResponse.data.id);
      setChats((prev) => [chatResponse.data, ...prev]);
    } catch (error) {
      console.error("Error processing document:", error);
      // Don't set backendConnected to false if it's an HTTP error (means backend is alive)
      if (error.message && error.message.includes("HTTP")) {
        alert(`Backend error: ${error.detail || error.message}. Check your API key and model availability.`);
      } else {
        setBackendConnected(false);
      }

      // Fallback to client-side processing
      const newDoc = {
        id: Date.now(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
        uploaded: "Just now",
        status: "processed",
      };

      const newChat = {
        id: Date.now(),
        title: `Chat about ${file.name}`,
        document_id: newDoc.id,
        timestamp: "Just now",
        preview: "",
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
      setCurrentChatId(newChat.id);
      setChats((prev) => [newChat, ...prev]);

      setChatMessages([
        {
          id: Date.now(),
          type: "system",
          content: `Document "${file.name}" processed in offline mode. AI responses are simulated for demonstration.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload only PDF, TXT, DOC, or DOCX files.");
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB.");
      return;
    }

    processDocument(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentDocument) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    const messageContent = chatInput;
    setChatInput("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: messageContent,
        document_id: currentDocument.id,
        chat_id: currentChatId,
      });

      const aiResponse = {
        id: Date.now() + 1,
        type: "ai",
        content: response.data.response,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, aiResponse]);
      setBackendConnected(true);

      // Update chat preview
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                preview:
                  messageContent.length > 30
                    ? `${messageContent.substring(0, 30)}...`
                    : messageContent,
                timestamp: "Just now",
              }
            : chat
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setBackendConnected(false);

      // Fallback AI response for demo
      const aiResponse = {
        id: Date.now() + 1,
        type: "ai",
        content: `I'm currently operating in demo mode. Based on your question "${messageContent}", I would normally analyze your document "${currentDocument.name}" using AI embeddings and provide contextual answers. For full functionality, please ensure the backend server is running at ${API_BASE_URL}.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, aiResponse]);

      // Update chat preview even in offline mode
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                preview:
                  messageContent.length > 30
                    ? `${messageContent.substring(0, 30)}...`
                    : messageContent,
                timestamp: "Just now",
              }
            : chat
        )
      );
    }

    setIsProcessing(false);
  };

  const startNewChat = () => {
    setChatMessages([]);
    setCurrentDocument(null);
    setCurrentChatId(null);
  };

  const selectChat = async (chat) => {
    setCurrentChatId(chat.id);

    try {
      // Find the associated document
      const doc = documents.find((d) => d.id === chat.document_id);
      if (doc) {
        setCurrentDocument(doc);
      }

      if (backendConnected) {
        const response = await axios.get(
          `${API_BASE_URL}/api/chats/${chat.id}/messages`
        );
        setChatMessages(response.data);
      } else {
        setChatMessages([
          {
            id: Date.now(),
            type: "system",
            content: `Chat "${chat.title}" loaded in offline mode. Previous messages are not available without backend connection.`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      setBackendConnected(false);
      setChatMessages([
        {
          id: Date.now(),
          type: "system",
          content: `Could not load chat history for "${chat.title}". Backend may be unavailable.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  const selectDocument = async (doc) => {
    setCurrentDocument(doc);

    // Find associated chat or create a system message
    const associatedChat = chats.find((c) => c.document_id === doc.id);
    if (associatedChat) {
      selectChat(associatedChat);
    } else {
      setChatMessages([
        {
          id: Date.now(),
          type: "system",
          content: `Switched to document "${doc.name}". You can now ask questions about its content.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  useEffect(() => {
    if (chatEndRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div
      className={`h-screen flex ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Left Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-16"
        } transition-all duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-r flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                  <Brain size={20} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
                  DocuMind
                </h1>
              </div>
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
                <Brain size={20} className="text-white" />
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1 rounded hover:bg-gray-700 ${
                !sidebarOpen ? "mx-auto" : ""
              }`}
            >
              <Menu size={16} />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={startNewChat}
            className={`${
              sidebarOpen ? "w-full" : "w-12 h-12"
            } flex items-center justify-center ${
              sidebarOpen ? "px-4 py-3 space-x-3" : ""
            } text-white transition-all rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700`}
          >
            <Plus size={20} />
            {sidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            {/* Recent Chats */}
            <div className="px-4 pb-4">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Recent Chats
              </h3>
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => selectChat(chat)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    } ${
                      currentChatId === chat.id
                        ? isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-100"
                        : ""
                    }`}
                  >
                    <div className="text-sm font-medium truncate">
                      {chat.title}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {chat.timestamp}
                    </div>
                    {chat.preview && (
                      <div className="mt-1 text-xs text-gray-400 truncate">
                        {chat.preview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="px-4 pb-4">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                Documents
              </h3>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => selectDocument(doc)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    } ${
                      currentDocument?.id === doc.id
                        ? isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-100"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText
                        size={16}
                        className="flex-shrink-0 text-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {doc.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {doc.size} • {doc.uploaded}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center space-x-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  backendConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-gray-400">
                {backendConnected ? "Connected" : "Demo Mode"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Top Bar */}
        <div
          className={`px-6 py-3 border-b ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          } flex items-center justify-between`}
        >
          <div className="flex items-center space-x-4">
            {currentDocument && (
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm font-medium">
                  {currentDocument.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({currentDocument.size})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setInfoSidebarOpen(!infoSidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Connection Status Banner */}
        {!backendConnected && connectionAttempted && (
          <div
            className={`px-4 py-2 text-center text-sm ${
              isDarkMode
                ? "bg-yellow-900/20 text-yellow-300"
                : "bg-yellow-50 text-yellow-800"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Info size={14} />
              <span>Backend server not connected - running in demo mode</span>
            </div>
          </div>
        )}

        {/* Chat Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 px-6 py-4 overflow-y-auto"
            style={{ scrollBehavior: "smooth" }}
          >
            {!currentDocument && !isUploading ? (
              /* Welcome State */
              <div className="flex flex-col items-center justify-center h-full">
                <div className="max-w-2xl space-y-6 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                    <Brain className="text-white" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold">Welcome to DocuMind</h2>
                  <p className="text-gray-500">
                    Upload a document to start an intelligent conversation with
                    your content
                  </p>

                  {/* Upload Area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`relative border-2 border-dashed rounded-xl p-8 transition-all hover:border-blue-400 cursor-pointer ${
                      isDarkMode ? "border-gray-600" : "border-gray-300"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      accept=".pdf,.txt,.doc,.docx"
                      className="hidden"
                    />
                    <div className="space-y-4">
                      <Upload className="mx-auto text-gray-400" size={32} />
                      <div>
                        <p className="font-medium">Drop your document here</p>
                        <p className="mt-2 text-sm text-gray-500">
                          or click to browse • PDF, TXT, DOC, DOCX • Max 50MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isUploading ? (
              /* Processing State */
              <div className="flex items-center justify-center h-full">
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse">
                    <Upload className="text-white animate-bounce" size={24} />
                  </div>
                  <h3 className="font-semibold">Processing your document...</h3>
                  <p className="text-sm text-gray-500">
                    {backendConnected
                      ? "Generating embeddings and preparing for analysis"
                      : "Processing in demo mode"}
                  </p>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-6">
                {chatMessages.length === 0 && currentDocument && (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                      <MessageCircle className="text-white" size={20} />
                    </div>
                    <h3 className="mb-2 font-semibold">Document Ready!</h3>
                    <p className="mb-4 text-sm text-gray-500">
                      Your document has been processed. Start asking questions!
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        "Summarize this document",
                        "What are the key points?",
                        "Find specific information",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setChatInput(suggestion)}
                          className={`px-3 py-2 rounded-full text-sm transition-colors ${
                            isDarkMode
                              ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-3xl ${
                        message.type === "user" ? "ml-12" : "mr-12"
                      }`}
                    >
                      {message.type !== "user" && (
                        <div className="flex items-center mb-2 space-x-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                            <Brain size={12} className="text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            DocuMind
                          </span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                            : message.type === "system"
                            ? isDarkMode
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                            : isDarkMode
                            ? "bg-gray-800 border border-gray-700"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">
                          {message.content}
                        </p>
                        <p className="mt-2 text-xs opacity-70">
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl mr-12">
                      <div className="flex items-center mb-2 space-x-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                          <Brain size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          DocuMind
                        </span>
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          isDarkMode
                            ? "bg-gray-800 border border-gray-700"
                            : "bg-white border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {backendConnected
                              ? "Analyzing document..."
                              : "Generating demo response..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Area - Fixed at bottom */}
          <div
            className={`border-t ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            } p-4`}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={
                      currentDocument
                        ? "Ask questions about your document..."
                        : "Upload a document to start chatting..."
                    }
                    disabled={!currentDocument || isUploading || isProcessing}
                    className={`w-full px-4 py-3 rounded-xl border transition-all ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } ${
                      currentDocument && !isUploading && !isProcessing
                        ? "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={
                    !chatInput.trim() ||
                    !currentDocument ||
                    isUploading ||
                    isProcessing
                  }
                  className="px-4 py-3 text-white transition-all rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Info Sidebar */}
      {infoSidebarOpen && (
        <div
          className={`w-80 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          } border-l flex flex-col`}
        >
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Technical Information</h3>
              <button
                onClick={() => setInfoSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-700"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Database size={20} className="text-blue-500" />
                <div>
                  <h4 className="font-medium">Vector Database</h4>
                  <p className="text-sm text-gray-500">
                    FAISS for semantic search
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Zap size={20} className="text-green-500" />
                <div>
                  <h4 className="font-medium">AI Embeddings</h4>
                  <p className="text-sm text-gray-500">
                    Google Gemini models/embedding-001
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Shield size={20} className="text-purple-500" />
                <div>
                  <h4 className="font-medium">Privacy & Security</h4>
                  <p className="text-sm text-gray-500">
                    Client-side processing
                  </p>
                </div>
              </div>
            </div>

            {currentDocument && (
              <div className="space-y-4">
                <h4 className="font-medium">Document Analysis</h4>
                <div
                  className={`p-3 rounded-lg ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>File Name:</span>
                      <span className="ml-2 text-right truncate max-w-32">
                        {currentDocument.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span>{currentDocument.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-green-500">
                        {currentDocument.status === "processed"
                          ? "Ready"
                          : "Processing"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Embeddings:</span>
                      <span>
                        {backendConnected ? "3072 dimensions" : "Demo mode"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chunks:</span>
                      <span>{backendConnected ? "24 segments" : "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Performance Metrics</h4>
              <div
                className={`p-3 rounded-lg ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Response Time:</span>
                    <span>{backendConnected ? "~0.8s" : "~1.2s"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Similarity Score:</span>
                    <span>{backendConnected ? "0.89" : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span
                      className={
                        backendConnected ? "text-green-500" : "text-red-500"
                      }
                    >
                      {backendConnected ? "Connected" : "Demo Mode"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backend:</span>
                    <span className="text-xs">localhost:8000</span>
                  </div>
                </div>
              </div>
            </div>

            {!backendConnected && (
              <div className="space-y-4">
                <h4 className="font-medium">Backend Setup</h4>
                <div
                  className={`p-3 rounded-lg text-xs ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <p className="mb-2 text-gray-400">
                    To enable full functionality:
                  </p>
                  <ol className="space-y-1 text-gray-500 list-decimal list-inside">
                    <li>Start your backend server</li>
                    <li>Ensure CORS is enabled</li>
                    <li>Check port 8000 is accessible</li>
                    <li>Refresh this page</li>
                  </ol>
                  <div className="p-2 mt-3 text-yellow-300 rounded bg-yellow-900/20">
                    <p className="font-medium">Common Issues:</p>
                    <p>• CORS policy blocking requests</p>
                    <p>• Backend not running on port 8000</p>
                    <p>• Firewall blocking localhost connection</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">System Info</h4>
              <div
                className={`p-3 rounded-lg text-xs ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}
              >
                <div className="space-y-1 text-gray-500">
                  <div className="flex justify-between">
                    <span>Frontend:</span>
                    <span>React 18</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Styling:</span>
                    <span>Tailwind CSS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Icons:</span>
                    <span>Lucide React</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>v1.0.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocuMind;
