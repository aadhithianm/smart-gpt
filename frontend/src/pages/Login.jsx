import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Mail, Lock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const Login = () => {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/chat')
    } catch (err) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || "Failed to sign in with Google")
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-brand-bg px-4 relative overflow-hidden select-none">
      {/* Decorative gradient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-8 glassmorphism rounded-2xl shadow-2xl relative z-10 border border-brand-border"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 text-brand-primary rounded-2xl mb-4 border border-blue-500/20">
            <Sparkles size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Welcome to StudyGPT</h2>
          <p className="text-gray-400 text-sm mt-1">Supercharge your learning with AI</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-3 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center justify-between my-6">
          <div className="w-[43%] h-[1px] bg-brand-border" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
          <div className="w-[43%] h-[1px] bg-brand-border" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center space-x-2.5 bg-brand-bg border border-brand-border hover:bg-brand-border text-gray-300 hover:text-white font-medium py-3 rounded-xl cursor-pointer transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Login
