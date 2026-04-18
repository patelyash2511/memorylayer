import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import styles from './Benchmark.module.css'

/* ── Config ──────────────────────────────────────────── */

const REGIONS = [
  { id: 'auto',  label: 'Auto (your location)',        url: 'https://memorylayer-production.up.railway.app', available: true },
  { id: 'us',    label: 'US East (Virginia)',           url: 'https://memorylayer-production.up.railway.app', available: true },
  { id: 'eu',    label: 'EU West (Ireland)',            url: 'https://memorylayer-production.up.railway.app', available: false },
  { id: 'ap',    label: 'Asia Pacific (Singapore)',     url: 'https://memorylayer-production.up.railway.app', available: false },
]

const BATCH_SIZE = 50
const TIMEOUT_MS = 10_000

const ENDPOINTS = {
  store:  { count: 400, method: 'POST', path: '/v1/memory/store',  body: { user_id: 'benchmark_user', app_id: 'benchmark', content: 'Benchmark test memory' } },
  recall: { count: 400, method: 'POST', path: '/v1/memory/recall', body: { user_id: 'benchmark_user', app_id: 'benchmark', query: 'test' } },
  health: { count: 200, method: 'GET',  path: '/health',           body: null },
}

const TOTAL = Object.values(ENDPOINTS).reduce((s, e) => s + e.count, 0)

/* ── Helpers ─────────────────────────────────────────── */

function pct(sorted, p) {
  if (!sorted.length) return 0
  const i = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, i)]
}

function fmt(n) { return Number(n.toFixed(1)) }

function rateClass(rate) {
  if (rate >= 99) return styles.rateGreen
  if (rate >= 95) return styles.rateYellow
  return styles.rateRed
}

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

/* ── Component ───────────────────────────────────────── */

