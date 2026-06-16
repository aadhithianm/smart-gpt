import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

const ChatContext = createContext({})

export const ChatProvider = ({ children }) => {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [currentWorkspace, setCurrentWorkspace] = useState(null)
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [searchMode, setSearchMode] = useState('hybrid') // 'materials' | 'web' | 'hybrid'
  const [loading, setLoading] = useState(false)

  // Fetch workspaces when user logs in
  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    } else {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setSessions([])
      setCurrentSession(null)
    }
  }, [user])

  // Fetch sessions when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchSessions()
      setCurrentSession(null)
      setMessages([])
    } else {
      setSessions([])
      setCurrentSession(null)
      setMessages([])
    }
  }, [currentWorkspace])

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces')
      setWorkspaces(res.data)
      if (res.data.length > 0 && !currentWorkspace) {
        // Default to first workspace
        setCurrentWorkspace(res.data[0])
      }
    } catch (err) {
      console.error("Error fetching workspaces:", err)
    }
  }

  const createWorkspace = async (name) => {
    try {
      const res = await api.post('/workspaces', { name })
      setWorkspaces(prev => [...prev, res.data])
      setCurrentWorkspace(res.data)
      return res.data
    } catch (err) {
      console.error("Error creating workspace:", err)
      throw err
    }
  }

  const fetchSessions = async () => {
    if (!currentWorkspace) return
    try {
      // Fetch sessions. In FastAPI we will have an endpoint under /workspaces/{ws_id}/sessions or query param
      const res = await api.get(`/chat/session?workspace_id=${currentWorkspace.id}`)
      setSessions(res.data)
    } catch (err) {
      console.error("Error fetching sessions:", err)
    }
  }

  const createSession = async (title = "New Chat") => {
    if (!currentWorkspace) return
    try {
      const res = await api.post(`/chat/session?workspace_id=${currentWorkspace.id}`, {
        title,
        search_mode: searchMode
      })
      setSessions(prev => [res.data, ...prev])
      setCurrentSession(res.data)
      setMessages([])
      return res.data
    } catch (err) {
      console.error("Error creating chat session:", err)
      throw err
    }
  }

  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/chat/session/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSession?.id === sessionId) {
        setCurrentSession(null)
        setMessages([])
      }
    } catch (err) {
      console.error("Error deleting session:", err)
      throw err
    }
  }

  const selectSession = async (session) => {
    setCurrentSession(session)
    setSearchMode(session.search_mode)
    try {
      const res = await api.get(`/chat/session/${session.id}`)
      setMessages(res.data.messages || [])
    } catch (err) {
      console.error("Error fetching messages for session:", err)
    }
  }

  return (
    <ChatContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        createWorkspace,
        fetchWorkspaces,
        sessions,
        currentSession,
        createSession,
        deleteSession,
        selectSession,
        messages,
        setMessages,
        searchMode,
        setSearchMode,
        loading,
        setLoading
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
