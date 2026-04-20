import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import styles from './Roadmap.module.css'

/* ── Phase data ──────────────────────────────────────── */

const PHASES = [
  {
    title: 'Phase 1: Infrastructure',
    timeline: 'Week 1–2',
    status: 'in-progress',
    statusLabel: '🔄 In Progress',
    items: [
      {
        icon: '✅',
        title: 'Upgrade Railway tier',
        from: 'Hobby ($5/mo)',
        to: 'Pro ($20/mo)',
        impact: '2x CPU, 4x memory',
      },
      {
        icon: '🔄',
        title: 'Add Redis caching layer',
        detail: 'Cache frequent query embeddings',
        impact: '50% latency reduction on recalls',
      },
      {
        icon: '🔄',
        title: 'Optimize PostgreSQL connection pooling',
        detail: 'Add pgBouncer',
        impact: '30% improvement under load',
      },
    ],
  },
  {
    title: 'Phase 2: Embeddings',
    timeline: 'Week 3–4',
    status: 'planned',
    statusLabel: '📋 Planned',
    items: [
      {
        icon: '🔜',
        title: 'Switch to Voyage AI embeddings',
        from: 'Local ONNX (slow)',
        to: 'Voyage API (fast)',
        impact: '10x faster embedding generation',
      },
      {
        icon: '🔜',
        title: 'Cache embeddings aggressively',
        detail: 'Store computed embeddings',
        impact: '90% of recalls become instant',
      },
    ],
  },
  {
    title: 'Phase 3: Architecture',
    timeline: 'Month 2',
    status: 'planned',
    statusLabel: '📋 Planned',
    items: [
      {
        icon: '🔜',
        title: 'Add async processing queue',
        detail: 'Store returns immediately, process async',
        impact: 'Sub-100ms store latency',
      },
      {
        icon: '🔜',
        title: 'Geographic edge deployment',
        detail: 'Deploy to US East, EU West, Asia Pacific',
        impact: '50–200ms latency based on location',
      },
      {
        icon: '🔜',
        title: 'Smart query routing',
        detail: 'Route simple queries to fast path',
        impact: '80% of queries <50ms',
      },
    ],
  },
]

const TARGETS = [
  { endpoint: 'Store',  p50: '<100ms', p95: '<200ms' },
  { endpoint: 'Recall', p50: '<80ms',  p95: '<150ms' },
  { endpoint: 'Health', p50: '<10ms',  p95: '<20ms' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

/* ── Component ───────────────────────────────────────── */

export default function Roadmap() {
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
          <span className={styles.eyebrow}>Roadmap</span>
          <h1 className={styles.heading}>Performance Optimization Roadmap</h1>
          <p className={styles.sub}>Making rec0 the fastest memory API</p>
        </div>

        {/* Current state */}
        <div className={styles.stateCard}>
          <h2 className={styles.stateTitle}>Current State &mdash; April 2026</h2>
          <div className={styles.stateGrid}>
            <div className={styles.stateItem}>
              <span className={styles.stateIcon}>✅</span>
              <div>
                <strong>100% reliability</strong>
                <p>Zero errors across all production tests</p>
              </div>
            </div>
            <div className={styles.stateItem}>
              <span className={styles.stateIcon}>⚠️</span>
              <div>
                <strong>3–5s latency (optimizing)</strong>
                <p>Local embeddings on Railway free tier</p>
              </div>
            </div>
            <div className={`${styles.stateItem} ${styles.stateTarget}`}>
              <span className={styles.stateIcon}>🎯</span>
              <div>
                <strong>Target: &lt;100ms p95 by Q2 2026</strong>
                <p>See our plan below</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phases */}
        {PHASES.map((phase, pi) => (
          <motion.div
            key={phase.title}
            className={styles.phaseCard}
            custom={pi}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
          >
            <div className={styles.phaseHeader}>
              <div>
                <h2 className={styles.phaseTitle}>{phase.title}</h2>
                <span className={styles.phaseTimeline}>{phase.timeline}</span>
              </div>
              <span className={`${styles.badge} ${styles[phase.status]}`}>
                {phase.statusLabel}
              </span>
            </div>

            {/* Progress bar */}
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: phase.status === 'in-progress' ? '35%' : '0%' }}
              />
            </div>

            <div className={styles.items}>
              {phase.items.map(item => (
                <div key={item.title} className={styles.item}>
                  <span className={styles.itemIcon}>{item.icon}</span>
                  <div className={styles.itemBody}>
                    <strong>{item.title}</strong>
                    {item.from && (
                      <div className={styles.migration}>
                        <span className={styles.migrationFrom}>From: {item.from}</span>
                        <span className={styles.migrationArrow}>&rarr;</span>
                        <span className={styles.migrationTo}>To: {item.to}</span>
                      </div>
                    )}
                    {item.detail && <p className={styles.itemDetail}>{item.detail}</p>}
                    <span className={styles.impact}>Impact: {item.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Target performance */}
        <div className={styles.targetCard}>
          <h2 className={styles.targetTitle}>Expected Performance After Optimization</h2>
          <p className={styles.targetSub}>Target metrics &mdash; Q2 2026</p>

          <div className={styles.targetTable}>
            <div className={`${styles.targetRow} ${styles.targetHead}`}>
              <span>Endpoint</span>
              <span>p50</span>
              <span>p95</span>
            </div>
            {TARGETS.map(t => (
              <div key={t.endpoint} className={styles.targetRow}>
                <span className={styles.targetEndpoint}>{t.endpoint}</span>
                <span className={styles.targetValue}>{t.p50}</span>
                <span className={styles.targetValue}>{t.p95}</span>
              </div>
            ))}
          </div>

          <div className={styles.targetExtras}>
            <div className={styles.targetExtra}>
              <span className={styles.targetExtraLabel}>Throughput</span>
              <span className={styles.targetExtraValue}>100+ req/s</span>
            </div>
            <div className={styles.targetExtra}>
              <span className={styles.targetExtraLabel}>Uptime SLA</span>
              <span className={styles.targetExtraValue}>99.9%</span>
            </div>
          </div>
        </div>

        {/* Transparency section */}
        <div className={styles.transparencyCard}>
          <h2 className={styles.transparencyTitle}>Why We&rsquo;re Transparent</h2>
          <p className={styles.transparencyBody}>
            We believe in honest communication with developers. rec0 is in open beta.
            The API is stable and reliable, but we know it&rsquo;s slow under load.
            Rather than hide this, we&rsquo;re showing you exactly what we&rsquo;re doing to fix it.
          </p>

          <div className={styles.links}>
            <a href="https://github.com/patelyash2511/rec0/milestones" target="_blank" rel="noopener noreferrer" className={styles.link}>
              GitHub Milestones &rarr;
            </a>
            <Link to="/benchmark" className={styles.link}>
              Benchmark Results &rarr;
            </Link>
          </div>

          <p className={styles.contact}>
            Questions? Email <a href="mailto:yash@rec0.ai">yash@rec0.ai</a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
