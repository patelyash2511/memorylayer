import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Signup.module.css'

const API_URL =
  'https://memorylayer-production.up.railway.app/v1/auth/register'

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button className={styles.copyBtn} onClick={copy} type="button">
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })

      if (!response.ok) {
        if (response.status === 409) {
          setError('This email is already registered. Try signing in instead.')
        } else if (response.status === 429) {
          setError('Too many signups from your network. Try again in an hour.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      const result = await response.json()
      setData(result)
    } catch {
      setError("Couldn't reach our servers. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const quickstart = data
    ? `pip install memorylayer-py

from rec0 import Memory

mem = Memory(api_key="${data.api_key}")
mem.store(user_id="user_123",
          content="Hello from rec0!")`
    : ''

  // ── Success state ────────────────────────────────────────
  if (data) {
    return (
      <div className={styles.page}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h1 className={styles.heading}>You're in 🎉</h1>
          <p className={styles.sub}>
            Here's your API key. Save it now — we cannot show it again.
          </p>

          {/* API key block */}
          <div className={styles.keyBlock}>
            <code className={styles.keyText}>{data.api_key}</code>
            <CopyButton text={data.api_key} label="Copy key" />
          </div>

          {/* Warning banner */}
          <div className={styles.warning}>
            <span className={styles.warningIcon}>⚠</span>
            <span>
              This key is shown only once. Store it somewhere safe before
              closing this page.
            </span>
          </div>

          {/* Quickstart snippet */}
          <div className={styles.snippetWrap}>
            <div className={styles.snippetHeader}>
              <span className={styles.snippetLabel}>Quickstart</span>
              <CopyButton text={quickstart} label="Copy" />
            </div>
            <pre className={styles.snippet}>
              <code>{quickstart}</code>
            </pre>
          </div>

          {/* CTAs */}
          <div className={styles.actions}>
            <button
              className={`btn-big ${styles.primaryBtn}`}
              onClick={() => navigate('/dashboard', { state: { apiKey: data.api_key } })}
            >
              Go to dashboard →
            </button>
            <a
              className={`btn-outline ${styles.secondaryBtn}`}
              href="https://memorylayer-production.up.railway.app/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the docs
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Form state ───────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <h1 className={styles.heading}>Get your API key</h1>
        <p className={styles.sub}>
          Free forever up to 10K ops/month.
          <br />
          No credit card required.
        </p>

        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error}
          </motion.div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name
            <input
              type="text"
              className={styles.input}
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              type="email"
              className={styles.input}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
            />
            <span>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </span>
          </label>

          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !agreed}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Creating your key…
              </>
            ) : (
              'Create my API key →'
            )}
          </button>
        </form>

        <p className={styles.signinLink}>
          Already have a key?{' '}
          <Link to="/dashboard">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
