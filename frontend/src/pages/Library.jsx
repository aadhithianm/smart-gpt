import React, { useState, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import UploadZone from '../components/library/UploadZone'
import DocumentCard from '../components/library/DocumentCard'
import api from '../api'
import { Search, FolderOpen, RefreshCw } from 'lucide-react'

const Library = () => {
  const { currentWorkspace } = useChat()
  const [documents, setDocuments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch documents list
  const fetchDocuments = async (showLoading = true) => {
    if (!currentWorkspace) return
    if (showLoading) setLoading(true)
    try {
      const res = await api.get(`/documents?workspace_id=${currentWorkspace.id}`)
      setDocuments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Refetch when workspace changes
  useEffect(() => {
    fetchDocuments(true)
  }, [currentWorkspace])

  // Polling setup: If any document is pending/processing, poll status every 4 seconds
  useEffect(() => {
    const activeProcessing = documents.some(d => d.status === 'processing' || d.status === 'pending')
    if (activeProcessing) {
      const interval = setInterval(() => {
        fetchDocuments(false)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [documents])

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return
    try {
      await api.delete(`/documents/${docId}`)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch (err) {
      console.error(err)
    }
  }

  const handleUploadSuccess = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev])
  }

  // Filter documents by search string
  const filteredDocs = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Study Library</h1>
          <p className="text-gray-400 text-sm mt-1">
            Upload study resources into <span className="text-brand-primary font-semibold">{currentWorkspace?.name || 'Workspace'}</span>
          </p>
        </div>
        
        {/* Search Input */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-brand-surface border border-brand-border text-white text-xs pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-brand-primary w-64 transition-colors"
            />
          </div>
          
          <button 
            onClick={() => fetchDocuments(true)}
            className="p-2.5 bg-brand-surface border border-brand-border text-gray-400 hover:text-white rounded-xl hover:bg-brand-border transition-colors cursor-pointer"
            title="Refresh Library"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Col: Upload Zone */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-4 shadow-xl">
            <h2 className="text-white font-semibold text-sm">Add Resource</h2>
            <UploadZone onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>

        {/* Right Col: Documents Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="h-64 border border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-brand-surface/20">
              <FolderOpen size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-300 font-semibold">No materials uploaded yet</p>
              <p className="text-gray-500 text-xs mt-1">Upload files on the left to start grounding your AI study sessions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDocs.map(doc => (
                <DocumentCard 
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

export default Library
