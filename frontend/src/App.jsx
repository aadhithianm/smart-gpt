import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import Sidebar from './components/common/Sidebar'

import Login from './pages/Login'
import Signup from './pages/Signup'
import TopNavbar from './components/common/TopNavbar'

import Library from './pages/Library'

import Chat from './pages/Chat'

import Quizzes from './pages/Quizzes'

import StudyPlans from './pages/StudyPlans'

import Flashcards from './pages/Flashcards'

// Page Stubs (We'll implement detailed versions next)
import Analytics from './pages/Analytics'

// Layout wrapper for Protected App views
const AppLayout = () => {
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-gray-100">
      <Sidebar mobileOpen={sidebarMobileOpen} onClose={() => setSidebarMobileOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNavbar onToggleSidebar={() => setSidebarMobileOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto bg-brand-bg">
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:sessionId" element={<Chat />} />
            <Route path="/library" element={<Library />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/plans" element={<StudyPlans />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Core Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<AppLayout />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App
