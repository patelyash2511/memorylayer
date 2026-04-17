import { useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import useLenis from './hooks/useLenis'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CodeSection from './components/CodeSection'
import Features from './components/Features'
import UseCases from './components/UseCases'
import Compare from './components/Compare'
import Pricing from './components/Pricing'
import BuiltInPublic from './components/BuiltInPublic'
import CTA from './components/CTA'
import Footer from './components/Footer'
import Signup from './components/Signup'
import Dashboard from './components/Dashboard'
import './App.css'

function BetaBanner() {
  return (
    <div style={{
      background: 'rgba(0,229,180,0.08)',
      borderBottom: '1px solid rgba(0,229,180,0.18)',
      padding: '10px 24px',
      textAlign: 'center',
      fontSize: '13px',
      color: 'var(--muted2)',
      lineHeight: 1.5,
    }}>
      <span style={{ color: '#00e5b4', fontWeight: 600 }}>Open Beta</span>
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
  useLenis()

  return (
    <>
      <Nav onCTA={goSignup} />
      <BetaBanner />
      <Routes>
        <Route path="/" element={<LandingPage onCTA={goSignup} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <Footer />
    </>
  )
}
