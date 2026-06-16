import React, { useState, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import api from '../api'
import { GraduationCap, AlertCircle, Sparkles, Plus, Eye, HelpCircle, Check, X, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Flashcards = () => {
  const { currentWorkspace } = useChat()
  const [documents, setDocuments] = useState([])
  const [decks, setDecks] = useState([])
  
  // Deck generator inputs
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedDocs, setSelectedDocs] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Active Review Session states
  const [activeDeck, setActiveDeck] = useState(null)
  const [dueCards, setDueCards] = useState([])
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  const fetchData = async () => {
    if (!currentWorkspace) return
    try {
      const docsRes = await api.get(`/documents?workspace_id=${currentWorkspace.id}`)
      setDocuments(docsRes.data)
      
      const decksRes = await api.get(`/flashcards/deck?workspace_id=${currentWorkspace.id}`)
      setDecks(decksRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentWorkspace])

  const handleDocToggle = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  const handleGenerateDeck = async (e) => {
    e.preventDefault()
    if (!title.trim() || !subject.trim()) return

    setError(null)
    setGenerating(true)
    try {
      const res = await api.post(`/flashcards/deck?workspace_id=${currentWorkspace.id}`, {
        title,
        subject,
        document_ids: selectedDocs
      })
      setDecks(prev => [res.data, ...prev])
      startReviewSession(res.data)
      // Reset
      setTitle('')
      setSubject('')
      setSelectedDocs([])
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate deck")
    } finally {
      setGenerating(false)
    }
  }

  const startReviewSession = async (deck) => {
    setActiveDeck(deck)
    setReviewing(true)
    setCurrentCardIdx(0)
    setFlipped(false)
    try {
      const res = await api.get(`/flashcards/deck/${deck.id}/review`)
      setDueCards(res.data)
    } catch (err) {
      console.error(err)
      setError("Failed to load review cards")
    }
  }

  const handleGradeCard = async (remembered) => {
    const activeCard = dueCards[currentCardIdx]
    if (!activeCard) return

    try {
      await api.post(`/flashcards/review`, {
        flashcard_id: activeCard.id,
        remembered
      })
      
      // Animate next card transition
      setFlipped(false)
      setTimeout(() => {
        setCurrentCardIdx(prev => prev + 1)
      }, 200)
      
    } catch (err) {
      console.error("Failed to grade card:", err)
    }
  }

  const activeCard = dueCards[currentCardIdx]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Spaced Repetition Flashcards</h1>
        <p className="text-gray-400 text-sm mt-1">Active recall decks based on the Leitner review box scheduling</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Form or Interactive reviewer */}
        <div className="lg:col-span-2 space-y-6">
          {reviewing ? (
            /* Spaced Repetition card swiper */
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl relative space-y-6">
              
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-4">
                <div>
                  <h2 className="text-white font-bold text-base">{activeDeck.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">Review Cards Queue</p>
                </div>
                <button
                  onClick={() => setReviewing(false)}
                  className="text-xs text-brand-primary hover:underline cursor-pointer"
                >
                  Exit Review
                </button>
              </div>

              {dueCards.length === 0 ? (
                /* Inbox Zero State */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                    <Check size={32} />
                  </div>
                  <h3 className="text-white font-bold text-lg">Inbox Zero!</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    All cards in this deck are reviewed. Come back tomorrow for your next study list!
                  </p>
                </div>
              ) : currentCardIdx >= dueCards.length ? (
                /* Completed State */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-blue-500/10 text-brand-primary border border-blue-500/20 rounded-full animate-bounce">
                    <GraduationCap size={32} />
                  </div>
                  <h3 className="text-white font-bold text-lg">Deck Complete!</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Great job! You have reviewed all scheduled cards in this deck.
                  </p>
                  <button
                    onClick={() => startReviewSession(activeDeck)}
                    className="flex items-center space-x-2 px-4 py-2 border border-brand-border hover:bg-brand-border rounded-xl text-xs text-white cursor-pointer transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>Review Again</span>
                  </button>
                </div>
              ) : (
                /* Card Flipper */
                <div className="flex flex-col items-center justify-center space-y-8 py-4">
                  
                  {/* Progress Indicator */}
                  <span className="text-xs text-gray-500 font-semibold tracking-widest uppercase">
                    Card {currentCardIdx + 1} of {dueCards.length}
                  </span>

                  {/* Flipping Box Card wrapper */}
                  <div 
                    onClick={() => setFlipped(!flipped)}
                    className="w-full max-w-md h-64 cursor-pointer relative perspective-1000"
                  >
                    <motion.div
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={{ duration: 0.5 }}
                      style={{ transformStyle: 'preserve-3d' }}
                      className="w-full h-full rounded-2xl border border-brand-border relative shadow-2xl"
                    >
                      {/* Front text panel */}
                      <div 
                        style={{ backfaceVisibility: 'hidden' }}
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-brand-bg/50 ${flipped ? 'pointer-events-none' : ''}`}
                      >
                        <HelpCircle size={32} className="text-brand-primary/40 mb-4" />
                        <p className="text-white text-base font-semibold leading-relaxed">
                          {activeCard?.front}
                        </p>
                        <span className="absolute bottom-4 text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center space-x-1.5">
                          <Eye size={12} />
                          <span>Click to reveal answer</span>
                        </span>
                      </div>

                      {/* Back text panel */}
                      <div 
                        style={{ 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                        className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-brand-surface ${!flipped ? 'pointer-events-none' : ''}`}
                      >
                        <Check size={32} className="text-green-500/40 mb-4" />
                        <p className="text-gray-200 text-sm leading-relaxed">
                          {activeCard?.back}
                        </p>
                        <span className="absolute bottom-4 text-[10px] text-gray-500 font-medium">
                          SRS Level: Leitner Box {activeCard?.box}
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Rating Review Actions */}
                  {flipped && (
                    <div className="flex space-x-4 w-full max-w-md">
                      <button
                        onClick={() => handleGradeCard(false)}
                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold rounded-xl cursor-pointer transition-colors text-xs"
                      >
                        <X size={16} />
                        <span>Forgot (Box 1)</span>
                      </button>

                      <button
                        onClick={() => handleGradeCard(true)}
                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-bold rounded-xl cursor-pointer transition-colors text-xs"
                      >
                        <Check size={16} />
                        <span>Remembered</span>
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            /* Deck Generator Form */
            <form onSubmit={handleGenerateDeck} className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-6">
              
              <div className="flex items-center space-x-3 border-b border-brand-border/40 pb-4">
                <div className="p-2.5 bg-blue-500/10 text-brand-primary rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Generate Flashcards</h2>
                  <p className="text-xs text-gray-500">Create target active recall decks based on your library uploads</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deck Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operating Systems Core terms"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Document checklist */}
              {documents.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                    Select Reference Materials
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border border-brand-border/60 rounded-xl p-3 bg-brand-bg/25">
                    {documents.map((doc) => (
                      <label 
                        key={doc.id}
                        className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer hover:text-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={() => handleDocToggle(doc.id)}
                          className="rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="truncate">{doc.file_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50"
              >
                {generating ? "Generating with Gemini..." : "Generate Deck"}
              </button>
            </form>
          )}
        </div>

        {/* Right: Decks List */}
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-2xl">
            <h2 className="text-white font-semibold text-sm mb-4">Decks Library</h2>
            {decks.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="mx-auto text-gray-600 mb-2" size={32} />
                <p className="text-gray-400 text-xs">No decks generated yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => startReviewSession(deck)}
                    className="w-full p-3 bg-brand-bg/30 hover:bg-brand-border/40 border border-brand-border rounded-xl text-left text-xs space-y-1.5 transition-colors cursor-pointer block"
                  >
                    <div className="flex items-center justify-between text-white font-semibold">
                      <span className="truncate max-w-[70%]">{deck.title}</span>
                      <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase">
                        Review
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>Subject: {deck.subject}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

export default Flashcards
