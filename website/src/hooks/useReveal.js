import { useRef } from 'react'
import { useInView } from 'framer-motion'

export default function useReveal(options = {}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px', ...options })
  return { ref, isInView }
}
