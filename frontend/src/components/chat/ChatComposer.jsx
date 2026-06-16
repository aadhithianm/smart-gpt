import React, { useState, useRef } from 'react'
import { Send, Upload, Mic, Globe2, FolderLock, Sparkles } from 'lucide-react'
import { useChat } from '../../context/ChatContext'

const ChatComposer = ({ onSendMessage, onOpenUpload }) => {
  const { searchMode, setSearchMode } = useChat()
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if (!inputText.trim()) return
    onSendMessage(inputText)
    setInputText('')
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleTextareaInput = (e) => {
    // Auto grow textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const toggleVoice = () => {
    // Basic transcription mock trigger
    setIsRecording(!isRecording)
    if (!isRecording) {
      setTimeout(() => {
        setInputText("Explain how virtual memory paging works.")
        setIsRecording(false)
      }, 2000)
    }
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-2xl relative">
      <textarea
        ref={textareaRef}
        rows={1}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onInput={handleTextareaInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about any subject..."
        className="w-full bg-transparent text-white text-sm outline-none resize-none pr-12 pl-2 max-h-[200px]"
      />

      <div className="flex items-center justify-between border-t border-brand-border/40 mt-3 pt-3">
        {/* Left Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenUpload}
            className="p-2 text-gray-400 hover:text-white bg-brand-border/30 hover:bg-brand-border/60 rounded-xl cursor-pointer transition-colors"
            title="Upload Study Material"
          >
            <Upload size={16} />
          </button>
          
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-xl cursor-pointer transition-colors ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'text-gray-400 hover:text-white bg-brand-border/30 hover:bg-brand-border/60'
            }`}
            title={isRecording ? "Listening..." : "Voice Input"}
          >
            <Mic size={16} className={isRecording ? "animate-pulse" : ""} />
          </button>
        </div>

        {/* Right Action: Send */}
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim()}
          className="p-2.5 bg-brand-primary hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-brand-primary text-white rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

export default ChatComposer
