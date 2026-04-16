import styles from './Footer.module.css'

const COLS = [
  { heading: 'Product', links: ['Features', 'Pricing', 'Compare', 'Changelog', 'Status'] },
  { heading: 'Developers', links: ['Documentation', 'API Reference', 'GitHub', 'Discord', 'Examples'] },
  { heading: 'Company', links: ['About', 'Blog', 'Privacy Policy', 'Terms of Service', 'Contact'] },
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
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.bottom}>
        <p>© 2026 Rec0 · rec0.ai · Built by Yash · Pre-seed · April 2026</p>
        <div className={styles.socials}>
          <a href="#" title="Twitter/X">𝕏</a>
          <a href="#" title="GitHub">⌥</a>
          <a href="#" title="Discord">◈</a>
          <a href="#" title="LinkedIn">in</a>
        </div>
      </div>
    </footer>
  )
}
