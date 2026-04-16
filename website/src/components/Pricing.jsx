import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Pricing.module.css'

const PLANS = [
  {
    name: 'Free', price: '$0', per: '/mo',
    desc: '10K memory ops/mo · 1 app · community support',
    features: ['10,000 memory ops', '1 application', 'Community Discord', 'Core recall + store'],
    btn: 'default', btnLabel: 'Get started', featured: false,
  },
  {
    name: 'Starter', price: '$29', per: '/mo',
    desc: '500K memory ops/mo · 5 apps · email support',
    features: ['500K memory ops', '5 applications', 'Email support', 'Analytics dashboard', 'Custom decay rules'],
    btn: 'accent', btnLabel: 'Start 14-day trial →', featured: true, badge: 'Most popular',
  },
  {
    name: 'Growth', price: '$199', per: '/mo',
    desc: '5M memory ops/mo · Unlimited apps · priority',
    features: ['5M memory ops', 'Unlimited apps', 'Priority support', '99.9% SLA', 'SSO + audit logs'],
    btn: 'default', btnLabel: 'Get started', featured: false,
  },
  {
    name: 'Enterprise', price: 'Custom', per: '',
    desc: 'Unlimited ops · On-prem · custom SLA',
    features: ['On-premise deploy', 'Custom contracts', '99.99% SLA', 'HIPAA / SOC 2', 'Dedicated infra'],
    btn: 'default', btnLabel: 'Talk to us', featured: false,
  },
]

export default function Pricing({ onCTA }) {
  return (
    <section className={styles.section} id="pricing">
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Pricing</span>
          <h2 className="section-heading">Start free.<br />Scale as you ship.</h2>
        </FadeIn>
        <div className={styles.grid}>
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`${styles.card} ${plan.featured ? styles.featured : ''}`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              {plan.badge && <div className={styles.badge}>{plan.badge}</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.price}>
                {plan.price}
                {plan.per && <span className={styles.per}>{plan.per}</span>}
              </div>
              <p className={styles.desc}>{plan.desc}</p>
              <div className={styles.divider} />
              <ul className={styles.feats}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className={plan.featured ? styles.liCheck : styles.liDash}>
                      {plan.featured ? '✓' : '—'}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`${styles.btn} ${plan.btn === 'accent' ? styles.btnAccent : styles.btnDefault}`}
                onClick={onCTA}
              >
                {plan.btnLabel}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
