import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Compare.module.css'

const ROWS = [
  { feat: 'Full lifecycle (decay, summarize)', rec0: true, mem0: false, openai: false, diy: 'manual' },
  { feat: 'LLM-agnostic', rec0: true, mem0: 'partial', openai: false, diy: true },
  { feat: 'Cost per 1K ops', rec0: '$0.002', mem0: '$0.10', openai: 'bundled', diy: 'varies' },
  { feat: 'GDPR built-in', rec0: true, mem0: 'partial', openai: false, diy: 'manual' },
  { feat: 'Setup time', rec0: '30 min', mem0: '60 min', openai: '1+ day', diy: '6–8 wks' },
  { feat: 'Memory conflict resolution', rec0: true, mem0: false, openai: false, diy: 'manual' },
  { feat: 'On-premise deploy', rec0: true, mem0: false, openai: false, diy: true },
]

function Cell({ val, isRec0 }) {
  if (val === true) return <span className={isRec0 ? styles.checkGood : styles.check}>✓</span>
  if (val === false) return <span className={styles.cross}>✗</span>
  const isGood = isRec0
  return <span className={`${styles.mono} ${isGood ? styles.monoGood : styles.monoDim}`}>{val}</span>
}

export default function Compare() {
  return (
    <section className={styles.section} id="compare">
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow" style={{ textAlign: 'center', display: 'block' }}>Rec0 vs alternatives</span>
          <h2 className="section-heading" style={{ textAlign: 'center' }}>Why switch?</h2>
        </FadeIn>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Feature</th>
                <th className={styles.ours}>Rec0</th>
                <th>Mem0</th>
                <th>OpenAI Memory</th>
                <th>DIY</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <motion.tr
                  key={r.feat}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                >
                  <td className={styles.featCol}>{r.feat}</td>
                  <td><Cell val={r.rec0} isRec0 /></td>
                  <td><Cell val={r.mem0} /></td>
                  <td><Cell val={r.openai} /></td>
                  <td><Cell val={r.diy} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
