import { motion } from 'framer-motion'
import styles from './Benchmark.module.css'

/* ── Static results from production test (April 21, 2026) ── */

const RESULTS = {
  date: 'April 21, 2026',
  config: { total: 100, store: 40, recall: 40, health: 20, concurrency: 5, region: 'US East' },
  overall: { total: 100, success: 100, failed: 0, throughput: 0.9 },
  endpoints: [
    { label: 'POST /v1/memory/store',  total: 40, success: 40, p50: 3322, p95: 4522, p99: 5027, max: 5027 },
    { label: 'POST /v1/memory/recall', total: 40, success: 40, p50: 3911, p95: 4778, p99: 5140, max: 5140 },
    { label: 'GET /health',            total: 20, success: 20, p50: 841,  p95: 1760, p99: 2273, max: 2273 },
  ],
  errors: { timeouts: 0, http500: 0, http429: 0, network: 0, other: 0 },
}

const TARGETS = [
  { label: 'p50 latency', value: '<100ms' },
  { label: 'p95 latency', value: '<200ms' },
  { label: 'Throughput',  value: '100+ req/s' },
]

function Metric({ label, children }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{children}</span>
    </div>
  )
}

export default function Benchmark() {
  const { config, overall, endpoints, errors } = RESULTS

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
          <h1 className={styles.heading}>rec0 API Benchmark Results</h1>
          <p className={styles.sub}>
            Real production load test &mdash; {overall.success}/{overall.total} requests succeeded
          </p>
          <p className={styles.updated}>Last updated: {RESULTS.date}</p>
        </div>

        {/* Test config */}
        <div className={styles.configCard}>
          <h3 className={styles.cardTitle}>Test configuration</h3>
          <ul className={styles.configList}>
            <li>{config.total} total requests ({config.store} store, {config.recall} recall, {config.health} health)</li>
            <li>{config.concurrency} concurrent requests per batch</li>
            <li>Tested from {config.region} region</li>
            <li>Production API on Railway</li>
          </ul>
        </div>

        {/* Overall */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Overall metrics</h3>
          <div className={styles.metricsRow}>
            <Metric label="Total requests">{overall.total}</Metric>
            <Metric label="Successful">
              <span className={styles.rateGreen}>{overall.success} <span className={styles.unit}>(100%)</span></span>
            </Metric>
            <Metric label="Failed">0 <span className={styles.unit}>(0%)</span></Metric>
            <Metric label="Avg throughput">{overall.throughput} <span className={styles.unit}>req/s</span></Metric>
          </div>
        </div>

        {/* Per-endpoint cards */}
        {endpoints.map(ep => (
          <div key={ep.label} className={styles.card}>
            <h3 className={styles.cardTitle}>{ep.label}</h3>
            <div className={styles.metricsRow}>
              <Metric label="Requests">{ep.total}</Metric>
              <Metric label="Success rate">
                <span className={styles.rateGreen}>100% <span className={styles.unit}>({ep.success}/{ep.total})</span></span>
              </Metric>
              <Metric label="p50 latency">{ep.p50.toLocaleString()}<span className={styles.unit}>ms</span></Metric>
              <Metric label="p95 latency">{ep.p95.toLocaleString()}<span className={styles.unit}>ms</span></Metric>
              <Metric label="p99 latency">{ep.p99.toLocaleString()}<span className={styles.unit}>ms</span></Metric>
              <Metric label="Max latency">{ep.max.toLocaleString()}<span className={styles.unit}>ms</span></Metric>
            </div>
          </div>
        ))}

        {/* Error breakdown */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Error breakdown</h3>
          <div className={styles.metricsRow}>
            {Object.entries(errors).map(([key, count]) => {
              const labels = { timeouts: 'Timeouts', http500: '500 errors', http429: '429 errors', network: 'Network errors', other: 'Other errors' }
              return (
                <Metric key={key} label={labels[key] || key}>
                  {count} <span className={styles.unit}>(0%)</span>
                </Metric>
              )
            })}
          </div>
        </div>

        {/* Context / Understanding section */}
        <div className={styles.contextCard}>
          <h3 className={styles.contextTitle}>Understanding these numbers</h3>

          <div className={styles.contextItem}>
            <span className={styles.contextIcon}>&#10003;</span>
            <div>
              <strong>Reliability: 100%</strong>
              <p>Our API handled 100 requests with zero errors. No timeouts, no failures.</p>
            </div>
          </div>

          <div className={styles.contextItem}>
            <span className={styles.contextIcon}>&#9202;</span>
            <div>
              <strong>Latency: 3&ndash;5s (optimizing)</strong>
              <p>
                Current latency is higher than target because we run local embeddings on Railway&rsquo;s
                free tier. Single-user requests are faster (~1&ndash;2s). See our optimization roadmap below.
              </p>
            </div>
          </div>

          <div className={styles.contextItem}>
            <span className={styles.contextIcon}>&#127919;</span>
            <div>
              <strong>Target performance (Q2 2026)</strong>
              <div className={styles.targetGrid}>
                {TARGETS.map(t => (
                  <div key={t.label} className={styles.targetItem}>
                    <span className={styles.targetLabel}>{t.label}</span>
                    <span className={styles.targetValue}>{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={styles.note}>
          These results are from a real load test against our production API on {RESULTS.date}.
          We run benchmarks regularly to ensure reliability.
        </p>
      </motion.div>
    </div>
  )
}
