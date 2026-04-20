import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Login.module.css'

const API_URL =
  'https://memorylayer-production.up.railway.app/v1/auth/login'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Invalid email or password.')
        } else if (response.status === 422) {
          setError('Please enter a valid email address.')
        } else {
          setError('Something went wrong. Please try again.')
        }
        setLoading(false)
        return
      }

      const result = await response.json()
      document.cookie = `session_token=${result.session_token}; path=/; max-age=2592000; SameSite=Strict; Secure`
      navigate('/dashboard')
    } catch {
      setError("Couldn't reach our servers. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

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
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>
          Sign in to access your dashboard, keys, and usage stats.
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

          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={8}
            />
          </label>

          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Signing in…
              </>
            ) : (
              'Sign in →'
            )}
          </button>
        </form>

        <p className={styles.signupLink}>
          Don't have an account?{' '}
          <Link to="/signup">Sign up free</Link>
        </p>
      </motion.div>
    </div>
  )
}
