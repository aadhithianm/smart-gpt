import React, { useState } from 'react'
import { useChat } from '../../context/ChatContext'
import { useAuth } from '../../context/AuthContext'
import { 
  ChevronDown, 
  FolderLock, 
  Globe2, 
  Layers, 
  Plus, 
  LogOut, 
  User as UserIcon,
  Check,
  Menu
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const TopNavbar = ({ onToggleSidebar }) => {
  const { 
    workspaces, 
    currentWorkspace, 
    setCurrentWorkspace, 
    createWorkspace,
    searchMode,
    setSearchMode
  } = useChat()
  const { user, signOut } = useAuth()
  
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [showNewWsForm, setShowNewWsForm] = useState(false)

  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    try {
      await createWorkspace(newWsName)
      setNewWsName('')
      setShowNewWsForm(false)
      setWsDropdownOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const modes = [
    { id: 'materials', name: 'My Materials', desc: 'Query only uploaded documents', icon: FolderLock },
    { id: 'web', name: 'Web Search', desc: 'Query live web grounding search', icon: Globe2 },
    { id: 'hybrid', name: 'Hybrid', desc: 'Merge uploaded context with web search', icon: Layers }
  ]

  return (
    <header className="h-16 border-b border-brand-border/40 bg-brand-surface/50 backdrop-blur flex items-center justify-between px-6 select-none relative z-40">
      
      {/* Left: Workspace Selector */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-brand-border/40 rounded-xl cursor-pointer transition-colors"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <div className="relative">
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="flex items-center space-x-2 bg-brand-border/30 hover:bg-brand-border/60 text-white font-medium py-1.5 px-3 rounded-xl cursor-pointer border border-brand-border transition-colors text-sm"
        >
          <span className="truncate max-w-[150px]">
            {currentWorkspace ? currentWorkspace.name : "Select Workspace"}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        <AnimatePresence>
          {wsDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 mt-2 w-64 bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-2 z-50"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block p-2">Workspaces</span>
              
              <div className="max-h-[160px] overflow-y-auto space-y-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws)
                      setWsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm cursor-pointer transition-colors ${
                      currentWorkspace?.id === ws.id 
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold' 
                        : 'hover:bg-brand-border/40 text-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {currentWorkspace?.id === ws.id && <Check size={14} />}
                  </button>
                ))}
              </div>

              {/* Create new Workspace section */}
              <div className="border-t border-brand-border/40 mt-2 pt-2">
                {!showNewWsForm ? (
                  <button
                    onClick={() => setShowNewWsForm(true)}
                    className="w-full flex items-center space-x-2 p-2 hover:bg-brand-border/40 text-brand-primary text-sm rounded-lg cursor-pointer transition-colors"
                  >
                    <Plus size={16} />
                    <span>Create Workspace</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateWorkspace} className="p-2 space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Workspace Name"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border text-white text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-brand-primary"
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="bg-brand-primary text-white text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewWsForm(false)}
                        className="text-gray-400 hover:text-white text-xs px-2.5 py-1.5 cursor-pointer rounded-lg hover:bg-brand-border transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* Middle: Search Mode Selector (Component 12) */}
      <div className="flex bg-brand-bg/80 border border-brand-border p-1 rounded-xl items-center">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = searchMode === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => setSearchMode(mode.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive 
                  ? 'bg-brand-primary text-white shadow-md shadow-blue-500/10' 
                  : 'text-gray-400 hover:text-white hover:bg-brand-border/20'
              }`}
              title={mode.desc}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{mode.name}</span>
            </button>
          )
        })}
      </div>

      {/* Right: User Menu */}
      <div className="relative">
        <button
          onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
          className="w-8 h-8 rounded-full border border-brand-border cursor-pointer overflow-hidden hover:scale-105 transition-transform"
        >
          <img 
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.email}`} 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        </button>

        <AnimatePresence>
          {profileDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-48 bg-brand-surface border border-brand-border rounded-xl shadow-2xl p-2 z-50"
            >
              <div className="p-2 border-b border-brand-border/40 mb-1">
                <span className="block text-sm font-semibold text-white truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="block text-xs text-gray-500 truncate">{user?.email}</span>
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false)
                  signOut()
                }}
                className="w-full flex items-center space-x-2 p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-sm rounded-lg text-left cursor-pointer transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </header>
  )
}

export default TopNavbar
