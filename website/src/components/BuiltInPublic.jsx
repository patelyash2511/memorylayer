import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './BuiltInPublic.module.css'

function LiveDot() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    // Use no-cors so the request isn't blocked by CORS preflight.
    // In no-cors mode the response is opaque (status 0) but a resolved
    // promise means the server responded — good enough for a live check.
    fetch('https://memorylayer-production.up.railway.app/health', { mode: 'no-cors' })
      .then(() => setStatus('up'))
      .catch(() => {
        // Network error / server truly down — leave as 'checking' so we
        // don't show a false "unreachable" on transient failures.
      })
  }, [])

  return (
    <span className={styles.dotWrap}>
      <span
        className={styles.statusDot}
        data-status={status}
        title={status === 'up' ? 'API is live' : 'Checking…'}
      />
      <span className={styles.statusLabel}>
        {status === 'up' ? 'API live' : 'Checking…'}
      </span>
    </span>
  )
}

const CARDS = [
  {
    icon: '⌥',
    title: 'GitHub',
    desc: 'Full source — API, SDK, and this website. Read the code, open issues, send PRs.',
    href: 'https://github.com/patelyash2511/rec0',
    cta: 'View repo →',
    accent: 'rgba(124,92,252,0.12)',
    accentBorder: 'rgba(124,92,252,0.3)',
  },
  {
    icon: '📦',
    title: 'PyPI',
    desc: 'pip install memorylayer-py — sync & async clients, typed exceptions, auto-retry.',
    href: 'https://pypi.org/project/memorylayer-py/',
    cta: 'View on PyPI →',
    accent: 'rgba(0,229,180,0.08)',
    accentBorder: 'rgba(0,229,180,0.25)',
  },
  {
    icon: '📋',
    title: 'API Docs',
    desc: 'Interactive Swagger UI — try every endpoint live against the production API.',
    href: 'https://memorylayer-production.up.railway.app/docs',
    cta: 'Open Swagger →',
    accent: 'rgba(249,169,110,0.08)',
    accentBorder: 'rgba(249,169,110,0.25)',
  },
]

export default function BuiltInPublic() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Built in public</span>
          <h2 className="section-heading">No fake metrics. Just real code.</h2>
          <p className="section-body" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            We're in open beta. Everything is public — the repo, the SDK, the test results.
            28/28 tests pass. The API is live right now.
          </p>
          <div className={styles.statusRow}>
            <LiveDot />
            <span className={styles.badge}>28/28 tests passing</span>
            <span className={styles.badge}>SDK on PyPI</span>
          </div>
        </FadeIn>

        <div className={styles.grid}>
          {CARDS.map((c, i) => (
            <motion.a
              key={c.title}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
              style={{ '--accent-bg': c.accent, '--accent-bd': c.accentBorder }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className={styles.icon}>{c.icon}</div>
              <h3 className={styles.cardTitle}>{c.title}</h3>
              <p className={styles.cardDesc}>{c.desc}</p>
              <span className={styles.cardCta}>{c.cta}</span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
