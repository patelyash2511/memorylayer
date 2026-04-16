import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Nav.module.css'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Use Cases', href: '#usecases' },
  { label: 'Compare', href: '#compare' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#' },
]

export default function Nav({ onCTA }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <motion.nav
        className={styles.nav}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        data-scrolled={scrolled}
      >
        <span className={styles.logo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Rec<span>0</span>
        </span>

        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div className={styles.cta}>
          <button className={styles.ghost} onClick={onCTA}>Sign in</button>
          <button className={styles.pill} onClick={onCTA}>Start free →</button>
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            <span data-open={mobileOpen} />
            <span data-open={mobileOpen} />
            <span data-open={mobileOpen} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={styles.drawer}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
          >
            {links.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <button className={styles.pill} style={{ marginTop: 16 }} onClick={() => { onCTA(); setMobileOpen(false) }}>
              Start free →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
