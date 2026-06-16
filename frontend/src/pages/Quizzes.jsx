import React, { useState, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import api from '../api'
import { FileQuestion, AlertCircle, Sparkles, Check, X, ArrowRight, HelpCircle } from 'lucide-react'

const Quizzes = () => {
  const { currentWorkspace } = useChat()
  const [documents, setDocuments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  
  // Quiz Generator settings
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [quizType, setQuizType] = useState('mcq')
  const [numQuestions, setNumQuestions] = useState(5)
  const [selectedDocs, setSelectedDocs] = useState([])
  
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Active Quiz taking states
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // {q_id: selected_option}
  const [quizResult, setQuizResult] = useState(null) // attempt response containing score
  const [submitting, setSubmitting] = useState(false)

  // Fetch quizzes and documents
  const fetchData = async () => {
    if (!currentWorkspace) return
    try {
      const docsRes = await api.get(`/documents?workspace_id=${currentWorkspace.id}`)
      setDocuments(docsRes.data)
      
      const quizRes = await api.get(`/quiz?workspace_id=${currentWorkspace.id}`)
      setQuizzes(quizRes.data)
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

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!subject.trim()) return
    
    setError(null)
    setGenerating(true)
    try {
      const res = await api.post(`/quiz/generate?workspace_id=${currentWorkspace.id}`, {
        subject,
        difficulty,
        quiz_type: quizType,
        number_of_questions: numQuestions,
        document_ids: selectedDocs
      })
      setQuizzes(prev => [res.data, ...prev])
      setActiveQuiz(res.data)
      setCurrentQuestionIdx(0)
      setSelectedAnswers({})
      setQuizResult(null)
      // reset form
      setSubject('')
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate quiz")
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectOption = (questionId, option) => {
    if (quizResult) return // Read-only after grading
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }))
  }

  const handleSubmitQuiz = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post(`/quiz/${activeQuiz.id}/attempt`, {
        answers: selectedAnswers
      })
      setQuizResult(res.data)
      fetchData() // Refresh analytics and metrics
    } catch (err) {
      setError("Failed to grade quiz")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide">AI Quizzes</h1>
        <p className="text-gray-400 text-sm mt-1">Generate dynamic exam preps and review questions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Generator Form or Quiz Playing */}
        <div className="lg:col-span-2 space-y-6">
          {activeQuiz ? (
            /* Component 10: Quiz Question Preview & Play */
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-4 mb-4">
                <h2 className="text-white font-bold text-base truncate max-w-[70%]">{activeQuiz.title}</h2>
                <button 
                  onClick={() => setActiveQuiz(null)}
                  className="text-xs text-brand-primary hover:underline cursor-pointer"
                >
                  Exit Quiz
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                {quizResult && <span className="text-brand-primary">Graded: {quizResult.score}%</span>}
              </div>
              <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden mb-6">
                <div 
                  className="bg-brand-primary h-full transition-all duration-300" 
                  style={{ width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="mb-6">
                <span className="text-xs text-brand-primary font-bold uppercase tracking-wider block mb-1">Question</span>
                <p className="text-white text-base font-semibold leading-relaxed">
                  {activeQuiz.questions[currentQuestionIdx]?.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {activeQuiz.questions[currentQuestionIdx]?.options ? (
                  activeQuiz.questions[currentQuestionIdx].options.map((opt) => {
                    const qId = activeQuiz.questions[currentQuestionIdx].id
                    const isSelected = selectedAnswers[qId] === opt
                    const correctOpt = activeQuiz.questions[currentQuestionIdx].correct
                    const isCorrectAnswer = opt === correctOpt
                    
                    // Style modifiers for graded quiz state
                    let optionStyle = "border-brand-border bg-brand-bg/40 text-gray-300 hover:border-gray-600 hover:text-white"
                    if (isSelected) optionStyle = "border-brand-primary bg-brand-primary/10 text-white"
                    
                    if (quizResult) {
                      if (isCorrectAnswer) {
                        optionStyle = "border-green-500 bg-green-500/10 text-green-300"
                      } else if (isSelected && !isCorrectAnswer) {
                        optionStyle = "border-red-500 bg-red-500/10 text-red-300"
                      } else {
                        optionStyle = "border-brand-border/40 bg-brand-bg/10 text-gray-600 cursor-not-allowed"
                      }
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(qId, opt)}
                        disabled={!!quizResult}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border text-left text-sm cursor-pointer transition-all ${optionStyle}`}
                      >
                        <span>{opt}</span>
                        {quizResult && isCorrectAnswer && <Check size={16} className="text-green-500" />}
                        {quizResult && isSelected && !isCorrectAnswer && <X size={16} className="text-red-500" />}
                      </button>
                    )
                  })
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Write your answer
                    </label>
                    <textarea
                      disabled={!!quizResult}
                      value={selectedAnswers[activeQuiz.questions[currentQuestionIdx].id] || ''}
                      onChange={(e) => handleSelectOption(activeQuiz.questions[currentQuestionIdx].id, e.target.value)}
                      placeholder="Type your explanation or short answer here..."
                      className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary resize-none h-24"
                    />
                    {quizResult && (
                      <div className="text-xs text-brand-primary mt-2">
                        Correct Answer Guide: <span className="text-gray-300">{activeQuiz.questions[currentQuestionIdx].correct}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Explanation Drawer / Box (Component 10 detail) */}
              {quizResult && (
                <div className="bg-brand-border/20 border border-brand-border rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-2 text-brand-primary mb-2">
                    <HelpCircle size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Explanation</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {activeQuiz.questions[currentQuestionIdx]?.explanation}
                  </p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2 border border-brand-border rounded-xl text-xs text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  Previous
                </button>

                {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-4 py-2 bg-brand-border text-white text-xs rounded-xl hover:bg-brand-border/80 cursor-pointer"
                  >
                    Next
                  </button>
                ) : !quizResult ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 cursor-pointer"
                  >
                    {submitting ? "Grading..." : "Submit Quiz"}
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="px-5 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 cursor-pointer"
                  >
                    Close Result
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Component 9: Quiz Generator Form */
            <form onSubmit={handleGenerate} className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center space-x-3 border-b border-brand-border/40 pb-4">
                <div className="p-2.5 bg-blue-500/10 text-brand-primary rounded-xl">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Generate Study Quiz</h2>
                  <p className="text-xs text-gray-500">Create target evaluations based on syllabus topics or PDF notes</p>
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
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject / Topic</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPU Scheduling Algorithms"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                  <div className="flex bg-brand-bg border border-brand-border p-1 rounded-xl">
                    {['easy', 'medium', 'hard'].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-all ${
                          difficulty === diff 
                            ? 'bg-brand-primary text-white shadow' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Questions Count</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  >
                    {[3, 5, 10, 15, 20].map(cnt => (
                      <option key={cnt} value={cnt} className="bg-brand-surface">{cnt} Questions</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quiz Type</label>
                  <select
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  >
                    <option value="mcq" className="bg-brand-surface">Multiple Choice Questions (MCQs)</option>
                    <option value="short_answer" className="bg-brand-surface">Short Answer Questions</option>
                    <option value="exam_paper" className="bg-brand-surface">Exam Paper Mockup</option>
                  </select>
                </div>
              </div>

              {/* File selection checklist */}
              {documents.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                    Ground Quiz in Materials (Optional)
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
                {generating ? "Generating with Gemini..." : "Generate Quiz"}
              </button>
            </form>
          )}
        </div>

        {/* Right: History List */}
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-2xl">
            <h2 className="text-white font-semibold text-sm mb-4">Quiz Library</h2>
            {quizzes.length === 0 ? (
              <div className="text-center py-8">
                <FileQuestion className="mx-auto text-gray-600 mb-2" size={32} />
                <p className="text-gray-400 text-xs">No quizzes generated yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    onClick={() => {
                      setActiveQuiz(quiz)
                      setCurrentQuestionIdx(0)
                      setSelectedAnswers({})
                      setQuizResult(null)
                    }}
                    className="w-full p-3 bg-brand-bg/30 hover:bg-brand-border/40 border border-brand-border rounded-xl text-left text-xs space-y-1.5 transition-colors cursor-pointer block"
                  >
                    <div className="flex items-center justify-between text-white font-semibold">
                      <span className="truncate max-w-[70%]">{quiz.subject}</span>
                      <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded uppercase">
                        {quiz.difficulty}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>{quiz.questions.length} Questions</span>
                      <span>Type: {quiz.quiz_type.toUpperCase()}</span>
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

export default Quizzes
