import React, { useState, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import api from '../api'
import { Calendar, AlertCircle, Plus, CheckCircle2, Circle, Clock, Check, BarChart2 } from 'lucide-react'

const StudyPlans = () => {
  const { currentWorkspace } = useChat()
  const [documents, setDocuments] = useState([])
  const [plans, setPlans] = useState([])
  
  // Generator states
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState(7)
  const [goals, setGoals] = useState('')
  const [selectedDocs, setSelectedDocs] = useState([])
  
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Active Plan review states
  const [activePlan, setActivePlan] = useState(null)
  const [activeDay, setActiveDay] = useState(1)

  const fetchData = async () => {
    if (!currentWorkspace) return
    try {
      const docsRes = await api.get(`/documents?workspace_id=${currentWorkspace.id}`)
      setDocuments(docsRes.data)
      
      const plansRes = await api.get(`/study-plan?workspace_id=${currentWorkspace.id}`)
      setPlans(plansRes.data)
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

  const handleGeneratePlan = async (e) => {
    e.preventDefault()
    if (!title.trim() || !subject.trim()) return

    setError(null)
    setGenerating(true)
    try {
      const res = await api.post(`/study-plan/generate?workspace_id=${currentWorkspace.id}`, {
        title,
        subject,
        duration_days: duration,
        goals,
        document_ids: selectedDocs
      })
      setPlans(prev => [res.data, ...prev])
      setActivePlan(res.data)
      setActiveDay(1)
      // Reset form
      setTitle('')
      setSubject('')
      setGoals('')
      setSelectedDocs([])
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate study plan")
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleTask = async (taskId, currentStatus) => {
    if (!activePlan) return
    try {
      const res = await api.put(`/study-plan/${activePlan.id}/task`, {
        task_id: taskId,
        completed: !currentStatus
      })
      setActivePlan(res.data)
      // Update local plans list
      setPlans(prev => prev.map(p => p.id === activePlan.id ? res.data : p))
    } catch (err) {
      console.error("Failed to update task state:", err)
    }
  }

  // Get tasks filtered for the currently selected day
  const filteredTasks = activePlan?.tasks.filter(t => t.day === activeDay) || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Study Plans</h1>
        <p className="text-gray-400 text-sm mt-1">Syllabus trackers customized by Gemini 2.5 Pro</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form or Active Plan viewer */}
        <div className="lg:col-span-2 space-y-6">
          {activePlan ? (
            /* Component 11: Study Plan Calendar & Checklists */
            <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-4">
                <div>
                  <h2 className="text-white font-bold text-lg">{activePlan.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">Subject: {activePlan.subject}</p>
                </div>
                <button
                  onClick={() => setActivePlan(null)}
                  className="text-xs text-brand-primary hover:underline cursor-pointer"
                >
                  View All Plans
                </button>
              </div>

              {/* Progress Summary */}
              <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                <span className="flex items-center space-x-1.5">
                  <Clock size={14} className="text-brand-primary" />
                  <span>Duration: {activePlan.duration_days} Days</span>
                </span>
                <span className="flex items-center space-x-1 text-brand-primary">
                  <BarChart2 size={14} />
                  <span>Progress: {activePlan.progress_pct}%</span>
                </span>
              </div>
              <div className="w-full bg-brand-border h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-primary h-full transition-all duration-500" 
                  style={{ width: `${activePlan.progress_pct}%` }}
                />
              </div>

              {/* Days Navigation Timeline */}
              <div className="flex space-x-2 overflow-x-auto py-2 border-b border-brand-border/30">
                {Array.from({ length: activePlan.duration_days }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors ${
                      activeDay === day 
                        ? 'bg-brand-primary text-white' 
                        : 'bg-brand-bg/50 border border-brand-border text-gray-400 hover:text-white'
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>

              {/* Active Day Tasks List */}
              <div className="space-y-4">
                <h3 className="text-white font-bold text-sm">Day {activeDay} Objectives</h3>
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No objectives scheduled for Day {activeDay}. Rest day!</p>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className="p-4 bg-brand-bg/30 border border-brand-border rounded-xl space-y-3">
                        <div>
                          <h4 className="text-white text-xs font-bold uppercase tracking-wider">{task.title}</h4>
                          <p className="text-xs text-gray-400 mt-1">{task.description}</p>
                        </div>

                        {/* Checklist items */}
                        <div className="space-y-2 border-t border-brand-border/20 pt-2">
                          {task.checklist.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleToggleTask(item.id, item.completed)}
                              className="w-full flex items-center space-x-2.5 text-left text-xs text-gray-300 hover:text-white transition-colors py-1 cursor-pointer"
                            >
                              {item.completed ? (
                                <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                              ) : (
                                <Circle size={16} className="text-gray-500 shrink-0" />
                              )}
                              <span className={item.completed ? 'line-through text-gray-500' : ''}>
                                {item.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Study Plan Generator Form */
            <form onSubmit={handleGeneratePlan} className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center space-x-3 border-b border-brand-border/40 pb-4">
                <div className="p-2.5 bg-blue-500/10 text-brand-primary rounded-xl">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Generate Study Calendar</h2>
                  <p className="text-xs text-gray-500">Design syllabus schedules based on your target dates</p>
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
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plan Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 30-Day DSA Study Plan"
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
                    placeholder="e.g. Data Structures & Algorithms"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Duration (Days)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary"
                  >
                    {[5, 7, 14, 30, 60, 90].map(days => (
                      <option key={days} value={days} className="bg-brand-surface">{days} Days</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Goals / Description</label>
                  <textarea
                    placeholder="e.g. Prepare for exams, focus on trees and graph algorithms"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-brand-primary resize-none h-[42px]"
                  />
                </div>
              </div>

              {/* Document checklist */}
              {documents.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                    Include Library Materials
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
                {generating ? "Creating plan with Gemini 2.5 Pro..." : "Create Plan"}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Plans List */}
        <div className="space-y-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-2xl">
            <h2 className="text-white font-semibold text-sm mb-4">Schedules Library</h2>
            {plans.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto text-gray-600 mb-2" size={32} />
                <p className="text-gray-400 text-xs">No study plans created yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePlan(p)
                      setActiveDay(1)
                    }}
                    className="w-full p-3 bg-brand-bg/30 hover:bg-brand-border/40 border border-brand-border rounded-xl text-left text-xs space-y-2 transition-colors cursor-pointer block"
                  >
                    <div className="flex items-center justify-between text-white font-semibold">
                      <span className="truncate max-w-[70%]">{p.title}</span>
                      <span className="text-[10px] bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded font-bold">
                        {p.progress_pct}%
                      </span>
                    </div>
                    
                    {/* Small progress line */}
                    <div className="w-full bg-brand-border h-1 rounded-full overflow-hidden">
                      <div className="bg-brand-primary h-full" style={{ width: `${p.progress_pct}%` }} />
                    </div>

                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>{p.duration_days} Days</span>
                      <span>Subject: {p.subject}</span>
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

export default StudyPlans
