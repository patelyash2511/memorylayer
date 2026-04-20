import { useCallback, useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import useLenis from './hooks/useLenis'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CodeSection from './components/CodeSection'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import LiveProof from './components/LiveProof'
import UseCases from './components/UseCases'
import Compare from './components/Compare'
import Pricing from './components/Pricing'
import BuiltInPublic from './components/BuiltInPublic'
import CTA from './components/CTA'
import Footer from './components/Footer'
import Signup from './components/Signup'
import Dashboard from './components/Dashboard'
import Benchmark from './components/Benchmark'
import Roadmap from './components/Roadmap'
import './App.css'

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function BetaBanner() {
  return (
    <div style={{
      background: 'var(--accent2-alpha-8)',
      borderBottom: '1px solid var(--accent2-alpha-20)',
      padding: '10px 24px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--muted2)',
      lineHeight: 1.5,
    }}>
      <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>Open Beta</span>
      {' '}&mdash; API is live, SDK published on PyPI, 39/39 tests passing.{' '}
      Sign up now and start building with persistent AI memory.
    </div>
  )
}

function LandingPage({ onCTA }) {
  return (
    <main>
      <Hero onCTA={onCTA} />
      <CodeSection />
      <HowItWorks />
      <LiveProof />
      <Features />
      <UseCases />
      <Compare />
      <Pricing onCTA={onCTA} />
      <BuiltInPublic />
      <CTA onCTA={onCTA} />
    </main>
  )
}

export default function App() {
  const navigate = useNavigate()
  const goSignup = useCallback(() => navigate('/signup'), [navigate])
  const goSignin = useCallback(() => navigate('/dashboard'), [navigate])
  useLenis()

  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  return (
    <>
      <Nav onCTA={goSignup} onSignin={goSignin} theme={theme} onToggleTheme={toggleTheme} />
      <BetaBanner />
      <Routes>
        <Route path="/" element={<LandingPage onCTA={goSignup} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/benchmark" element={<Benchmark />} />
        <Route path="/roadmap" element={<Roadmap />} />
      </Routes>
      <Footer />
    </>
  )
}
