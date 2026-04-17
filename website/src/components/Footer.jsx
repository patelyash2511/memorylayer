import styles from './Footer.module.css'

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Compare', href: '#compare' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'API Docs', href: 'https://memorylayer-production.up.railway.app/docs' },
      { label: 'GitHub', href: 'https://github.com/patelyash2511/rec0' },
      { label: 'PyPI', href: 'https://pypi.org/project/memorylayer-py/' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'MIT License', href: 'https://github.com/patelyash2511/rec0/blob/master/LICENSE' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.logo}>Rec<span>0</span></span>
          <p>The memory API for AI applications. Persistent, intelligent, and developer-first.</p>
        </div>
        {COLS.map((col) => (
          <div key={col.heading} className={styles.col}>
            <h4>{col.heading}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.bottom}>
        <div>
          <p>© 2026 Rec0 · Built by Yash · Open Beta · April 2026 · MIT License</p>
          <p style={{ marginTop: '6px' }}>Pricing designed to grow with you, not against you.</p>
        </div>
        <div className={styles.socials}>
          <a href="https://github.com/patelyash2511/rec0" title="GitHub" target="_blank" rel="noopener noreferrer">⌥</a>
        </div>
      </div>
    </footer>
  )
}
