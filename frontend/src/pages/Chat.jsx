import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import MessageBubble from '../components/chat/MessageBubble'
import ChatComposer from '../components/chat/ChatComposer'
import PDFViewer from '../components/chat/PDFViewer'
import UploadZone from '../components/library/UploadZone'
import { supabase } from '../supabase'
import { Sparkles, MessageSquare, AlertCircle, X } from 'lucide-react'
import api from '../api'

const Chat = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const { 
    currentWorkspace, 
    currentSession, 
    selectSession, 
    messages, 
    setMessages,
    createSession
  } = useChat()

  const [streamingMessage, setStreamingMessage] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [error, setError] = useState(null)

  // PDF Side-by-Side View States
  const [activePdfUrl, setActivePdfUrl] = useState(null)
  const [activePdfName, setActivePdfName] = useState(null)
  const [activePdfPage, setActivePdfPage] = useState(1)

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024)
  const [activeTab, setActiveTab] = useState('chat')

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (activePdfUrl && isMobileView) {
      setActiveTab('pdf')
    }
  }, [activePdfUrl, isMobileView])

  const messagesEndRef = useRef(null)

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Sync session state from URL parameter
  useEffect(() => {
    if (sessionId) {
      // Find session in list
      const matched = selectSession({ id: sessionId })
    }
  }, [sessionId])

  const handleSendMessage = async (text) => {
    let targetSessionId = sessionId
    
    // 1. Auto-create session if none active
    if (!targetSessionId) {
      if (!currentWorkspace) {
        setError("Please select or create a workspace first")
        return
      }
      try {
        const session = await createSession()
        targetSessionId = session.id
        navigate(`/chat/${session.id}`)
      } catch (err) {
        setError("Failed to create chat session")
        return
      }
    }

    // 2. Append local User message
    const tempUserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])
    setStreamingMessage({
      role: 'assistant',
      content: '',
      sources: []
    })

    // 3. Initiate SSE Streaming Request
    try {
      setError(null)
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      
      const response = await fetch(`${baseUrl}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: targetSessionId,
          content: text
        })
      })

      if (!response.ok) {
        throw new Error("Failed to send chat query")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let assistantSources = []

      // Parse SSE stream chunks
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value)
        const lines = chunkText.split('\n')

        let currentEvent = null

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim()
          } else if (line.startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim()
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              if (currentEvent === 'citations') {
                assistantSources = data
                setStreamingMessage(prev => ({ ...prev, sources: data }))
              } else if (currentEvent === 'token') {
                assistantContent += data.text
                setStreamingMessage(prev => ({ ...prev, content: assistantContent }))
              } else if (currentEvent === 'error') {
                setError(data.error)
              }
            } catch (err) {
              // Ignore line parse anomalies
            }
          }
        }
      }

      // Finish streaming and append permanent assistant message log
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        sources: assistantSources,
        created_at: new Date().toISOString()
      }])
      setStreamingMessage(null)

    } catch (err) {
      setError(err.message || "Something went wrong. Verify your API server is running.")
      setStreamingMessage(null)
    }
  }

  // Handle clickable citation reference jumps
  const handleCitationClick = async (citation) => {
    try {
      // 1. Fetch document path from database with workspace filter
      const res = await api.get(`/documents?workspace_id=${currentWorkspace.id}`)
      // Match document in current list
      const matchedDoc = res.data.find(d => d.id === citation.document_id)
      
      if (matchedDoc) {
        // 2. Retrieve secure signed URL for doc from Supabase Storage (supporting private buckets)
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(matchedDoc.file_path, 3600)
          
        if (error) throw error
          
        setActivePdfUrl(data.signedUrl)
        setActivePdfName(matchedDoc.file_name)
        setActivePdfPage(citation.page_number || 1)
      }
    } catch (err) {
      console.error("Failed to load source file:", err)
    }
  }

  return (
    <div className="h-full w-full flex overflow-hidden relative">
      
      {/* Tab bar header for mobile screens when PDF is active */}
      {activePdfUrl && isMobileView && (
        <div className="absolute top-0 inset-x-0 h-12 border-b border-brand-border bg-brand-surface flex items-center justify-around z-30">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 h-full text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'chat' ? 'border-brand-primary text-white' : 'border-transparent text-gray-400'
            }`}
          >
            Chat Discussion
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 h-full text-xs font-bold transition-colors border-b-2 truncate px-2 ${
              activeTab === 'pdf' ? 'border-brand-primary text-white' : 'border-transparent text-gray-400'
            }`}
          >
            PDF: {activePdfName}
          </button>
        </div>
      )}

      {/* PDF Viewer Pane */}
      {activePdfUrl && (
        isMobileView ? (
          activeTab === 'pdf' && (
            <div className="flex-1 h-full pt-12">
              <PDFViewer 
                fileUrl={activePdfUrl} 
                fileName={activePdfName}
                page={activePdfPage}
                onClose={() => {
                  setActivePdfUrl(null)
                  setActivePdfName(null)
                  setActiveTab('chat')
                }}
              />
            </div>
          )
        ) : (
          <div className="w-[50%] h-full shrink-0 border-r border-brand-border">
            <PDFViewer 
              fileUrl={activePdfUrl} 
              fileName={activePdfName}
              page={activePdfPage}
              onClose={() => {
                setActivePdfUrl(null)
                setActivePdfName(null)
              }}
            />
          </div>
        )
      )}

      {/* AI Chat Logs Area */}
      {(!isMobileView || !activePdfUrl || activeTab === 'chat') && (
        <div className={`flex-1 h-full flex flex-col justify-between bg-brand-bg relative ${
          activePdfUrl && isMobileView ? 'pt-12' : ''
        }`}>
          
          {/* Messages list view */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scroll-touch">
            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl max-w-2xl mx-auto">
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            {messages.length === 0 && !streamingMessage ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-xl mx-auto space-y-4">
                <div className="p-4 bg-brand-surface border border-brand-border text-brand-primary rounded-2xl shadow-xl">
                  <Sparkles size={36} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">Ask StudyGPT anything</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Choose search modes, upload lecture materials, and type your syllabus question. 
                  Reference citations will slide open side-by-side automatically.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {messages.map((msg) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg}
                    onCitationClick={handleCitationClick}
                  />
                ))}
                {streamingMessage && (
                  <MessageBubble 
                    message={streamingMessage}
                    onCitationClick={handleCitationClick}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Composer Box */}
          <div className="p-4 sm:p-6 border-t border-brand-border/30 bg-brand-surface/20 shrink-0">
            <div className="max-w-4xl mx-auto">
              <ChatComposer 
                onSendMessage={handleSendMessage}
                onOpenUpload={() => setShowUploadModal(true)}
              />
            </div>
          </div>

        </div>
      )}

      {/* Upload zone overlay modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border p-6 rounded-2xl max-w-md w-full relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-white font-bold text-lg mb-4">Upload Study Source</h3>
            <UploadZone onUploadSuccess={() => setShowUploadModal(false)} />
          </div>
        </div>
      )}

    </div>
  )
}

export default Chat
