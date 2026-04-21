import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import { clearSessionToken, fetchWithSession, getSessionToken } from '../lib/auth'

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button className={styles.secondaryBtn} onClick={copy} type="button">
      {copied ? 'Copied' : label}
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState(null)
  const [deletingPrefix, setDeletingPrefix] = useState('')
  const [visibleKeys, setVisibleKeys] = useState(new Set())
  const [copiedKeys, setCopiedKeys] = useState(new Set())

  const handleUnauthorized = useCallback(() => {
    clearSessionToken()
    navigate('/login')
  }, [navigate])

  const loadDashboard = useCallback(async () => {
    if (!getSessionToken()) {
      handleUnauthorized()
      return
    }

    setLoading(true)
    setError('')

    try {
      const accountResponse = await fetchWithSession('/auth/me')

      if (accountResponse.status === 401) {
        handleUnauthorized()
        return
      }

      if (!accountResponse.ok) {
        setError('Failed to load your dashboard. Please refresh and try again.')
        return
      }

      const accountData = await accountResponse.json()
      setAccount(accountData)
    } catch {
      setError("Couldn't reach our servers. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [handleUnauthorized])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  async function handleCreateKey(e) {
    e.preventDefault()
    if (creatingKey) return

    setCreatingKey(true)
    setNewKeyResult(null)
    setError('')

    try {
      const response = await fetchWithSession('/auth/keys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'New key', mode: 'live' }),
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        setError('Failed to create a new API key.')
        return
      }

      const data = await response.json()
      setNewKeyResult(data)
      setNewKeyName('')
      await loadDashboard()
    } catch {
      setError('Network error creating a new key.')
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleDeleteKey(prefix) {
    setDeletingPrefix(prefix)
    setError('')

    try {
      const response = await fetchWithSession(`/auth/keys/${encodeURIComponent(prefix)}`, {
        method: 'DELETE',
      })

      if (response.status === 401) {
        handleUnauthorized()
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data?.detail?.error === 'cannot_delete_last_key') {
          setError("Can't revoke your last active key. Create a new one first.")
        } else {
          setError('Failed to revoke key.')
        }
        return
      }

      await loadDashboard()
    } catch {
      setError('Network error revoking key.')
    } finally {
      setDeletingPrefix('')
    }
  }

  async function handleSignOut() {
    try {
      await fetchWithSession('/auth/logout', { method: 'POST' })
    } catch {
      // Ignore logout failures and clear the local session anyway.
    }

    clearSessionToken()
    navigate('/login')
  }

  function toggleKeyVisibility(keyId) {
    setVisibleKeys((current) => {
      const next = new Set(current)
      if (next.has(keyId)) {
        next.delete(keyId)
      } else {
        next.add(keyId)
      }
      return next
    })
  }

  async function copyKey(keyValue, keyId) {
    if (!keyValue) {
      return
    }
    try {
      await navigator.clipboard.writeText(keyValue)
      setCopiedKeys((current) => new Set(current).add(keyId))
      setTimeout(() => {
        setCopiedKeys((current) => {
          const next = new Set(current)
          next.delete(keyId)
          return next
        })
      }, 2000)
    } catch {
      setError('Failed to copy the key to your clipboard.')
    }
  }

  function maskKey(key) {
    if (!key.revealable || !key.key) {
      const prefix = key.key_prefix.replace(/\.\.\.$/, '')
      return `${prefix}${'•'.repeat(12)}`
    }
    const visiblePrefix = key.key.substring(0, 16)
    return `${visiblePrefix}${'•'.repeat(Math.max(8, key.key.length - 16))}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading your dashboard...</div>
  }

  if (!account) {
    return (
      <div className={styles.container}>
        <div className={styles.errorWrap}>
          <div className={styles.error}>{error || 'We could not load your account right now.'}</div>
        </div>
      </div>
    )
  }

  const usageRatio = account.ops_limit ? account.ops_used_this_month / account.ops_limit : 0
  const usagePercent = Math.min(100, usageRatio * 100)
  const welcomeName = account.email.split('@')[0]
  const accountKeys = account.keys || []

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Dashboard</h1>
            <p>Welcome back, {welcomeName}</p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.sessionBadge}>
              <span className={styles.sessionDot}></span>
              Authenticated
            </div>
            <button className={styles.secondaryBtn} onClick={handleSignOut} type="button">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <motion.div
          className={styles.grid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Usage this month</h3>
              <span className={styles.cardIcon}>📊</span>
            </div>
            <div className={styles.bigStat}>
              {account.ops_used_this_month.toLocaleString()}
              <small>/ {account.ops_limit.toLocaleString()}</small>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${usagePercent}%` }} />
            </div>
            <p className={styles.progressLabel}>{usagePercent.toFixed(1)}% used</p>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Current plan</h3>
              <span className={styles.cardIcon}>✨</span>
            </div>
            <div className={styles.planBadge}>
              {account.plan}
              {account.plan === 'free' && <span className={styles.freeBadge}>Free Forever</span>}
            </div>
            <a className={styles.link} href="/#pricing">Upgrade plan →</a>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Account</h3>
              <span className={styles.cardIcon}>👤</span>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Email</label>
                <p>{account.email}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Member Since</label>
                <p>{new Date(account.member_since).toLocaleDateString()}</p>
              </div>
              <div className={styles.infoItem}>
                <label>API Keys</label>
                <p>{accountKeys.length}</p>
              </div>
              <div className={styles.infoItem}>
                <label>Credits</label>
                <p>{account.credits.toLocaleString()}</p>
              </div>
            </div>
          </section>

          <section className={styles.cardWide}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>API Keys</h3>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={() => {
                  setShowCreate((current) => !current)
                  setNewKeyResult(null)
                  setNewKeyName('')
                }}
              >
                {showCreate ? 'Close' : 'Create new key'}
              </button>
            </div>

            <AnimatePresence>
              {showCreate && (
                <motion.div
                  className={styles.createBox}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {!newKeyResult ? (
                    <form onSubmit={handleCreateKey} className={styles.createForm}>
                      <input
                        className={styles.input}
                        type="text"
                        placeholder="Key name, for example production-api"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                      <button className={styles.primaryBtn} type="submit" disabled={creatingKey}>
                        {creatingKey ? 'Creating...' : 'Create key'}
                      </button>
                    </form>
                  ) : (
                    <div className={styles.newKeyBox}>
                      <div>
                        <p className={styles.newKeyTitle}>Save this key now</p>
                        <p className={styles.newKeyMeta}>It will not be shown again after you close this panel.</p>
                      </div>
                      <div className={styles.newKeyActions}>
                        <code>{newKeyResult.api_key}</code>
                        <CopyBtn text={newKeyResult.api_key} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {accountKeys.length === 0 ? (
              <p className={styles.empty}>No API keys yet</p>
            ) : (
              <div className={styles.keysList}>
                {accountKeys.map((key) => (
                  <div key={key.key_prefix} className={styles.keyItem}>
                    <div className={styles.keyContent}>
                      <div className={styles.keyHeader}>
                        <span className={styles.keyName}>{key.name || 'Default key'}</span>
                        <span className={styles.keyStatus}>
                          {key.is_active ? (
                            <span className={styles.statusActive}>● Active</span>
                          ) : (
                            <span className={styles.statusInactive}>○ Inactive</span>
                          )}
                        </span>
                      </div>

                      <div className={styles.keyDisplay}>
                        <code className={styles.keyCode}>
                          {visibleKeys.has(key.id) && key.revealable ? key.key : maskKey(key)}
                        </code>
                      </div>

                      <span className={styles.keyMeta}>
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                        {!key.revealable && ' · Legacy key: rotate to enable reveal and copy'}
                      </span>
                    </div>
                    <div className={styles.keyActions}>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => toggleKeyVisibility(key.id)}
                        disabled={!key.revealable}
                        title={key.revealable ? (visibleKeys.has(key.id) ? 'Hide key' : 'Show key') : 'Legacy keys cannot be revealed'}
                      >
                        {visibleKeys.has(key.id) ? '🙈' : '👁️'}
                      </button>

                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => copyKey(key.key, key.id)}
                        disabled={!key.revealable}
                        title={key.revealable ? 'Copy to clipboard' : 'Legacy keys cannot be copied'}
                      >
                        {copiedKeys.has(key.id) ? '✅' : '📋'}
                      </button>

                      {key.is_active ? (
                        <button
                          className={styles.dangerBtn}
                          type="button"
                          onClick={() => handleDeleteKey(key.key_prefix)}
                          disabled={deletingPrefix === key.key_prefix}
                        >
                          {deletingPrefix === key.key_prefix ? 'Revoking...' : 'Revoke'}
                        </button>
                      ) : (
                        <span className={styles.revokedLabel}>Revoked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Quick Links</h3>
              <span className={styles.cardIcon}>🔗</span>
            </div>
            <div className={styles.linksList}>
              <a href="https://memorylayer-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">
                📚 API Documentation
              </a>
              <a href="/benchmark">⚡ Benchmark Results</a>
              <a href="/roadmap">🗺️ Performance Roadmap</a>
              <a href="https://github.com/patelyash2511/rec0" target="_blank" rel="noopener noreferrer">
                ⌥ GitHub Repository
              </a>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  )
}
