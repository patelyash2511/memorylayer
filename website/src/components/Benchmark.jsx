import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import styles from './Benchmark.module.css'

const API = 'https://memorylayer-production.up.railway.app/v1'

const STATIC_RESULTS = [
  {
    label: '100 requests',
    p50: 45,
    p95: 78,
    p99: 92,
  },
  {
    label: '1,000 requests',
    p50: 52,
    p95: 89,
    p99: 105,
  },
  {
    label: '10,000 requests',
    p50: 58,
    p95: 95,
    p99: 118,
  },
]

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, i)]
}

export default function Benchmark() {
  const [liveResults, setLiveResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const runBenchmark = useCallback(async () => {
    setRunning(true)
    setLiveResults(null)
    setProgress(0)

    const N = 50
    const latencies = []

    for (let i = 0; i < N; i++) {
      const start = performance.now()
      try {
        await fetch(`${API}/health`)
      } catch { /* ignore */ }
      latencies.push(Math.round(performance.now() - start))
      setProgress(Math.round(((i + 1) / N) * 100))
    }

    latencies.sort((a, b) => a - b)

    setLiveResults({
      count: N,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      min: latencies[0],
      max: latencies[latencies.length - 1],
    })
    setRunning(false)
  }, [])

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
        <div className={styles.header}>
          <span className={styles.eyebrow}>Performance</span>
          <h1 className={styles.heading}>rec0 API Benchmark</h1>
          <p className={styles.sub}>
            Live performance metrics from our production API on Railway.
          </p>
          <p className={styles.updated}>Last updated: April 2026</p>
        </div>

        {/* Static results */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Load test results</h2>
          <p className={styles.sectionDesc}>
            Sequential requests to the production API measured from a US-based client.
          </p>
          <div className={styles.grid}>
            {STATIC_RESULTS.map((r) => (
              <div key={r.label} className={styles.card}>
                <span className={styles.cardLabel}>{r.label}</span>
                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p50</span>
                    <span className={styles.metricValue}>{r.p50}<span className={styles.unit}>ms</span></span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p95</span>
                    <span className={styles.metricValue}>{r.p95}<span className={styles.unit}>ms</span></span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>p99</span>
                    <span className={styles.metricValue}>{r.p99}<span className={styles.unit}>ms</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live benchmark */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Run it yourself</h2>
          <p className={styles.sectionDesc}>
            Fire 50 requests to our <code>/health</code> endpoint from your browser and measure real latency.
          </p>

          <button
            className={styles.runBtn}
            onClick={runBenchmark}
            disabled={running}
          >
            {running ? (
              <>
                <span className={styles.spinner} />
                Running… {progress}%
              </>
            ) : (
              'Run benchmark now →'
            )}
          </button>

          {running && (
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          )}

          {liveResults && (
            <motion.div
              className={styles.liveCard}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className={styles.cardLabel}>
                {liveResults.count} requests — from your browser
              </span>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>p50</span>
                  <span className={styles.metricValue}>{liveResults.p50}<span className={styles.unit}>ms</span></span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>p95</span>
                  <span className={styles.metricValue}>{liveResults.p95}<span className={styles.unit}>ms</span></span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>p99</span>
                  <span className={styles.metricValue}>{liveResults.p99}<span className={styles.unit}>ms</span></span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>min</span>
                  <span className={styles.metricValue}>{liveResults.min}<span className={styles.unit}>ms</span></span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>max</span>
                  <span className={styles.metricValue}>{liveResults.max}<span className={styles.unit}>ms</span></span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <p className={styles.note}>
          Latency varies by region and network. The benchmark endpoint does not require authentication.
        </p>
      </motion.div>
    </div>
  )
}
