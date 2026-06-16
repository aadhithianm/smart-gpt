import React, { useState, useRef } from 'react'
import { UploadCloud, File, AlertCircle } from 'lucide-react'
import { useChat } from '../../context/ChatContext'
import api from '../../api'

const UploadZone = ({ onUploadSuccess }) => {
  const { currentWorkspace } = useChat()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const uploadFile = async (file) => {
    if (!currentWorkspace) {
      setError("Please select or create a workspace first")
      return
    }
    // Client-side file size validation (Max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds maximum size of 25MB")
      return
    }
    setError(null)
    setUploading(true)
    
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await api.post(`/documents/upload?workspace_id=${currentWorkspace.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (onUploadSuccess) {
        onUploadSuccess(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please verify storage config.")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0])
    }
  }

  const onButtonClick = () => {
    fileInputRef.current.click()
  }

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
          dragActive 
            ? 'border-brand-primary bg-brand-primary/5' 
            : 'border-brand-border hover:border-gray-500 hover:bg-brand-surface/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.pptx,.txt"
          onChange={handleChange}
          disabled={uploading}
        />
        
        <div className="p-4 bg-brand-border/30 rounded-full text-brand-primary mb-4">
          <UploadCloud size={32} />
        </div>

        <p className="text-white font-medium text-sm text-center">
          {uploading ? "Uploading file..." : "Drag & drop files here or click to upload"}
        </p>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Supports: PDF, DOCX, PPTX, TXT (Max 25MB)
        </p>

        {uploading && (
          <div className="w-full max-w-[200px] bg-brand-border h-1.5 rounded-full overflow-hidden mt-4">
            <div className="bg-brand-primary h-full animate-[pulse_1.5s_infinite]" style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-4">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default UploadZone
