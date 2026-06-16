import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Sparkles, User, FileText, ChevronRight } from 'lucide-react'
import 'katex/dist/katex.min.css' // Style math equations

const MessageBubble = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full space-x-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-brand-primary flex items-center justify-center shrink-0 border border-blue-500/20">
          <Sparkles size={16} />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
        isUser 
          ? 'bg-brand-primary border-brand-primary/20 text-white rounded-tr-none' 
          : 'bg-brand-surface border-brand-border text-gray-200 rounded-tl-none'
      }`}>
        
        {/* Text Content */}
        <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed overflow-x-auto">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Source Citations Log */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 border-t border-brand-border/40 pt-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Sources</span>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src, idx) => (
                <button
                  key={src.id || idx}
                  onClick={() => onCitationClick && onCitationClick(src)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-brand-border/30 hover:bg-brand-border/80 border border-brand-border/60 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg text-xs cursor-pointer transition-colors max-w-[200px]"
                >
                  <FileText size={10} className="text-brand-primary" />
                  <span className="truncate">{src.source_name}</span>
                  {src.page_number && (
                    <span className="text-[10px] text-gray-500 font-semibold">p.{src.page_number}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-brand-border text-gray-400 flex items-center justify-center shrink-0 border border-brand-border overflow-hidden">
          <User size={16} />
        </div>
      )}

    </div>
  )
}

export default MessageBubble
