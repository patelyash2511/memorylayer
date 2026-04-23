import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import authStyles from './Auth.module.css'
import styles from './Signup.module.css'
import { API_BASE, notifyAuthChange } from '../lib/auth'

const API_URL = `${API_BASE}/auth/register`

const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']

const fieldOrder = ['name', 'email', 'password', 'confirmPassword', 'agreedToTerms']

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  })
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (!success) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      navigate('/dashboard')
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [success, navigate])
  function validateField(field, value) {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required.'
        if (value.trim().length < 2) return 'Name must be at least 2 characters.'
        return ''
      case 'email': {
        if (!value.trim()) return 'Email is required.'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) return 'Enter a valid email address.'
        return ''
      }
      case 'password':
        if (!value) return 'Password is required.'
        if (value.length < 8) return 'Password must be at least 8 characters.'
        if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter.'
        if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter.'
        if (!/[0-9]/.test(value)) return 'Password must contain a number.'
        return ''
      case 'confirmPassword':
        if (!value) return 'Please confirm your password.'
        if (value !== formData.password) return 'Passwords do not match.'
        return ''
      case 'agreedToTerms':
        if (!value) return 'You must accept the terms to continue.'
        return ''
      default:
        return ''
    }
  }

  function validateAll(nextFormData = formData) {
    const nextErrors = {}

    for (const field of fieldOrder) {
      const message = validateField(field, nextFormData[field])
      if (message) {
        nextErrors[field] = message
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleChange(field, value) {
    const nextFormData = { ...formData, [field]: value }
    setFormData(nextFormData)

    setErrors((current) => {
      const nextErrors = { ...current }

      if (touched[field]) {
        const message = validateField(field, value)
        if (message) {
          nextErrors[field] = message
        } else {
          delete nextErrors[field]
        }
      }

      if (field === 'password' && (touched.confirmPassword || nextFormData.confirmPassword)) {
        const confirmMessage = validateField('confirmPassword', nextFormData.confirmPassword)
        if (confirmMessage) {
          nextErrors.confirmPassword = confirmMessage
        } else {
          delete nextErrors.confirmPassword
        }
      }

      if (field === 'agreedToTerms' && value) {
        delete nextErrors.agreedToTerms
      }

      if (current.submit) {
        delete nextErrors.submit
      }

      return nextErrors
    })
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }))
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

  function getPasswordStrength() {
    const { password } = formData
    if (!password) return 0

    let strength = 0
    if (password.length >= 8) strength += 1
    if (password.length >= 12) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    return Math.min(4, Math.max(1, Math.ceil(strength / 2)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    const allTouched = Object.fromEntries(fieldOrder.map((field) => [field, true]))
    setTouched(allTouched)

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
          name: formData.name.trim(),
          password: formData.password,
        }),
      })

      if (!response.ok) {
        let message = 'Something went wrong. Please try again.'

        try {
          const payload = await response.json()
          const detailMessage = payload?.detail?.message || payload?.message || payload?.detail || ''
          if (response.status === 422 && detailMessage) {
            if (String(detailMessage).toLowerCase().includes('password')) {
              message = 'Use a password with at least 8 characters.'
            } else {
              message = 'Please check your details and try again.'
            }
          }
        } catch {
          // Ignore non-JSON error bodies and keep the fallback message.
        }

        if (response.status === 409) {
          message = 'This email is already registered. Try signing in instead.'
        } else if (response.status === 429) {
          message = 'Too many signups from your network. Try again in an hour.'
        } else if (response.status === 500) {
          message = 'Our auth service is still being updated. Try again shortly.'
        }

        setErrors((current) => ({ ...current, submit: message }))
        return
      }

      const data = await response.json()
      notifyAuthChange()
      setApiKey(data.api_key || '')
      setSuccess(true)
    } catch {
      setErrors((current) => ({
        ...current,
        submit: "Couldn't reach our servers. Check your connection and try again.",
      }))
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength()

  if (success) {
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
          <div className={authStyles.eyebrow}>Account created</div>
          <h1 className={authStyles.heading}>Save your API key</h1>
          <p className={authStyles.subtle}>This key is shown once. Your session cookie is already set securely by the backend.</p>

          <div className={styles.quickstartCard}>
            <div className={styles.quickstartHeader}>
              <span className={styles.quickstartLabel}>API key</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => navigator.clipboard.writeText(apiKey)}
              >
                Copy
              </button>
            </div>
            <pre className={styles.snippet}>
              <code>{apiKey}</code>
            </pre>
          </div>

          <p className={authStyles.footerText}>Redirecting to dashboard in 3 seconds…</p>
        </motion.div>
      </div>
    )
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
        <div className={authStyles.eyebrow}>Production access</div>
        <h1 className={authStyles.heading}>Create your account</h1>
        <p className={authStyles.subtle}>Start building with persistent AI memory and manage your keys from one dashboard.</p>

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
            <span className={authStyles.fieldLabel}>Name</span>
            <input
              type="text"
              className={errors.name ? `${authStyles.input} ${authStyles.inputError}` : authStyles.input}
              placeholder="Jane Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              autoComplete="name"
            />
            {errors.name && <span className={authStyles.errorText}>{errors.name}</span>}
          </label>

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
            />
            {errors.email && <span className={authStyles.errorText}>{errors.email}</span>}
          </label>

          <label className={authStyles.field}>
            <span className={authStyles.fieldLabel}>Password</span>
            <input
              type="password"
              className={errors.password ? `${authStyles.input} ${authStyles.inputError}` : authStyles.input}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              autoComplete="new-password"
            />
            {formData.password && (
              <div className={styles.strengthMeter}>
                <div className={styles.strengthTrack}>
                  <div className={styles.strengthFill} data-strength={passwordStrength} />
                </div>
                <span className={styles.strengthLabel} data-strength={passwordStrength}>
                  {passwordStrength ? strengthLabels[passwordStrength - 1] : 'Weak'}
                </span>
              </div>
            )}
            {errors.password && <span className={authStyles.errorText}>{errors.password}</span>}
          </label>

          <label className={authStyles.field}>
            <span className={authStyles.fieldLabel}>Confirm password</span>
            <input
              type="password"
              className={errors.confirmPassword ? `${authStyles.input} ${authStyles.inputError}` : authStyles.input}
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <span className={authStyles.errorText}>{errors.confirmPassword}</span>}
          </label>

          <label className={authStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={formData.agreedToTerms}
              onChange={(e) => handleChange('agreedToTerms', e.target.checked)}
              onBlur={() => handleBlur('agreedToTerms')}
            />
            <span className={authStyles.checkboxText}>
              I agree to the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.agreedToTerms && <span className={authStyles.errorText}>{errors.agreedToTerms}</span>}

          <button
            type="submit"
            className={authStyles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create my API key →'}
          </button>
        </form>

        <p className={authStyles.footerText}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
