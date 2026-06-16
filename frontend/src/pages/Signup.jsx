import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const Signup = () => {
  const navigate = useNavigate()
  const { signUpWithEmail } = useAuth()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail(email, password, fullName)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || "Failed to sign up")
    } finally {
      setLoading(false)
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
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-500/10 text-brand-primary rounded-2xl mb-4 border border-blue-500/20">
            <Sparkles size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1">Start studying smarter with AI</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2.5 bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl mb-4 text-sm"
          >
            <CheckCircle size={18} className="shrink-0" />
            <span>Registration successful! Redirecting to login...</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
              />
            </div>
          </div>

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
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
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
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-brand-bg/50 border border-brand-border focus:border-brand-primary text-white pl-11 pr-4 py-2.5 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-brand-primary/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-brand-primary hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Signup
