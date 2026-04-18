import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Compare.module.css'

const ROWS = [
  { feature: 'Free tier',        rec0: '10 K ops',  supermemory: '1 M tokens', mem0: '1 K ops',  zep: '5 K ops'  },
  { feature: 'Pro pricing',      rec0: '$29/mo',     supermemory: '$19/mo',      mem0: '$50+/mo',  zep: '$79+/mo'  },
  { feature: 'Self-host',        rec0: true,         supermemory: true,          mem0: true,       zep: true       },
  { feature: 'Complexity',       rec0: 'Low',        supermemory: 'High',        mem0: 'Low',      zep: 'Medium'   },
  { feature: 'Lock-in',          rec0: 'None (PG)',   supermemory: 'Graph engine', mem0: 'Proprietary', zep: 'Proprietary' },
  { feature: 'Integration time', rec0: '30 min',     supermemory: 'Hours',       mem0: '45 min',   zep: '1 hr+'    },
]

const PROVIDERS = ['rec0', 'Supermemory', 'mem0', 'Zep']

function Cell({ value, highlight }) {
  if (value === true) return <span className={styles.check}>&#10003;</span>
  if (value === false) return <span className={styles.cross}>&#10007;</span>
  return <span className={highlight ? styles.highlight : undefined}>{value}</span>
}

export default function Compare() {
  return (
    <section className={styles.section} id="compare">
      <div className={styles.inner}>
        <FadeIn>
          <span className="section-eyebrow">Why we built rec0</span>
          <motion.div
            className={styles.prose}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p>
              We built rec0 because every existing solution was too expensive,
              too complex, or sent your users&rsquo; private memories to a third-party API.
            </p>
            <p>
              So we built the one we wanted to use ourselves. Local embeddings.
              No OpenAI dependency. GDPR in one API call. Memory that actually
              decays and stays clean over time.
            </p>
            <p className={styles.closing}>The rest is just code.</p>
          </motion.div>
        </FadeIn>

        <FadeIn>
          <motion.h3
            className={styles.tableTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            How rec0 compares
          </motion.h3>

          <motion.div
            className={styles.tableWrap}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.featureCol}>Feature</th>
                  {PROVIDERS.map(p => (
                    <th key={p} className={p === 'rec0' ? styles.rec0Col : undefined}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? styles.rowEven : undefined}>
                    <td className={styles.featureCell}>{row.feature}</td>
                    <td className={styles.rec0Cell}><Cell value={row.rec0} highlight /></td>
                    <td><Cell value={row.supermemory} /></td>
                    <td><Cell value={row.mem0} /></td>
                    <td><Cell value={row.zep} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <p className={styles.footnote}>
            Pricing and features based on publicly available information as of early 2025.
            Always check each provider&rsquo;s site for the latest.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
