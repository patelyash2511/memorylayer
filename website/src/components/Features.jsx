import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Features.module.css'

const FEATS = [
  { icon: '🧠', title: 'Auto-capture', body: 'Rec0 watches conversations and extracts what\'s worth remembering — preferences, facts, events. No manual annotation, ever.' },
  { icon: '🎯', title: 'Smart retrieval', body: 'Not a raw data dump. Hybrid BM25 + cosine scoring returns the most relevant context block, ranked and ready to inject.' },
  { icon: '⏳', title: 'Memory decay', body: 'Memories age intelligently. Stale facts archive, contradictions resolve, strong memories reinforce. Zero maintenance required.' },
  { icon: '🔒', title: 'Privacy-first', body: 'GDPR right-to-erasure in one API call. Per-user encryption. Store in our cloud, your S3, or fully on-device. Your call.' },
  { icon: '🔌', title: 'LLM-agnostic', body: 'Works with any model — OpenAI, Anthropic, Gemini, Mistral, local Llama. Plain text output that slots into any prompt.' },
  { icon: '⚡', title: 'Production-ready', body: '99.9% uptime SLA, sub-100ms p95 latency, PostgreSQL + pgvector backend, and per-user encryption at any scale.' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export default function Features() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Why Rec0</span>
          <h2 className="section-heading">Not just storage.<br />Full memory lifecycle.</h2>
        </FadeIn>

        <div className={styles.grid}>
          {FEATS.map((f, i) => (
            <motion.div
              key={f.title}
              className={styles.card}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className={styles.icon}>{f.icon}</div>
              <div className={styles.title}>{f.title}</div>
              <p className={styles.body}>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
