import FadeIn from './FadeIn'
import styles from './HowItWorks.module.css'

const steps = [
  {
    num: '1',
    title: 'Store',
    code: `mem.store(
  user_id="user_123",
  content="User prefers dark mode"
)`,
  },
  {
    num: '2',
    title: 'Recall',
    code: `context = mem.recall(
  query="user preferences"
)`,
  },
  {
    num: '3',
    title: 'Done',
    desc: 'Your AI remembers. Forever.',
  },
]

export default function HowItWorks() {
  return (
    <section className={styles.section} id="howitworks">
      <div className={styles.inner}>
        <FadeIn>
          <div className={styles.header}>
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-heading">
              3 steps. No complexity.
            </h2>
            <p className="section-body">
              Add persistent memory to any AI app with three lines of code.
            </p>
          </div>
        </FadeIn>

        <div className={styles.steps}>
          {steps.map((s) => (
            <FadeIn key={s.num}>
              <div className={styles.card}>
                <span className={styles.num}>{s.num}</span>
                <div className={styles.content}>
                  <h3 className={styles.title}>{s.title}</h3>
                  {s.code ? (
                    <pre className={styles.code}><code>{s.code}</code></pre>
                  ) : (
                    <p className={styles.desc}>{s.desc}</p>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
