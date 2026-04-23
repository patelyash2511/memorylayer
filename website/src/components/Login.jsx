import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import authStyles from './Auth.module.css'
import styles from './Login.module.css'
import { API_BASE, notifyAuthChange } from '../lib/auth'

const API_URL = `${API_BASE}/auth/login`

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validateField(field, value) {
    switch (field) {
      case 'email': {
        if (!value.trim()) return 'Email is required.'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) return 'Enter a valid email address.'
        return ''
      }
      case 'password':
        if (!value) return 'Password is required.'
        return ''
      default:
        return ''
    }
  }

  function handleChange(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      const nextErrors = { ...current }
      if (nextErrors[field]) {
        const message = validateField(field, value)
        if (message) {
          nextErrors[field] = message
        } else {
          delete nextErrors[field]
        }
      }
      if (nextErrors.submit) {
        delete nextErrors.submit
      }
      return nextErrors
    })
  }

  function handleBlur(field) {
    const message = validateField(field, formData[field])
    setErrors((current) => {
      const nextErrors = { ...current }
      if (message) {
        nextErrors[field] = message
      } else {
        delete nextErrors[field]
      }
      return nextErrors
    })
  }

  function validateAll() {
    const nextErrors = {}
    for (const field of Object.keys(formData)) {
      const message = validateField(field, formData[field])
      if (message) {
        nextErrors[field] = message
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    if (!validateAll()) {
      return
    }

    setLoading(true)
    setErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors.submit
      return nextErrors
    })

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setErrors((current) => ({ ...current, submit: 'Invalid email or password.' }))
        } else if (response.status === 422) {
          setErrors((current) => ({ ...current, submit: 'Please enter a valid email address.' }))
        } else if (response.status === 500) {
          setErrors((current) => ({ ...current, submit: 'Our auth service is still being updated. Try again shortly.' }))
        } else {
          setErrors((current) => ({ ...current, submit: 'Login failed. Please try again.' }))
        }
        return
      }

        notifyAuthChange()
      navigate('/dashboard')
    } catch {
      setErrors((current) => ({
        ...current,
        submit: "Couldn't reach our servers. Check your connection and try again.",
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={authStyles.page}>
      <div className={authStyles.orbPrimary} />
      <div className={authStyles.orbSecondary} />
      <div className={authStyles.gridGlow} />

      <motion.div
        className={authStyles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className={authStyles.eyebrow}>Account access</div>
        <h1 className={authStyles.heading}>Welcome back</h1>
        <p className={authStyles.subtle}>Sign in to manage keys, usage, and account activity from your dashboard.</p>

        {errors.submit && (
          <motion.div
            className={authStyles.errorBanner}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {errors.submit}
          </motion.div>
        )}

        <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
          <label className={authStyles.field}>
            <span className={authStyles.fieldLabel}>Email</span>
            <input
              type="email"
              className={errors.email ? `${authStyles.input} ${authStyles.inputError}` : authStyles.input}
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              autoComplete="email"
              autoFocus
            />
            {errors.email && <span className={authStyles.errorText}>{errors.email}</span>}
          </label>

          <label className={authStyles.field}>
            <span className={authStyles.inlineLabel}>
              <span className={authStyles.fieldLabel}>Password</span>
              <a className={styles.forgotLink} href="mailto:yash@rec0.ai?subject=Password%20reset">
                Forgot?
              </a>
            </span>
            <input
              type="password"
              className={errors.password ? `${authStyles.input} ${authStyles.inputError}` : authStyles.input}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              autoComplete="current-password"
            />
            {errors.password && <span className={authStyles.errorText}>{errors.password}</span>}
          </label>

          <button
            type="submit"
            className={authStyles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <p className={authStyles.footerText}>
          Don't have an account?{' '}
          <Link to="/signup">Sign up free</Link>
        </p>
      </motion.div>
    </div>
  )
}
