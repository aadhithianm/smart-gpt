import React, { useState, useEffect } from 'react'
import api from '../api'
import { BarChart3, Hourglass, HelpCircle, GraduationCap, Award, CheckCircle2, TrendingUp } from 'lucide-react'

const Analytics = () => {
  const [profileStats, setProfileStats] = useState(null)
  const [subjectStats, setSubjectStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const statsRes = await api.get('/analytics/stats')
        setProfileStats(statsRes.data)

        const subjectRes = await api.get('/analytics/subject')
        setSubjectStats(subjectRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const getScoreColor = (score) => {
    if (score >= 80) return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', fill: 'bg-green-500' }
    if (score >= 70) return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', fill: 'bg-blue-500' }
    if (score >= 50) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', fill: 'bg-orange-500' }
    return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', fill: 'bg-red-500' }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    )
  }

  const metricCards = [
    { 
      name: "Study Hours", 
      value: profileStats?.study_hours_estimated?.toFixed(1) || "0.0", 
      desc: "Time spent in reviews", 
      icon: Hourglass, 
      color: "text-blue-400" 
    },
    { 
      name: "Quizzes Completed", 
      value: profileStats?.total_quizzes || 0, 
      desc: "Evaluations submitted", 
      icon: HelpCircle, 
      color: "text-brand-primary" 
    },
    { 
      name: "Average Accuracy", 
      value: `${profileStats?.accuracy_average || 0}%`, 
      desc: "Overall quiz score", 
      icon: Award, 
      color: "text-green-400" 
    },
    { 
      name: "Uploaded materials", 
      value: profileStats?.total_documents || 0, 
      desc: "Syllabus files indexed", 
      icon: GraduationCap, 
      color: "text-purple-400" 
    }
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Learning Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Visualize your active recall accuracy and study metrics</p>
      </div>

      {/* Grid of Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.name} className="bg-brand-surface border border-brand-border p-5 rounded-2xl shadow-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{card.name}</span>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <span className="text-[10px] text-gray-400 block">{card.desc}</span>
              </div>
              <div className={`p-3 bg-brand-border/40 rounded-xl ${card.color}`}>
                <Icon size={22} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Subject Performance Breakdown Section */}
      <div className="space-y-4">
        <h2 className="text-white font-bold text-lg flex items-center space-x-2">
          <TrendingUp className="text-brand-primary" size={20} />
          <span>Subject Breakdown</span>
        </h2>
        
        {subjectStats.length === 0 ? (
          <div className="border border-brand-border bg-brand-surface/20 rounded-2xl p-12 text-center text-gray-500">
            <BarChart3 className="mx-auto mb-3 text-gray-600" size={36} />
            <p className="text-sm">No analytics available yet</p>
            <p className="text-xs mt-1">Submit quiz attempts to populate subject diagnostics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectStats.map((sub) => {
              const theme = getScoreColor(sub.accuracy)
              return (
                <div key={sub.subject} className="bg-brand-surface border border-brand-border rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm truncate max-w-[65%]">{sub.subject}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.bg} ${theme.text} ${theme.border}`}>
                      {sub.accuracy}% Accuracy
                    </span>
                  </div>

                  {/* Score progress bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-brand-bg/50 border border-brand-border/40 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${theme.fill}`} style={{ width: `${sub.accuracy}%` }} />
                    </div>
                  </div>

                  {/* Detail items */}
                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-2 border-t border-brand-border/30">
                    <span className="flex items-center space-x-1">
                      <Hourglass size={12} />
                      <span>{sub.hours_studied.toFixed(1)} hrs studied</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <CheckCircle2 size={12} />
                      <span>{sub.quizzes_completed} Quizzes</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

export default Analytics
