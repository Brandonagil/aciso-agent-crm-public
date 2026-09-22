'use client';

import { motion } from 'framer-motion';

const dotVariants = {
  initial: { y: '0%' },
  animate: { y: '-10px' },
};

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 px-4 py-3 max-w-max">
      <div className="flex items-center space-x-1">
        <span className="text-sm text-slate-500 font-medium">Agent tippt</span>
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="flex items-center space-x-1 ml-2"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              variants={dotVariants}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              className="w-2 h-2 bg-slate-400 rounded-full"
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}