import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { 
  MessageSquare, 
  Library as LibraryIcon, 
  FileQuestion, 
  GraduationCap, 
  Calendar, 
  BarChart3, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Trash2,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Sidebar = ({ mobileOpen, onClose }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { sessions, currentSession, createSession, deleteSession, selectSession } = useChat()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Library', path: '/library', icon: LibraryIcon },
    { name: 'Flashcards', path: '/flashcards', icon: GraduationCap },
    { name: 'Quizzes', path: '/quizzes', icon: FileQuestion },
    { name: 'Plans', path: '/plans', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 }
  ]

  const handleNewChat = async () => {
    try {
      const session = await createSession()
      navigate(`/chat/${session.id}`)
      if (onClose) onClose()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectSession = (session) => {
    selectSession(session)
    navigate(`/chat/${session.id}`)
    if (onClose) onClose()
  }

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await deleteSession(sessionId)
      if (currentSession?.id === sessionId) {
        navigate('/chat')
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-45 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed md:static inset-y-0 left-0 z-50 bg-brand-surface border-r border-brand-border flex flex-col justify-between text-gray-300 relative select-none transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Collapse Toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:block absolute top-4 -right-3 bg-brand-surface border border-brand-border text-gray-400 hover:text-white rounded-full p-1 cursor-pointer z-50 hover:bg-brand-border transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div>
          {/* Logo Area */}
          <div className="p-4 flex items-center justify-between border-b border-brand-border/40">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="p-1.5 bg-blue-500/10 text-brand-primary rounded-lg">
                <Sparkles size={20} />
              </div>
              {!collapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-white tracking-wide text-lg"
                >
                  StudyGPT <span className="text-xs bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded ml-1">Pro</span>
                </motion.span>
              )}
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center space-x-2 bg-brand-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              {!collapsed && <span>New Chat</span>}
            </button>
          </div>

          {/* Navigation Section */}
          <nav className="px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path)
                    if (onClose) onClose()
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold border border-brand-primary/20' 
                      : 'hover:bg-brand-border/40 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {!collapsed && <span className="text-sm">{item.name}</span>}
                </button>
              )
            })}
          </nav>

        {/* Recent Chats Section */}
        {!collapsed && sessions.length > 0 && (
          <div className="mt-6 px-3 flex-1 overflow-y-auto max-h-[300px]">
            <span className="text-xs font-bold text-gray-500 tracking-wider uppercase pl-2">Recent Chats</span>
            <div className="mt-2 space-y-1">
              <AnimatePresence>
                {sessions.map((sess) => (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`group w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                      currentSession?.id === sess.id 
                        ? 'bg-brand-border text-white' 
                        : 'hover:bg-brand-border/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <MessageSquare size={16} className="text-gray-500" />
                      <span className="truncate">{sess.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded cursor-pointer transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      <div className="p-3 border-t border-brand-border/40">
        <div className={`flex items-center justify-between p-2 rounded-xl bg-brand-border/20 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img 
              src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.email}`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-brand-border bg-brand-bg object-cover"
            />
            {!collapsed && (
              <div className="flex flex-col text-left truncate">
                <span className="text-sm font-semibold text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-xs text-gray-500 truncate">{user?.email}</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={signOut}
              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-brand-border cursor-pointer transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
    </>
  )
}

export default Sidebar
