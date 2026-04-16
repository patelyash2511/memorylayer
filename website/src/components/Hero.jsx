import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import styles from './Hero.module.css'

const STATS = [
  { value: '28/28', label: 'Tests passing' },
  { value: '<100ms', label: 'P95 recall latency' },
  { value: 'Live', label: 'API on Railway' },
]

export default function Hero({ onCTA }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rawY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const y = useSpring(rawY, { stiffness: 80, damping: 22 })
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const word = ['Your', 'AI', 'no', 'longer']

  return (
    <section ref={ref} className={styles.hero}>
      {/* Ambient orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <motion.div className={styles.content} style={{ y, opacity }}>
        {/* Eyebrow badge */}
        <motion.div
          className={styles.badge}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span className={styles.badgeDot} />
          Memory API — now in open beta
        </motion.div>

        {/* Main headline */}
        <h1 className={styles.h1}>
          <motion.span
            className={styles.headTop}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            Your AI no longer
          </motion.span>
          <motion.span
            className={styles.headAccent}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            forgets.
          </motion.span>
        </h1>

        {/* Sub-copy */}
        <motion.p
          className={styles.sub}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Rec0 gives your AI apps persistent, searchable memory — across sessions,
          users, and models. One API. Zero infrastructure drama.
        </motion.p>

        {/* CTA row */}
        <motion.div
          className={styles.ctaRow}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.75 }}
        >
          <button className="btn-big" onClick={onCTA}>Get your API key →</button>
          <a className="btn-outline" href="https://memorylayer-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">View docs →</a>
        </motion.div>

        {/* Trust note */}
        <motion.p
          className={styles.trust}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.95 }}
        >
          Free up to 50K memories · No card required
        </motion.p>

        {/* Stats strip */}
        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          {STATS.map((s, i) => (
            <div key={i} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Before/after callout */}
        <motion.div
          className={styles.callout}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 1.3 }}
        >
          <div className={styles.calloutSide}>
            <span className={styles.calloutTag}>Before Rec0</span>
            <p>"Who are you again? I have no memory of previous conversations."</p>
          </div>
          <div className={styles.calloutDivider} />
          <div className={`${styles.calloutSide} ${styles.calloutAfter}`}>
            <span className={`${styles.calloutTag} ${styles.calloutTagGreen}`}>With Rec0</span>
            <p>"Hi Alex! Following up on the dashboard redesign — want to pick up where we left off?"</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
