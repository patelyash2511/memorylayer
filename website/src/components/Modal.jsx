import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './Modal.module.css'

export default function Modal({ open, onClose }) {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  function handleClose() {
    onClose()
    setTimeout(() => setSubmitted(false), 300)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {!submitted ? (
              <>
                <div className={styles.header}>
                  <div>
                    <h3 className={styles.title}>Get early access</h3>
                    <p className={styles.sub}>Join 200+ developers already building with Rec0. Free forever on the Starter plan.</p>
                  </div>
                  <button className={styles.close} onClick={handleClose}>×</button>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                  <input type="text" placeholder="Your name" required className={styles.input} />
                  <input type="email" placeholder="Work email" required className={styles.input} />
                  <input type="text" placeholder="Company / project (optional)" className={styles.input} />
                  <button type="submit" className={styles.submit}>Start building free →</button>
                </form>
              </>
            ) : (
              <motion.div
                className={styles.success}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className={styles.successIcon}>🎉</div>
                <h4>You're on the list!</h4>
                <p>Check your email for your API key and quick-start guide. Welcome to Rec0.</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
