import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'

const API = 'https://memorylayer-production.up.railway.app/v1'

function getSessionToken() {
  const match = document.cookie.match(/(?:^|; )session_token=([^;]*)/)
  return match ? match[1] : null
}

function clearSessionCookie() {
  document.cookie = 'session_token=; path=/; max-age=0; SameSite=Strict; Secure'
}

/* ── tiny copy helper ──────────────────────────────────── */
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
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

/* ── main dashboard ────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [keys, setKeys] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const sessionToken = getSessionToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
  }

  // auto-load on mount if session exists
  useEffect(() => {
    if (!sessionToken) {
      navigate('/login')
      return
    }
    loadDashboard()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // new-key form state
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState(null)

  // deleting key
  const [deletingPrefix, setDeletingPrefix] = useState(null)

  /* ── fetch account + keys ─────────────────────────────── */
  async function loadDashboard() {
    setError(null)
    setLoading(true)
    try {
      const [meResp, keysResp] = await Promise.all([
        fetch(`${API}/auth/me`, { headers }),
        fetch(`${API}/auth/keys`, { headers }),
      ])
      if (!meResp.ok || !keysResp.ok) {
        if (meResp.status === 401 || keysResp.status === 401) {
          clearSessionCookie()
          navigate('/login')
          return
        }
        setError('Something went wrong loading your account.')
        setLoading(false)
        return
      }
      const meData = await meResp.json()
      const keysData = await keysResp.json()
      setAccount(meData)
      setKeys(keysData.keys || [])
    } catch {
      setError("Couldn't reach our servers. Check your connection.")
    } finally {
      setLoading(false)
    }
  }

  /* ── create key ───────────────────────────────────────── */
  async function handleCreateKey(e) {
    e.preventDefault()
    if (creatingKey) return
    setCreatingKey(true)
    setNewKeyResult(null)
    try {
      const resp = await fetch(`${API}/auth/keys/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newKeyName.trim() || 'New key', mode: 'live' }),
      })
      if (!resp.ok) {
        setError('Failed to create key.')
        setCreatingKey(false)
        return
      }
      const data = await resp.json()
      setNewKeyResult(data)
      // reload keys list
      const keysResp = await fetch(`${API}/auth/keys`, { headers })
      if (keysResp.ok) {
        const keysData = await keysResp.json()
        setKeys(keysData.keys || [])
      }
    } catch {
      setError('Network error creating key.')
    } finally {
      setCreatingKey(false)
    }
  }

  /* ── delete key ───────────────────────────────────────── */
  async function handleDeleteKey(prefix) {
    setDeletingPrefix(prefix)
    setError(null)
    try {
      const resp = await fetch(`${API}/auth/keys/${encodeURIComponent(prefix)}`, {
        method: 'DELETE',
        headers,
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        if (data?.detail?.error === 'cannot_delete_last_key') {
          setError("Can't revoke your last active key. Create a new one first.")
        } else {
          setError('Failed to revoke key.')
        }
        setDeletingPrefix(null)
        return
      }
      // reload
      const keysResp = await fetch(`${API}/auth/keys`, { headers })
      if (keysResp.ok) {
        const keysData = await keysResp.json()
        setKeys(keysData.keys || [])
      }
    } catch {
      setError('Network error revoking key.')
    } finally {
      setDeletingPrefix(null)
    }
  }

  /* ── loading / redirect state ───────────────────────────── */
  if (!account) {
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
          <h1 className={styles.heading}>Dashboard</h1>
          {loading ? (
            <p className={styles.sub}>Loading your account…</p>
          ) : error ? (
            <>
              <motion.div
                className={styles.error}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
              <p className={styles.footerLink}>
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          ) : null}
        </motion.div>
      </div>
    )
  }

  /* ── dashboard view ───────────────────────────────────── */
  const usagePct = account.ops_limit
    ? Math.min(100, Math.round((account.ops_used_this_month / account.ops_limit) * 100))
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <motion.div
        className={styles.dashboard}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* ── Account header ──────────────────────────────── */}
        <div className={styles.accountHeader}>
          <div>
            <h1 className={styles.heading}>Dashboard</h1>
            <p className={styles.accountEmail}>{account.email}</p>
          </div>
          <div className={styles.planBadge}>{account.plan}</div>
        </div>

        {error && (
          <motion.div
            className={styles.error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* ── Usage stats ─────────────────────────────────── */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Ops this month</span>
            <span className={styles.statValue}>
              {account.ops_used_this_month.toLocaleString()}
              <span className={styles.statMax}> / {account.ops_limit.toLocaleString()}</span>
            </span>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${usagePct}%` }}
                data-warning={usagePct > 80}
              />
            </div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Plan</span>
            <span className={styles.statValue} style={{ textTransform: 'capitalize' }}>
              {account.plan}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active keys</span>
            <span className={styles.statValue}>{account.keys_count}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Member since</span>
            <span className={styles.statValue}>{account.member_since}</span>
          </div>
        </div>

        {/* ── API Keys section ────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>API Keys</h2>
            <button
              className={styles.createBtn}
              onClick={() => { setShowCreate(!showCreate); setNewKeyResult(null); setNewKeyName('') }}
            >
              {showCreate ? 'Cancel' : '+ New key'}
            </button>
          </div>

          {/* New key form */}
          <AnimatePresence>
            {showCreate && (
              <motion.div
                className={styles.createForm}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {!newKeyResult ? (
                  <form onSubmit={handleCreateKey} className={styles.inlineForm}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Key name (e.g. staging, bot-v2)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className={styles.submit}
                      disabled={creatingKey}
                      style={{ flex: 'none', width: 'auto', padding: '12px 24px' }}
                    >
                      {creatingKey ? 'Creating…' : 'Create key'}
                    </button>
                  </form>
                ) : (
                  <div className={styles.newKeyResult}>
                    <p className={styles.newKeyLabel}>
                      New key created — <strong>save it now</strong>, we cannot show it again:
                    </p>
                    <div className={styles.keyBlock}>
                      <code className={styles.keyText}>{newKeyResult.api_key}</code>
                      <CopyBtn text={newKeyResult.api_key} label="Copy" />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keys table */}
          <div className={styles.keysTable}>
            <div className={styles.keysHeader}>
              <span>Prefix</span>
              <span>Name</span>
              <span>Status</span>
              <span>Created</span>
              <span></span>
            </div>
            {keys.map((k) => (
              <div key={k.key_prefix} className={styles.keyRow} data-inactive={!k.is_active}>
                <span className={styles.keyPrefix}>
                  <code>{k.key_prefix}</code>
                </span>
                <span className={styles.keyName}>{k.name || '—'}</span>
                <span>
                  <span
                    className={styles.statusDot}
                    data-active={k.is_active}
                  />
                  {k.is_active ? 'Active' : 'Revoked'}
                </span>
                <span className={styles.keyDate}>
                  {k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}
                </span>
                <span>
                  {k.is_active && (
                    <button
                      className={styles.revokeBtn}
                      onClick={() => handleDeleteKey(k.key_prefix)}
                      disabled={deletingPrefix === k.key_prefix}
                    >
                      {deletingPrefix === k.key_prefix ? '…' : 'Revoke'}
                    </button>
                  )}
                </span>
              </div>
            ))}
            {keys.length === 0 && (
              <p className={styles.emptyState}>No keys found.</p>
            )}
          </div>
        </div>

        {/* ── Quickstart reminder ─────────────────────────── */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Quick start</h2>
          <pre className={styles.snippet}>
            <code>{`pip install memorylayer-py

from rec0 import Memory

mem = Memory(api_key="YOUR_KEY_HERE")
mem.store(user_id="user_123",
          content="Likes dark mode")

results = mem.recall(user_id="user_123",
                     query="preferences")`}</code>
          </pre>
        </div>

        {/* ── Footer links ────────────────────────────────── */}
        <div className={styles.dashFooter}>
          <a
            href="https://memorylayer-production.up.railway.app/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            API docs
          </a>
          <a href="https://github.com/patelyash2511/rec0" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <button
            className={styles.logoutBtn}
            onClick={async () => {
              try {
                await fetch(`${API}/auth/logout`, { method: 'POST', headers })
              } catch { /* ignore */ }
              clearSessionCookie()
              navigate('/login')
            }}
          >
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  )
}
