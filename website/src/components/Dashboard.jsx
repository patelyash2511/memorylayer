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
    <button className={styles.copyBtn} onClick={copy} type="button">
      {copied ? 'Copied' : label}
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState(null)
  const [deletingPrefix, setDeletingPrefix] = useState('')

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
      const [accountResponse, keysResponse] = await Promise.all([
        fetchWithSession('/auth/me'),
        fetchWithSession('/auth/keys'),
      ])

      if (accountResponse.status === 401 || keysResponse.status === 401) {
        handleUnauthorized()
        return
      }

      if (!accountResponse.ok || !keysResponse.ok) {
        setError('Failed to load your dashboard. Please refresh and try again.')
        return
      }

      const accountData = await accountResponse.json()
      const keysData = await keysResponse.json()

      setAccount(accountData)
      setApiKeys(keysData.keys || [])
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

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.orbPrimary} />
        <div className={styles.orbSecondary} />
        <div className={styles.gridGlow} />
        <motion.div
          className={styles.loadingPanel}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonGrid}>
            <span />
            <span />
            <span />
          </div>
        </motion.div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className={styles.page}>
        <div className={styles.orbPrimary} />
        <div className={styles.orbSecondary} />
        <div className={styles.gridGlow} />
        <div className={styles.loadingPanel}>
          <h1 className={styles.dashboardTitle}>Dashboard unavailable</h1>
          <p className={styles.headerSubtitle}>{error || 'We could not load your account right now.'}</p>
        </div>
      </div>
    )
  }

  const usagePct = account.ops_limit
    ? Math.min(100, Math.round((account.ops_used_this_month / account.ops_limit) * 100))
    : 0
  const remainingOps = Math.max(0, (account.ops_limit || 0) - (account.ops_used_this_month || 0))

  return (
    <div className={styles.page}>
      <div className={styles.orbPrimary} />
      <div className={styles.orbSecondary} />
      <div className={styles.gridGlow} />

      <motion.div
        className={styles.dashboard}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <header className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>Authenticated session</span>
            <h1 className={styles.dashboardTitle}>Dashboard</h1>
            <p className={styles.headerSubtitle}>
              Welcome back, {account.email.split('@')[0]}. Monitor monthly usage, manage API keys, and ship against the live platform.
            </p>
          </div>
          <div className={styles.heroActions}>
            <span className={styles.planBadge}>{account.plan} plan</span>
            <button className={styles.ghostAction} onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Usage this month</span>
            <span className={styles.statValue}>
              {account.ops_used_this_month.toLocaleString()}
              <span className={styles.statMax}> / {account.ops_limit.toLocaleString()}</span>
            </span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${usagePct}%` }} data-warning={usagePct > 80} />
            </div>
            <span className={styles.statHint}>{usagePct}% used</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ops remaining</span>
            <span className={styles.statValue}>{remainingOps.toLocaleString()}</span>
            <span className={styles.statHint}>Resets monthly</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active keys</span>
            <span className={styles.statValue}>{account.keys_count}</span>
            <span className={styles.statHint}>Across your account</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Member since</span>
            <span className={styles.statValue}>{account.member_since}</span>
            <span className={styles.statHint}>{account.email}</span>
          </div>
        </div>

        <div className={styles.layoutGrid}>
          <section className={styles.sectionWide}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>API keys</h2>
                <p className={styles.sectionCopy}>Create dedicated keys per project and revoke them when you rotate infrastructure.</p>
              </div>
              <button
                className={styles.primaryAction}
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
                  className={styles.createPanel}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {!newKeyResult ? (
                    <form onSubmit={handleCreateKey} className={styles.inlineForm}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Key name, for example production-api or staging-bot"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                      <button className={styles.primaryAction} type="submit" disabled={creatingKey}>
                        {creatingKey ? 'Creating...' : 'Create key'}
                      </button>
                    </form>
                  ) : (
                    <div className={styles.newKeyCard}>
                      <div>
                        <span className={styles.newKeyLabel}>Save this key now</span>
                        <p className={styles.newKeyText}>It will not be shown again after you leave this panel.</p>
                      </div>
                      <div className={styles.keyBlock}>
                        <code className={styles.keyText}>{newKeyResult.api_key}</code>
                        <CopyBtn text={newKeyResult.api_key} label="Copy" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.keysTable}>
              <div className={styles.keysHeader}>
                <span>Prefix</span>
                <span>Name</span>
                <span>Status</span>
                <span>Created</span>
                <span></span>
              </div>

              {apiKeys.length === 0 ? (
                <p className={styles.emptyState}>No keys found yet.</p>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.key_prefix} className={styles.keyRow} data-inactive={!key.is_active}>
                    <span className={styles.keyPrefix}><code>{key.key_prefix}</code></span>
                    <span className={styles.keyName}>{key.name || 'Default key'}</span>
                    <span className={styles.keyStatus}>
                      <span className={styles.statusDot} data-active={key.is_active} />
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                    <span className={styles.keyDate}>{new Date(key.created_at).toLocaleDateString()}</span>
                    <span className={styles.keyAction}>
                      {key.is_active && (
                        <button
                          className={styles.revokeBtn}
                          onClick={() => handleDeleteKey(key.key_prefix)}
                          disabled={deletingPrefix === key.key_prefix}
                        >
                          {deletingPrefix === key.key_prefix ? 'Working...' : 'Revoke'}
                        </button>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={styles.stackColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Current plan</h2>
              <div className={styles.planPanel}>
                <span className={styles.planName}>{account.plan}</span>
                <span className={styles.planMeta}>Free forever up to {account.ops_limit.toLocaleString()} ops per month.</span>
              </div>
              <a className={styles.inlineLink} href="/#pricing">See pricing →</a>
            </div>

            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Account</h2>
              <dl className={styles.accountGrid}>
                <div>
                  <dt>Email</dt>
                  <dd>{account.email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{new Date(account.member_since).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt>Credits</dt>
                  <dd>{account.credits.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Keys</dt>
                  <dd>{account.keys_count}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Quick links</h2>
              <div className={styles.linksList}>
                <a href="https://memorylayer-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">API documentation</a>
                <a href="/benchmark">Benchmark results</a>
                <a href="/roadmap">Roadmap</a>
                <a href="https://github.com/patelyash2511/rec0" target="_blank" rel="noopener noreferrer">GitHub repository</a>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.sectionWide}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Quick start</h2>
              <p className={styles.sectionCopy}>Use your latest live key to start storing and recalling memories immediately.</p>
            </div>
            <a className={styles.inlineLink} href="https://memorylayer-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer">Open docs →</a>
          </div>
          <pre className={styles.snippet}>
            <code>{`pip install memorylayer-py

from rec0 import Memory

mem = Memory(api_key="YOUR_KEY_HERE")
mem.store(user_id="user_123",
          content="Likes dark mode")

results = mem.recall(user_id="user_123",
                     query="preferences")`}</code>
          </pre>
        </section>
      </motion.div>
    </div>
  )
}
