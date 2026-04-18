import FadeIn from './FadeIn'
import styles from './LiveProof.module.css'

const GH = 'https://github.com/patelyash2511/rec0'

const metrics = [
  {
    icon: '✅',
    metric: '28/28 tests passing',
    link: `${GH}/actions`,
    cta: 'View on GitHub Actions →',
  },
  {
    icon: '⚡',
    metric: '<100ms p95 latency',
    link: '/benchmark',
    cta: 'Run benchmark →',
    internal: true,
  },
  {
    icon: '📦',
    metric: '100% open source',
    link: GH,
    cta: 'Read the code →',
  },
  {
    icon: '🔓',
    metric: 'MIT licensed',
    link: `${GH}/blob/main/LICENSE`,
    cta: 'Zero vendor lock-in →',
  },
]

export default function LiveProof() {
  return (
    <section className={styles.section} id="proof">
      <div className={styles.inner}>
        <FadeIn>
          <div className={styles.header}>
            <span className="section-eyebrow">Live proof</span>
            <h2 className="section-heading">
              Don't take our word for it
            </h2>
            <p className="section-body">
              Real metrics. Real links. Real time.
            </p>
          </div>
        </FadeIn>

        <div className={styles.grid}>
          {metrics.map((m) => (
            <FadeIn key={m.metric}>
              <a
                className={styles.card}
                href={m.link}
                target={m.internal ? undefined : '_blank'}
                rel={m.internal ? undefined : 'noopener noreferrer'}
              >
                <span className={styles.icon}>{m.icon}</span>
                <h3 className={styles.metric}>{m.metric}</h3>
                <span className={styles.cta}>{m.cta}</span>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
