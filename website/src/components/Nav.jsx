import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from './ThemeToggle'
import styles from './Nav.module.css'
import { checkAuthStatus, clearSessionToken, fetchWithSession } from '../lib/auth'

const links = [
  { label: 'Features', href: '/#features' },
  { label: 'Use Cases', href: '/#usecases' },
  { label: 'Compare', href: '/#compare' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Docs', href: 'https://memorylayer-production.up.railway.app/docs', external: true },
]

export default function Nav({ onCTA, onSignin, theme, onToggleTheme }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refreshAuthState() {
      setLoading(true)
      const loggedIn = await checkAuthStatus()
      if (!cancelled) {
        setIsLoggedIn(loggedIn)
        setLoading(false)
      }
    }

    refreshAuthState()

    const syncAuthState = () => {
      refreshAuthState()
    }

    window.addEventListener('authchange', syncAuthState)
    window.addEventListener('focus', syncAuthState)

    return () => {
      cancelled = true
      window.removeEventListener('authchange', syncAuthState)
      window.removeEventListener('focus', syncAuthState)
    }
  }, [location.pathname])

  async function handleSignOut() {
    try {
      await fetchWithSession('/auth/logout', { method: 'POST' })
    } catch {
      // Ignore logout network failures and clear local session anyway.
    }

    clearSessionToken()
    setIsLoggedIn(false)
    setMobileOpen(false)
    navigate('/')
  }

  function handleDashboard() {
    setMobileOpen(false)
    navigate('/dashboard')
  }

  function handleLogin() {
    setMobileOpen(false)
    onSignin()
  }

  function handleSignup() {
    setMobileOpen(false)
    onCTA()
  }

  return (
    <>
      <motion.nav
        className={styles.nav}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        data-scrolled={scrolled}
      >
        <Link to="/" className={styles.logo}>
          Rec<span>0</span>
        </Link>

        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div className={styles.cta}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {loading ? (
            <div className={styles.skeleton} aria-hidden="true" />
          ) : isLoggedIn ? (
            <>
              <button className={styles.ghost} onClick={handleDashboard}>Dashboard</button>
              <button className={styles.pillSecondary} onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <button className={styles.ghost} onClick={handleLogin}>Sign in</button>
              <button className={styles.pill} onClick={handleSignup}>Sign up →</button>
            </>
          )}
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
            {loading ? (
              <div className={styles.skeletonMobile} aria-hidden="true" />
            ) : isLoggedIn ? (
              <>
                <button className={styles.ghostMobile} onClick={handleDashboard}>Dashboard</button>
                <button className={styles.pill} style={{ marginTop: 16 }} onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <>
                <button className={styles.ghostMobile} onClick={handleLogin}>
                  Sign in
                </button>
                <button className={styles.pill} style={{ marginTop: 16 }} onClick={handleSignup}>
                  Sign up →
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