export default function Benchmark() {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [region, setRegion] = useState('auto')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: TOTAL })
  const [elapsed, setElapsed] = useState(0)
  const [results, setResults] = useState(null)
  const timerRef = useRef(null)
  const doneRef = useRef(0)

  const runBenchmark = useCallback(async () => {
    const regionObj = REGIONS.find(r => r.id === region) || REGIONS[0]
    const base = regionObj.url

    setRunning(true)
    setResults(null)
    setAuthError(false)
    doneRef.current = 0
    setProgress({ done: 0, total: TOTAL })
    setElapsed(0)

    const startWall = performance.now()
    timerRef.current = setInterval(() => {
      setElapsed(((performance.now() - startWall) / 1000))
    }, 200)

    const latencies = { store: [], recall: [], health: [] }
    const errors = { timeouts: 0, http500: 0, http429: 0, network: 0, other: 0 }

    /* build flat request list */
    const requests = []
    for (const [type, cfg] of Object.entries(ENDPOINTS)) {
      for (let i = 0; i < cfg.count; i++) {
        requests.push({ type, method: cfg.method, url: `${base}${cfg.path}`, body: cfg.body })
      }
    }
    /* shuffle so endpoint types are interleaved */
    for (let i = requests.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [requests[i], requests[j]] = [requests[j], requests[i]]
    }

    async function exec(req) {
      const t0 = performance.now()
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
        const resp = await fetch(req.url, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: req.body ? JSON.stringify(req.body) : undefined,
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        const ms = performance.now() - t0
        if (resp.ok) {
          latencies[req.type].push(ms)
        } else if (resp.status === 401) {
          setAuthError(true)
          errors.other++
        } else if (resp.status === 500) {
          errors.http500++
        } else if (resp.status === 429) {
          errors.http429++
        } else {
          errors.other++
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          errors.timeouts++
        } else {
          errors.network++
        }
      }
      doneRef.current++
      setProgress({ done: doneRef.current, total: TOTAL })
    }

    /* run in batches */
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(exec))
    }

    clearInterval(timerRef.current)
    const duration = (performance.now() - startWall) / 1000

    /* sort latencies */
    for (const key of Object.keys(latencies)) {
      latencies[key].sort((a, b) => a - b)
    }

    const allLats = [...latencies.store, ...latencies.recall, ...latencies.health].sort((a, b) => a - b)
    const totalSuccess = allLats.length
    const totalErrors = errors.timeouts + errors.http500 + errors.http429 + errors.network + errors.other

    setResults({
      region: regionObj.label,
      timestamp: ts(),
      duration: fmt(duration),
      overall: {
        total: TOTAL,
        success: totalSuccess,
        failed: totalErrors,
        successRate: fmt((totalSuccess / TOTAL) * 100),
        throughput: fmt(TOTAL / duration),
      },
      endpoints: Object.entries(latencies).map(([type, lats]) => {
        const cfg = ENDPOINTS[type]
        const ok = lats.length
        return {
          type,
          label: type === 'store' ? 'POST /v1/memory/store' : type === 'recall' ? 'POST /v1/memory/recall' : 'GET /health',
          total: cfg.count,
          success: ok,
          successRate: fmt((ok / cfg.count) * 100),
          p50: fmt(pct(lats, 50)),
          p95: fmt(pct(lats, 95)),
          p99: fmt(pct(lats, 99)),
          max: lats.length ? fmt(lats[lats.length - 1]) : 0,
        }
      }),
      errors,
    })
    setElapsed(duration)
    setRunning(false)
  }, [region, apiKey])

  return (
    <div className={styles.page}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <motion.div
        className={styles.container}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>Performance</span>
          <h1 className={styles.heading}>rec0 API Benchmark</h1>
          <p className={styles.sub}>
            Production load testing with {TOTAL.toLocaleString()} concurrent requests
          </p>
        </div>

        {/* API key input */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>API Key <span className={styles.required}>(required)</span></h2>
          <div className={styles.keyInputWrap}>
            <input
              type={showKey ? 'text' : 'password'}
              className={styles.keyInput}
              placeholder="r0_live_sk_xxxxxxxxxxxxx"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setAuthError(false) }}
              disabled={running}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className={styles.toggleKey}
              onClick={() => setShowKey(v => !v)}
              tabIndex={-1}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {authError && (
            <p className={styles.authError}>Invalid API key. Get one at <a href="/signup">rec0.ai/signup</a></p>
          )}
          <p className={styles.keyHint}>
            This benchmark will use {TOTAL.toLocaleString()} ops from your account. Free tier includes 10,000 ops/month.{' '}
            <a href="/signup" className={styles.keyLink}>Get your key at rec0.ai/signup &rarr;</a>
          </p>
        </div>

        {/* Region selector */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Region</h2>
          <div className={styles.regionList}>
            {REGIONS.map(r => (
              <label key={r.id} className={`${styles.regionOption} ${region === r.id ? styles.regionActive : ''}`}>
                <input
                  type="radio"
                  name="region"
                  value={r.id}
                  checked={region === r.id}
                  onChange={() => setRegion(r.id)}
                  disabled={running}
                  className={styles.radioInput}
                />
                <span className={styles.radioCircle} />
                <span>{r.label}</span>
                {!r.available && <span className={styles.comingSoon}>Coming soon</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          className={styles.runBtn}
          onClick={runBenchmark}
          disabled={!apiKey.trim() || running}
        >
          {running ? (
            <>
              <span className={styles.spinner} />
              Running&hellip; {progress.done.toLocaleString()}/{progress.total.toLocaleString()} requests
            </>
          ) : (
            `Run ${TOTAL.toLocaleString()} request benchmark \u2192`
          )}
        </button>

        {running && (
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <span className={styles.progressTime}>Elapsed: {elapsed.toFixed(1)}s</span>
          </div>
        )}

        {/* Warning */}
        <p className={styles.warning}>
          &#9888; This benchmark fires {TOTAL.toLocaleString()} real API calls to Railway and will count against your usage limits.
        </p>

        {/* Results */}
        {results && (
          <motion.div
            className={styles.resultsWrap}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Meta */}
            <div className={styles.meta}>
              <span>Last run: {results.timestamp}</span>
              <span>Region: {results.region}</span>
              <span>Duration: {results.duration}s</span>
            </div>

            {/* Overall */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Overall metrics</h3>
              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Total requests</span>
                  <span className={styles.metricValue}>{results.overall.total.toLocaleString()}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Successful</span>
                  <span className={`${styles.metricValue} ${rateClass(results.overall.successRate)}`}>
                    {results.overall.success.toLocaleString()} <span className={styles.unit}>({results.overall.successRate}%)</span>
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Failed</span>
                  <span className={styles.metricValue}>
                    {results.overall.failed} <span className={styles.unit}>({fmt((results.overall.failed / results.overall.total) * 100)}%)</span>
                  </span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Avg throughput</span>
                  <span className={styles.metricValue}>{results.overall.throughput} <span className={styles.unit}>req/s</span></span>
                </div>
              </div>
            </div>

            {/* Per-endpoint cards */}
            {results.endpoints.map(ep => (
              <div key={ep.type} className={styles.card}>
                <h3 className={styles.cardTitle}>{ep.label}</h3>
                <div className={styles.metricsRow}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Requests</span>
                    <span className={styles.metricValue}>{ep.total}</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Success rate</span>
                    <span className={`${styles.metricValue} ${rateClass(ep.successRate)}`}>
                      {ep.successRate}% <span className={styles.unit}>({ep.success}/{ep.total})</span>
                    </span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p50 latency</span>
                    <span className={styles.metricValue}>{ep.p50}<span className={styles.unit}>ms</span></span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p95 latency</span>
                    <span className={styles.metricValue}>{ep.p95}<span className={styles.unit}>ms</span></span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p99 latency</span>
                    <span className={styles.metricValue}>{ep.p99}<span className={styles.unit}>ms</span></span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Max latency</span>
                    <span className={styles.metricValue}>{ep.max}<span className={styles.unit}>ms</span></span>
                  </div>
                </div>
              </div>
            ))}

            {/* Error breakdown */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Error breakdown</h3>
              <div className={styles.metricsRow}>
                {[
                  ['Timeouts', results.errors.timeouts],
                  ['500 errors', results.errors.http500],
                  ['429 errors', results.errors.http429],
                  ['Network errors', results.errors.network],
                  ['Other errors', results.errors.other],
                ].map(([label, count]) => (
                  <div key={label} className={styles.metric}>
                    <span className={styles.metricLabel}>{label}</span>
                    <span className={styles.metricValue}>
                      {count} <span className={styles.unit}>({fmt((count / TOTAL) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <p className={styles.note}>
          Latency varies by region and network conditions. Requests run in batches of {BATCH_SIZE} concurrent.
        </p>
      </motion.div>
    </div>
  )
}
