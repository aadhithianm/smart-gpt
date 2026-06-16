import React from 'react'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const Loading = ({ text = "StudyGPT is thinking..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-brand-surface border border-brand-border rounded-xl max-w-sm mx-auto shadow-2xl">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 15, -15, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="text-brand-primary p-3 bg-blue-500/10 rounded-full mb-4"
      >
        <Sparkles size={32} />
      </motion.div>
      <span className="text-gray-300 font-medium text-sm mb-3 tracking-wide">{text}</span>
      <div className="flex space-x-2">
        {[0, 1, 2].map((idx) => (
          <motion.div
            key={idx}
            animate={{
              y: [0, -6, 0]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: idx * 0.15,
              ease: "easeInOut"
            }}
            className="w-2 h-2 bg-brand-primary rounded-full"
          />
        ))}
      </div>
    </div>
  )
}

export default Loading
