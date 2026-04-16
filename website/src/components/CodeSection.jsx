import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FadeIn from './FadeIn'
import styles from './CodeSection.module.css'

const TABS = ['Python', 'JavaScript', 'cURL']

const CODE = {
  Python: (
    <>
      <span className={styles.kw}>from</span> <span className={styles.vr}>rec0</span> <span className={styles.kw}>import</span> <span className={styles.fn}>Memory</span>{'\n\n'}
      <span className={styles.cm}># init once per user session</span>{'\n'}
      <span className={styles.vr}>mem</span> = <span className={styles.fn}>Memory</span>({'\n'}
      {'  '}api_key=<span className={styles.str}>'r0_key_xxxx'</span>,{'\n'}
      {'  '}user_id=<span className={styles.str}>'user_123'</span>{'\n'}
      ){'\n\n'}
      <span className={styles.cm}># recall relevant context</span>{'\n'}
      <span className={styles.vr}>ctx</span> = <span className={styles.vr}>mem</span>.<span className={styles.fn}>recall</span>({'\n'}
      {'  '}query=<span className={styles.str}>'user preferences and history'</span>{'\n'}
      ){'\n\n'}
      <span className={styles.cm}># inject into your prompt</span>{'\n'}
      <span className={styles.vr}>prompt</span> = <span className={styles.vr}>ctx</span> + <span className={styles.vr}>user_message</span>{'\n'}
      <span className={styles.vr}>response</span> = <span className={styles.vr}>llm</span>.<span className={styles.fn}>complete</span>(<span className={styles.vr}>prompt</span>){'\n\n'}
      <span className={styles.cm}># auto-saves new memories</span>{'\n'}
      <span className={styles.vr}>mem</span>.<span className={styles.fn}>store</span>(<span className={styles.vr}>response</span>)
    </>
  ),
  JavaScript: (
    <>
      <span className={styles.kw}>import</span> {'{ '}<span className={styles.fn}>Memory</span>{' }'} <span className={styles.kw}>from</span> <span className={styles.str}>'rec0'</span>{'\n\n'}
      <span className={styles.cm}>// init once per user session</span>{'\n'}
      <span className={styles.kw}>const</span> <span className={styles.vr}>mem</span> = <span className={styles.kw}>new</span> <span className={styles.fn}>Memory</span>({'{\n'}
      {'  '}apiKey: <span className={styles.str}>'r0_key_xxxx'</span>,{'\n'}
      {'  '}userId: <span className={styles.str}>'user_123'</span>{'\n'}
      {'}'}) {'\n\n'}
      <span className={styles.cm}>// recall relevant context</span>{'\n'}
      <span className={styles.kw}>const</span> <span className={styles.vr}>ctx</span> = <span className={styles.kw}>await</span> <span className={styles.vr}>mem</span>.<span className={styles.fn}>recall</span>({'{\n'}
      {'  '}query: <span className={styles.str}>'user preferences and history'</span>{'\n'}
      {'}'}){'\n\n'}
      <span className={styles.cm}>// inject + store</span>{'\n'}
      <span className={styles.kw}>const</span> <span className={styles.vr}>resp</span> = <span className={styles.kw}>await</span> <span className={styles.vr}>llm</span>.<span className={styles.fn}>complete</span>(<span className={styles.vr}>ctx</span> + <span className={styles.vr}>msg</span>){'\n'}
      <span className={styles.kw}>await</span> <span className={styles.vr}>mem</span>.<span className={styles.fn}>store</span>(<span className={styles.vr}>resp</span>)
    </>
  ),
  cURL: (
    <>
      <span className={styles.cm}># Store a memory</span>{'\n'}
      <span className={styles.fn}>curl</span> -X POST https://api.rec0.ai/v1/store \{'\n'}
      {'  '}-H <span className={styles.str}>"Authorization: Bearer r0_key_xxxx"</span> \{'\n'}
      {'  '}-d <span className={styles.str}>'{"{"}"user_id":"user_123","text":"...""{"}"}'</span>{'\n\n'}
      <span className={styles.cm}># Recall relevant memories</span>{'\n'}
      <span className={styles.fn}>curl</span> -X POST https://api.rec0.ai/v1/recall \{'\n'}
      {'  '}-H <span className={styles.str}>"Authorization: Bearer r0_key_xxxx"</span> \{'\n'}
      {'  '}-d <span className={styles.str}>'{"{"}"user_id":"user_123","query":"prefs""{"}"}'</span>{'\n\n'}
      <span className={styles.cm}># GDPR erasure (1 call)</span>{'\n'}
      <span className={styles.fn}>curl</span> -X DELETE https://api.rec0.ai/v1/users/user_123 \{'\n'}
      {'  '}-H <span className={styles.str}>"Authorization: Bearer r0_key_xxxx"</span>
    </>
  ),
}

const CHECKS = [
  'Works with Python & JavaScript',
  'Sub-100ms retrieval latency',
  'GDPR erasure in 1 API call',
]

export default function CodeSection() {
  const [active, setActive] = useState('Python')

  return (
    <section className={styles.section} id="code-section">
      <div className={styles.inner}>
        <FadeIn className={styles.left}>
          <span className="section-eyebrow">Setup in 3 lines</span>
          <h2 className="section-heading">Memory solved.<br />Ship in 30 min.</h2>
          <p className="section-body">
            Stop spending 6–8 weeks building custom vector pipelines. Rec0 handles storage,
            retrieval, decay, and GDPR compliance automatically — so you can focus on your product.
          </p>
          <ul className={styles.checks}>
            {CHECKS.map((c, i) => (
              <motion.li
                key={c}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
              >
                <span className={styles.checkIcon}>✓</span> {c}
              </motion.li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.15} className={styles.right}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={`${styles.dot} ${styles.red}`} />
              <span className={`${styles.dot} ${styles.yellow}`} />
              <span className={`${styles.dot} ${styles.green}`} />
              <span className={styles.filename}>rec0_quickstart</span>
            </div>
            <div className={styles.tabs}>
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`${styles.tab} ${active === t ? styles.tabActive : ''}`}
                  onClick={() => setActive(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.pre
                key={active}
                className={styles.codeContent}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <code>{CODE[active]}</code>
              </motion.pre>
            </AnimatePresence>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
