import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { supabase } from '../supabase'
import api from '../api'
import { 
  User as UserIcon, 
  Lock, 
  Settings as SettingsIcon, 
  Plus, 
  Save, 
  Trash2, 
  UserPlus, 
  Edit3, 
  Layout, 
  Palette, 
  UserCheck, 
  AlertTriangle,
  Mail,
  Shield,
  FolderOpen
} from 'lucide-react'
import { motion } from 'framer-motion'

const ACCENT_COLORS = [
  { name: 'Blue (Default)', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500' },
  { name: 'Purple', value: '#A855F7', class: 'bg-purple-500' },
  { name: 'Emerald', value: '#10B981', class: 'bg-emerald-500' },
  { name: 'Rose', value: '#F43F5E', class: 'bg-rose-500' }
]

const Settings = () => {
  const { user } = useAuth()
  const { 
    workspaces, 
    currentWorkspace, 
    createWorkspace, 
    updateWorkspace, 
    deleteWorkspace 
  } = useChat()

  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Profile Form States
  const [fullName, setFullName] = useState('')
  const [avatarSeed, setAvatarSeed] = useState('')
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Workspace Form States
  const [newWsName, setNewWsName] = useState('')
  const [editingWsId, setEditingWsId] = useState(null)
  const [editingWsName, setEditingWsName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [wsMembers, setWsMembers] = useState([])
  const [memberLoading, setMemberLoading] = useState(false)

  // Appearance States
  const [activeAccent, setActiveAccent] = useState('#3B82F6')
  const [chatDensity, setChatDensity] = useState('spacious')
  const [defaultSearch, setDefaultSearch] = useState('hybrid')

  // Load Initial Settings
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
      setAvatarSeed(user.user_metadata?.avatar_seed || user.email?.split('@')[0] || '')
      setCustomAvatarUrl(user.user_metadata?.avatar_url || '')
    }

    // Load appearance settings from localStorage
    const savedAccent = localStorage.getItem('theme-accent') || '#3B82F6'
    const savedDensity = localStorage.getItem('chat-density') || 'spacious'
    const savedSearch = localStorage.getItem('default-search') || 'hybrid'
    
    setActiveAccent(savedAccent)
    setChatDensity(savedDensity)
    setDefaultSearch(savedSearch)
  }, [user])

  // Load Workspace Members when active workspace changes
  useEffect(() => {
    if (currentWorkspace && activeTab === 'workspaces') {
      fetchMembers()
    }
  }, [currentWorkspace, activeTab])

  const fetchMembers = async () => {
    setMemberLoading(true)
    try {
      const res = await api.get(`/workspaces/${currentWorkspace.id}/members`)
      setWsMembers(res.data)
    } catch (err) {
      console.error("Failed to load workspace members:", err)
    } finally {
      setMemberLoading(false)
    }
  }

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const finalAvatarUrl = customAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName, 
          avatar_seed: avatarSeed,
          avatar_url: finalAvatarUrl
        }
      })
      if (error) throw error

      // Call backend user sync endpoint if available
      try {
        await api.put('/users/profile', {
          full_name: fullName,
          avatar_url: finalAvatarUrl
        })
      } catch (err) {
        // Backend user endpoint might not exist, ignore if it fails
      }

      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match')
      return
    }
    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccessMsg('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  // Handle Workspace Create
  const handleCreateWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    setLoading(true)
    try {
      await createWorkspace(newWsName)
      setNewWsName('')
      setSuccessMsg('Workspace created successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  // Handle Workspace Rename
  const handleRenameWorkspace = async (wsId) => {
    if (!editingWsName.trim()) return
    setLoading(true)
    try {
      await updateWorkspace(wsId, editingWsName)
      setEditingWsId(null)
      setEditingWsName('')
      setSuccessMsg('Workspace renamed successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to rename workspace')
    } finally {
      setLoading(false)
    }
  }

  // Handle Workspace Delete
  const handleDeleteWorkspace = async (wsId) => {
    if (!window.confirm("Are you absolutely sure you want to delete this workspace? All documents, chats, quizzes, and decks inside will be permanently deleted.")) {
      return
    }
    setLoading(true)
    try {
      await deleteWorkspace(wsId)
      setSuccessMsg('Workspace deleted successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete workspace')
    } finally {
      setLoading(false)
    }
  }

  // Handle Adding Workspace Member
  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      // Step 1: Find user ID by email. Since Supabase auth lists are protected,
      // we query our public.users table in the backend.
      const userRes = await api.get(`/users/search?email=${inviteEmail}`)
      const targetUser = userRes.data
      
      if (!targetUser) {
        throw new Error("User with that email is not registered on StudyGPT")
      }

      await api.post(`/workspaces/${currentWorkspace.id}/members`, {
        user_id: targetUser.id,
        role: inviteRole
      })

      setInviteEmail('')
      fetchMembers()
      setSuccessMsg('Member added successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  // Handle Accent Color Change
  const handleAccentChange = (hex) => {
    setActiveAccent(hex)
    localStorage.setItem('theme-accent', hex)
    document.documentElement.style.setProperty('--color-brand-primary', hex)
  }

  // Handle Density Change
  const handleDensityChange = (density) => {
    setChatDensity(density)
    localStorage.setItem('chat-density', density)
  }

  // Handle Default Search Change
  const handleSearchChange = (mode) => {
    setDefaultSearch(mode)
    localStorage.setItem('default-search', mode)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 select-none">
      {/* Title */}
      <div className="flex items-center space-x-3.5 border-b border-brand-border/40 pb-5">
        <div className="p-2.5 bg-brand-surface border border-brand-border text-brand-primary rounded-2xl shadow-xl">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your profile, workspaces, and application preferences</p>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Navigation Tabs (Vertical Sidebar layout inside settings) */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-3 md:pb-0 border-b md:border-b-0 border-brand-border/40">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile' 
                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                : 'text-gray-400 hover:text-white hover:bg-brand-surface'
            }`}
          >
            <UserIcon size={18} />
            <span>Profile Settings</span>
          </button>
          
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'workspaces' 
                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                : 'text-gray-400 hover:text-white hover:bg-brand-surface'
            }`}
          >
            <FolderOpen size={18} />
            <span>Workspace Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center justify-center md:justify-start space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'appearance' 
                ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                : 'text-gray-400 hover:text-white hover:bg-brand-surface'
            }`}
          >
            <Palette size={18} />
            <span>Preferences</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 min-w-0 bg-brand-surface border border-brand-border p-6 rounded-2xl shadow-xl space-y-6">
          
          {/* Status Toast Notification */}
          {successMsg && (
            <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <UserCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              
              {/* Profile Details Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2">Profile Information</h3>
                
                {/* Avatar Preview & Seed Selection */}
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-brand-bg/30 p-4 rounded-xl border border-brand-border/40">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-md" />
                    <img 
                      src={customAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`} 
                      alt="Avatar Preview" 
                      className="w-20 h-20 rounded-full border-2 border-brand-primary relative z-10 bg-brand-surface object-cover"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Avatar Seed (Dicebear)</label>
                      <input 
                        type="text" 
                        value={avatarSeed}
                        onChange={(e) => {
                          setAvatarSeed(e.target.value)
                          setCustomAvatarUrl('')
                        }}
                        placeholder="Random seed..."
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-3.5 py-2 rounded-xl outline-none transition-colors text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Or Custom Avatar URL</label>
                      <input 
                        type="url" 
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-3.5 py-2 rounded-xl outline-none transition-colors text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Email (Read-Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        readOnly 
                        value={user?.email || ''} 
                        className="w-full bg-brand-bg/50 border border-brand-border text-gray-500 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Display Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-3 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        required
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full Name" 
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                  >
                    <Save size={16} />
                    <span>{loading ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>

              {/* Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-6 pt-6 border-t border-brand-border/40">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2">Change Password</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-gray-500" size={16} />
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 text-gray-500" size={16} />
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                  >
                    <Lock size={16} />
                    <span>{loading ? 'Changing...' : 'Change Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: WORKSPACE MANAGEMENT */}
          {activeTab === 'workspaces' && (
            <div className="space-y-8">
              
              {/* Workspace List & Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2">Your Workspaces</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {workspaces.map((ws) => {
                    const isCurrent = currentWorkspace?.id === ws.id
                    const isOwner = ws.created_by === user?.id
                    
                    return (
                      <div 
                        key={ws.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          isCurrent 
                            ? 'bg-brand-primary/5 border-brand-primary/30' 
                            : 'bg-brand-bg/40 border-brand-border hover:border-gray-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          {editingWsId === ws.id ? (
                            <div className="flex items-center space-x-2">
                              <input 
                                type="text"
                                value={editingWsName}
                                onChange={(e) => setEditingWsName(e.target.value)}
                                className="bg-brand-bg border border-brand-primary text-white text-sm px-3 py-1.5 rounded-lg outline-none"
                              />
                              <button 
                                onClick={() => handleRenameWorkspace(ws.id)}
                                className="px-3 py-1.5 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setEditingWsId(null)}
                                className="px-3 py-1.5 bg-brand-border text-gray-400 text-xs font-semibold rounded-lg hover:text-white transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2.5">
                              <span className="font-bold text-white text-sm truncate">{ws.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-brand-primary/20 text-brand-primary font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                              )}
                              <span className="text-[10px] bg-brand-border text-gray-400 font-bold px-2 py-0.5 rounded-full uppercase">
                                {isOwner ? 'Owner' : 'Member'}
                              </span>
                            </div>
                          )}
                          <span className="block text-[10px] text-gray-500 mt-1">ID: {ws.id}</span>
                        </div>

                        {/* Actions */}
                        {editingWsId !== ws.id && (
                          <div className="flex items-center space-x-1">
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setEditingWsId(ws.id)
                                  setEditingWsName(ws.name)
                                }}
                                className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-brand-border transition-colors cursor-pointer"
                                title="Rename Workspace"
                              >
                                <Edit3 size={15} />
                              </button>
                            )}
                            {isOwner && workspaces.length > 1 && (
                              <button
                                onClick={() => handleDeleteWorkspace(ws.id)}
                                className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-brand-border transition-colors cursor-pointer"
                                title="Delete Workspace"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Create Workspace */}
              <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-6 border-t border-brand-border/40">
                <h3 className="text-md font-bold text-white tracking-wide">Create New Workspace</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    required
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="E.g., Computer Science, History Syllabus"
                    className="flex-1 bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-4 py-2.5 rounded-xl outline-none transition-colors text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01]"
                  >
                    <Plus size={16} />
                    <span>Create</span>
                  </button>
                </div>
              </form>

              {/* Workspace Members Setup */}
              {currentWorkspace && (
                <div className="space-y-6 pt-6 border-t border-brand-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-bold text-white tracking-wide">
                      Members in <span className="text-brand-primary">{currentWorkspace.name}</span>
                    </h3>
                  </div>

                  {/* Add Member Form */}
                  <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3 bg-brand-bg/20 p-4 rounded-xl border border-brand-border/40">
                    <div className="flex-1">
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Invite user by email"
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-4 py-2 rounded-xl outline-none transition-colors text-xs"
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-3 py-2 rounded-xl outline-none transition-colors text-xs"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center space-x-2 bg-brand-primary hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer text-xs"
                    >
                      <UserPlus size={14} />
                      <span>Add Member</span>
                    </button>
                  </form>

                  {/* Members List */}
                  <div className="space-y-2">
                    {memberLoading ? (
                      <div className="text-xs text-gray-500 italic py-2">Loading members...</div>
                    ) : (
                      wsMembers.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between p-3 bg-brand-bg/10 rounded-xl border border-brand-border/20 text-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-full bg-brand-border text-gray-400 flex items-center justify-center font-bold text-[10px]">
                              {m.user_id.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white truncate max-w-[200px]">User {m.user_id.substring(0, 8)}</span>
                              <span className="text-[10px] text-gray-500">Joined</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-brand-border text-gray-400 font-bold px-2 py-0.5 rounded uppercase">{m.role}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: APPEARANCE & PREFERENCES */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              
              {/* Theme Accents */}
              <div className="space-y-3.5">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2 flex items-center space-x-2">
                  <Palette size={18} className="text-brand-primary" />
                  <span>Theme Accents</span>
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">Customize the primary brand color for the entire interface. The change takes effect immediately.</p>
                <div className="flex flex-wrap gap-4 pt-2">
                  {ACCENT_COLORS.map((color) => {
                    const isSelected = activeAccent === color.value
                    
                    return (
                      <button
                        key={color.name}
                        onClick={() => handleAccentChange(color.value)}
                        className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-border border-brand-primary text-white shadow-lg shadow-brand-primary/10' 
                            : 'bg-brand-bg/40 border-brand-border hover:border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${color.class} border border-white/20`} />
                        <span className="text-xs font-semibold">{color.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Chat Layout Density */}
              <div className="space-y-3.5 pt-6 border-t border-brand-border/40">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2 flex items-center space-x-2">
                  <Layout size={18} className="text-brand-primary" />
                  <span>Chat Density</span>
                </h3>
                <p className="text-xs text-gray-400">Control the sizing and whitespace in the conversation interface.</p>
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => handleDensityChange('spacious')}
                    className={`flex-1 flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer ${
                      chatDensity === 'spacious'
                        ? 'bg-brand-primary/5 border-brand-primary text-white'
                        : 'bg-brand-bg/40 border-brand-border text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <span className="font-bold text-sm">Spacious</span>
                    <span className="text-[10px] text-gray-500 mt-1">Comfortable spacing, standard padding (Default)</span>
                  </button>
                  <button
                    onClick={() => handleDensityChange('compact')}
                    className={`flex-1 flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer ${
                      chatDensity === 'compact'
                        ? 'bg-brand-primary/5 border-brand-primary text-white'
                        : 'bg-brand-bg/40 border-brand-border text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <span className="font-bold text-sm">Compact</span>
                    <span className="text-[10px] text-gray-500 mt-1">Smaller fonts and compressed padding</span>
                  </button>
                </div>
              </div>

              {/* Default Chat Search Mode */}
              <div className="space-y-3.5 pt-6 border-t border-brand-border/40">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-brand-border/40 pb-2 flex items-center space-x-2">
                  <Shield size={18} className="text-brand-primary" />
                  <span>Default Search Mode</span>
                </h3>
                <p className="text-xs text-gray-400">Choose the default search mode when starting a new conversation.</p>
                <div className="max-w-xs pt-2">
                  <select
                    value={defaultSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary text-white px-4 py-2.5 rounded-xl outline-none transition-colors text-sm"
                  >
                    <option value="materials">My Materials (RAG-only)</option>
                    <option value="web">Web Search (Internet-only)</option>
                    <option value="hybrid">Hybrid Mode (RAG + Web Search)</option>
                  </select>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Settings
