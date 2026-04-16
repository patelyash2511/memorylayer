import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Testimonials.module.css'

const TESTIS = [
  {
    quote: 'We went from a 5-week in-house memory build to a 2-hour Rec0 integration. It just works, and the retrieval quality is genuinely better than our handcrafted pipeline.',
    name: 'Amir Khan', role: 'CTO · HealthBot AI', initials: 'AK',
    avatarStyle: { background: 'rgba(0,229,180,0.1)', color: 'var(--accent2)' },
  },
  {
    quote: 'The GDPR compliance out of the box was the dealbreaker for us. Building that ourselves would\'ve taken a month. Rec0 made it a non-issue on day one.',
    name: 'Sofia Laurent', role: 'Founder · EduAI Paris', initials: 'SL',
    avatarStyle: { background: 'rgba(124,92,252,0.1)', color: '#a98bff' },
  },
  {
    quote: 'At 50x cheaper than Mem0 per operation, it was a no-brainer to switch. Our LLM infra bill dropped 40% and the integration was 3 lines of Python.',
    name: 'Jake Rivera', role: 'Lead Engineer · Convex Labs', initials: 'JR',
    avatarStyle: { background: 'rgba(249,169,110,0.1)', color: '#f9a96e' },
  },
]

export default function Testimonials() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Testimonials</span>
          <h2 className="section-heading">Devs are shipping faster.</h2>
        </FadeIn>
        <div className={styles.grid}>
          {TESTIS.map((t, i) => (
            <motion.div
              key={t.name}
              className={styles.card}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.55 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <p className={styles.quote}>{t.quote}</p>
              <div className={styles.author}>
                <div className={styles.avatar} style={t.avatarStyle}>{t.initials}</div>
                <div>
                  <div className={styles.name}>{t.name}</div>
                  <div className={styles.role}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
