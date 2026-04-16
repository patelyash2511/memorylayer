import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './CTA.module.css'

export default function CTA({ onCTA }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1.05, 0.9])

  return (
    <section className={styles.section} ref={ref}>
      <motion.div className={styles.glow} style={{ scale }} />
      <FadeIn className={styles.content}>
        <h2 className={styles.h2}>
          Give your AI<br />
          <span className={styles.accent}>a memory.</span>
        </h2>
        <p className={styles.sub}>Free forever up to 10K ops. No credit card needed. Ship today.</p>
        <div className={styles.actions}>
          <button className="btn-big" onClick={onCTA}>Start building free →</button>
          <a
            className="btn-outline"
            href="https://memorylayer-production.up.railway.app/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the docs →
          </a>
        </div>
      </FadeIn>
    </section>
  )
}
