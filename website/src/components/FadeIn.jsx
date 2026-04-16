import { motion } from 'framer-motion'
import useReveal from '../hooks/useReveal'
import styles from './FadeIn.module.css'

export default function FadeIn({ children, delay = 0, y = 28, className = '', as: Tag = 'div' }) {
  const { ref, isInView } = useReveal()
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
