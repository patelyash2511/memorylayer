import { motion } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './Pricing.module.css'

const TRACK_A = [
  {
    name: 'Free',
    price: '$0',
    per: ' forever',
    includes: '10K ops/mo',
    features: ['All core features', '1 app', 'No credit card required'],
    btn: 'default',
    btnLabel: 'Start building free →',
  },
  {
    name: 'Pay as you go',
    price: '$0',
    per: '/mo base',
    includes: 'First 10K ops free every month',
    features: ['After that: $0.033 per 1K ops', 'No commitment', 'Cancel anytime'],
    btn: 'accent',
    btnLabel: 'Add payment method →',
    badge: 'Most popular',
  },
  {
    name: 'Growth',
    price: '$29',
    per: '/mo',
    includes: '2M ops/mo included',
    features: ['Extra ops: $0.025 per 1K', '5 apps', 'Email support', 'Analytics dashboard', 'Custom decay rules'],
    btn: 'default',
    btnLabel: 'Start 14-day trial →',
  },
  {
    name: 'Scale',
    price: '$149',
    per: '/mo',
    includes: '20M ops/mo included',
    features: ['Extra ops: $0.015 per 1K', 'Unlimited apps', 'Priority support', '99.9% SLA', 'SSO + audit logs'],
    btn: 'default',
    btnLabel: 'Get started →',
  },
]

const CREDIT_PACKS = [
  { name: 'Starter', price: '$5',   ops: '200K ops',  rate: '$0.025/1K' },
  { name: 'Builder', price: '$19',  ops: '1M ops',    rate: '$0.019/1K' },
  { name: 'Pro',     price: '$49',  ops: '3.5M ops',  rate: '$0.014/1K', badge: 'Best value' },
  { name: 'Studio',  price: '$149', ops: '15M ops',   rate: '$0.010/1K' },
]

const FAQ = [
  {
    q: 'What counts as one memory op?',
    a: 'One API call to /store or /recall = 1 op. Storing a memory and recalling it = 2 ops total.',
    bold: null,
  },
  {
    q: 'Do credit packs expire?',
    a: 'Never. Buy $5 of credits today, use them a year from now. Your credits are yours.',
    bold: null,
  },
  {
    q: 'What happens if I exceed my plan?',
    a: "On Pay as you go — you're billed $0.033 per extra 1K ops at end of month. On Growth/Scale — same overage rate applies.",
    bold: 'We never cut off your API mid-month.',
  },
]

export default function Pricing({ onCTA }) {
  return (
    <section className={styles.section} id="pricing">
      <div className={styles.inner}>
        <FadeIn className={styles.header}>
          <span className="section-eyebrow">Pricing</span>
          <h2 className="section-heading">Honest Growth.</h2>
        </FadeIn>

        <div className={styles.tracks}>
          {/* Track A — Pay as you grow */}
          <div className={styles.track}>
            <div className={styles.trackHeader}>
              <h3 className={styles.trackTitle}>Start free. Pay for what you use.</h3>
              <p className={styles.trackSub}>No monthly commitment. No surprise bills.</p>
            </div>
            <div className={styles.trackGrid}>
              {TRACK_A.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  className={`${styles.card} ${plan.badge ? styles.featured : ''}`}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {plan.badge && <div className={styles.badge}>{plan.badge}</div>}
                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.price}>
                    {plan.price}
                    <span className={styles.per}>{plan.per}</span>
                  </div>
                  <div className={styles.includes}>{plan.includes}</div>
                  <div className={styles.divider} />
                  <ul className={styles.feats}>
                    {plan.features.map((f) => (
                      <li key={f}>
                        <span className={plan.badge ? styles.liCheck : styles.liDash}>
                          {plan.badge ? '✓' : '—'}
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

          {/* Track B — Credit packs */}
          <div className={styles.track}>
            <div className={styles.trackHeader}>
              <h3 className={styles.trackTitle}>Buy once. Use forever.</h3>
              <p className={styles.trackSub}>No subscriptions. No commitments.</p>
              <div className={styles.neverExpire}>Credits never expire. Ever.</div>
            </div>
            <div className={styles.packGrid}>
              {CREDIT_PACKS.map((pack, i) => (
                <motion.div
                  key={pack.name}
                  className={`${styles.pack} ${pack.badge ? styles.packFeatured : ''}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.45 }}
                >
                  {pack.badge && <div className={styles.packBadge}>{pack.badge}</div>}
                  <div className={styles.packRow}>
                    <div>
                      <div className={styles.packName}>{pack.name}</div>
                      <div className={styles.packOps}>{pack.ops}</div>
                    </div>
                    <div className={styles.packRight}>
                      <div className={styles.packPrice}>{pack.price}</div>
                      <div className={styles.packRate}>{pack.rate}</div>
                    </div>
                  </div>
                  <button
                    className={`${styles.btn} ${styles.packBtn} ${pack.badge ? styles.btnAccent : styles.btnDefault}`}
                    onClick={onCTA}
                  >
                    Buy pack →
                  </button>
                </motion.div>
              ))}
            </div>
            <p className={styles.packNote}>
              Credits stack. Credits never expire.<br />
              Use them across any of your apps.
            </p>
          </div>
        </div>

        {/* Enterprise */}
        <motion.div
          className={styles.enterprise}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h3 className={styles.enterpriseTitle}>Building something big?</h3>
            <p className={styles.enterpriseSub}>
              Custom ops · On-premise · HIPAA/SOC2 · 99.99% SLA · Dedicated support
            </p>
          </div>
          <button className={`${styles.btn} ${styles.btnDefault} ${styles.btnEnterprise}`} onClick={onCTA}>
            Talk to us →
          </button>
        </motion.div>

        {/* FAQ */}
        <div className={styles.faq}>
          <h3 className={styles.faqTitle}>Common questions</h3>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <motion.div
                key={i}
                className={styles.faqItem}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <p className={styles.faqQ}>{item.q}</p>
                <p className={styles.faqA}>
                  {item.bold
                    ? <>{item.a} <strong className={styles.faqBold}>{item.bold}</strong></>
                    : item.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

