import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Compare.module.css'

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
      </div>
    </section>
  )
}
