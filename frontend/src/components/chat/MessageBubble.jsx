import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Sparkles, User, FileText, ChevronRight, Copy, Check } from 'lucide-react'
import 'katex/dist/katex.min.css' // Style math equations

// Custom code block component with syntax highlighting and copy-to-clipboard functionality
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  // Pure token-based tokenizer for python and javascript syntax highlighting
  const tokenize = (code, lang) => {
    const l = lang ? lang.toLowerCase() : ''
    
    // Define token patterns (anchored at the start of string)
    const tokenSpecs = [
      // comment:
      [l === 'python' || l === 'py' ? /^#.*/ : /^(\/\/.*|\/\*[\s\S]*?\*\/)/, 'comment', 'text-gray-500 italic'],
      // string:
      [/^(["'`])(?:\\.|[^\\])*?\1/, 'string', 'text-amber-300'],
      // number:
      [/^\b\d+\b/, 'number', 'text-emerald-400'],
      // keyword:
      [
        l === 'python' || l === 'py'
          ? /^\b(def|class|import|from|as|return|if|elif|else|for|while|in|is|not|and|or|try|except|finally|with|print|lambda|True|False|None)\b/
          : /^\b(const|let|var|function|class|import|export|default|from|return|if|else|for|while|in|of|try|catch|finally|console|log|true|false|null|undefined|async|await)\b/,
        'keyword',
        'text-blue-400 font-semibold'
      ],
      // identifier/function call:
      [/^\b[a-zA-Z_][a-zA-Z0-9_]*(?=\()/, 'function', 'text-indigo-300'],
      // generic word:
      [/^[a-zA-Z_][a-zA-Z0-9_]*/, 'word', 'text-gray-200'],
      // whitespace (important: match spaces and newlines correctly):
      [/^\s+/, 'whitespace', ''],
      // operators/symbols:
      [/^./, 'operator', 'text-gray-400']
    ]

    let remaining = code
    const elements = []
    let key = 0

    while (remaining.length > 0) {
      let matched = false
      for (const [regex, type, cssClass] of tokenSpecs) {
        const match = regex.exec(remaining)
        if (match && match.index === 0) {
          const text = match[0]
          remaining = remaining.substring(text.length)
          if (cssClass) {
            elements.push(
              <span key={key++} className={cssClass}>
                {text}
              </span>
            )
          } else {
            elements.push(text)
          }
          matched = true
          break
        }
      }
      if (!matched) {
        elements.push(remaining[0])
        remaining = remaining.substring(1)
      }
    }
    return elements
  }

  return (
    <div className="my-4 rounded-xl border border-brand-border/80 bg-gray-950 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/60 border-b border-brand-border/60 text-xs text-gray-400 select-none">
        <span className="font-mono uppercase tracking-wider text-[10px] font-bold text-gray-500">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-gray-100 whitespace-pre">
        {tokenize(value, language)}
      </pre>
    </div>
  )
}

const MessageBubble = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full space-x-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-brand-primary flex items-center justify-center shrink-0 border border-blue-500/20 animate-pulse">
          <Sparkles size={16} />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`max-w-[85%] rounded-2xl p-4 shadow-md border transition-all duration-300 hover:shadow-lg ${
        isUser 
          ? 'bg-brand-primary border-brand-primary/20 text-white rounded-tr-none' 
          : 'bg-brand-surface border-brand-border text-gray-200 rounded-tl-none'
      }`}>
        
        {/* Text Content */}
        <div className="text-sm leading-relaxed overflow-x-auto">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mt-5 mb-3 first:mt-0 tracking-tight" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0 tracking-tight border-b border-brand-border/40 pb-1" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-md font-semibold text-white mt-3 mb-1 first:mt-0 tracking-tight" {...props} />,
                p: ({ node, ...props }) => <p className="mb-3.5 last:mb-0 leading-relaxed text-gray-300" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3.5 space-y-1.5 text-gray-300" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3.5 space-y-1.5 text-gray-300" {...props} />,
                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-brand-primary/60 pl-4 py-1.5 my-3 bg-brand-border/20 text-gray-300 rounded-r-lg italic" {...props} />
                ),
                pre: ({ children }) => <>{children}</>,
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !className
                  
                  if (isInline) {
                    return (
                      <code className="bg-gray-850/80 text-blue-400 px-1.5 py-0.5 rounded text-[13px] font-mono border border-gray-700/50" {...props}>
                        {children}
                      </code>
                    )
                  }
                  
                  return (
                    <CodeBlock 
                      language={match ? match[1] : ''} 
                      value={String(children).replace(/\n$/, '')} 
                      {...props}
                    />
                  )
                },
                a: ({ node, ...props }) => <a className="text-brand-primary hover:underline font-medium transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                table: ({ node, ...props }) => <table className="w-full text-left border-collapse my-4 text-xs border border-brand-border/40" {...props} />,
                thead: ({ node, ...props }) => <thead className="bg-brand-border/30 border-b border-brand-border" {...props} />,
                tbody: ({ node, ...props }) => <tbody className="divide-y divide-brand-border/40" {...props} />,
                tr: ({ node, ...props }) => <tr className="hover:bg-brand-border/10 transition-colors" {...props} />,
                th: ({ node, ...props }) => <th className="p-3 font-semibold text-gray-200" {...props} />,
                td: ({ node, ...props }) => <td className="p-3 text-gray-300" {...props} />,
              }}
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

