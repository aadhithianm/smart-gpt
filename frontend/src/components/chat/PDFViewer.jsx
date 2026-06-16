import React from 'react'
import { X, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

const PDFViewer = ({ fileUrl, fileName, page = 1, onClose }) => {
  if (!fileUrl) return null

  // Append page anchor if supplied
  const finalPdfUrl = page ? `${fileUrl}#page=${page}` : fileUrl

  return (
    <div className="h-full flex flex-col bg-brand-surface border-r border-brand-border select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-brand-border/40 px-4 flex items-center justify-between shrink-0 bg-brand-bg/50">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg shrink-0">
            <FileText size={16} />
          </div>
          <span className="text-white text-xs font-semibold truncate" title={fileName}>
            {fileName}
          </span>
          {page && (
            <span className="text-[10px] bg-brand-border px-1.5 py-0.5 rounded text-gray-400 font-semibold">
              Page {page}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-brand-border transition-colors cursor-pointer"
          title="Close Document View"
        >
          <X size={16} />
        </button>
      </div>

      {/* Embed PDF IFrame */}
      <div className="flex-1 w-full bg-brand-bg">
        <iframe
          src={finalPdfUrl}
          title="Study Resource Viewer"
          className="w-full h-full border-none"
        />
      </div>
    </div>
  )
}

export default PDFViewer
