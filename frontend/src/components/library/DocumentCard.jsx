import React from 'react'
import { FileText, Trash2, Calendar, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react'

const DocumentCard = ({ doc, onDelete }) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getMimeLabel = (mime) => {
    if (mime.includes('pdf')) return 'PDF'
    if (mime.includes('word') || mime.includes('docx')) return 'DOCX'
    if (mime.includes('presentation') || mime.includes('pptx')) return 'PPTX'
    return 'TXT'
  }

  return (
    <div className="bg-brand-surface border border-brand-border hover:border-gray-700 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden group">
      
      {/* File Top Detail */}
      <div>
        <div className="flex items-start justify-between">
          <div className="p-3 bg-brand-border/40 text-brand-primary rounded-xl">
            <FileText size={20} />
          </div>
          <button
            onClick={() => onDelete(doc.id)}
            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-brand-border/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Document"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <h3 className="text-white font-semibold text-sm mt-4 truncate" title={doc.file_name}>
          {doc.file_name}
        </h3>

        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <HardDrive size={12} />
            <span>{formatBytes(doc.file_size)}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Calendar size={12} />
            <span>{formatDate(doc.created_at)}</span>
          </span>
        </div>
      </div>

      {/* Progress & Processing States */}
      <div className="mt-6 border-t border-brand-border/30 pt-4">
        {doc.status === 'indexed' && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Indexed</span>
            <span className="flex items-center space-x-1 text-green-400 font-bold">
              <CheckCircle size={12} />
              <span>100%</span>
            </span>
          </div>
        )}

        {doc.status === 'processing' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-primary font-medium animate-pulse">Extracting text...</span>
              <span className="text-gray-400">50%</span>
            </div>
            <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-primary h-full animate-[pulse_1s_infinite]" style={{ width: '50%' }} />
            </div>
          </div>
        )}

        {doc.status === 'pending' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">In Queue...</span>
              <span className="text-gray-500">0%</span>
            </div>
            <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-border h-full" style={{ width: '0%' }} />
            </div>
          </div>
        )}

        {doc.status === 'failed' && (
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="font-medium">Processing Failed</span>
            <AlertTriangle size={14} />
          </div>
        )}
      </div>

      {/* Badges/Tags */}
      <div className="flex space-x-1.5 mt-3">
        <span className="text-[10px] px-2 py-0.5 bg-brand-border/40 text-gray-400 rounded-full font-medium">
          #{getMimeLabel(doc.mime_type)}
        </span>
        <span className="text-[10px] px-2 py-0.5 bg-brand-border/40 text-gray-400 rounded-full font-medium">
          #Study
        </span>
      </div>

    </div>
  )
}

export default DocumentCard
