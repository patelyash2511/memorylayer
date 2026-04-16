import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './UseCases.module.css'

const CASES = [
  { tag: 'Healthcare', tagClass: styles.tagHealth, title: 'AI Health Companions', body: 'Remembers patient history, allergies, medications, and preferences across every visit. Delivers personalised care that genuinely improves over time — not just a chatbot that resets.' },
  { tag: 'Education', tagClass: styles.tagEdu, title: 'Adaptive AI Tutors', body: 'Tracks what each student knows, what confuses them, and how they learn best. Every lesson builds on the last — creating a truly personal learning experience that evolves with every interaction.' },
  { tag: 'Customer Support', tagClass: styles.tagCs, title: 'Support Bots That Actually Know You', body: 'No more "can you describe your issue again?" Your AI support agent remembers every past ticket, purchase, and preference — resolving issues faster and frustrating users less.' },
  { tag: 'Sales & CRM', tagClass: styles.tagSales, title: 'Sales Assistants with Persistent Context', body: 'Track every objection, milestone, and conversation across long sales cycles. Reps get instant recall at every touchpoint — no more digging through CRM notes before a call.' },
]

export default function UseCases() {
  return (
    <section className={styles.section} id="usecases">
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Use Cases</span>
          <h2 className="section-heading">Memory that adapts<br />to your domain.</h2>
        </FadeIn>
        <div className={styles.grid}>
          {CASES.map((c, i) => (
            <motion.div
              key={c.title}
              className={styles.card}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <span className={`${styles.tag} ${c.tagClass}`}>{c.tag}</span>
              <div className={styles.title}>{c.title}</div>
              <p className={styles.body}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
