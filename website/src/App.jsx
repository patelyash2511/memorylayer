import { useState } from 'react'
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
import Modal from './components/Modal'
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
      {' '}&mdash; API is live, SDK published on PyPI, 28/28 tests passing.{' '}
      Join the waitlist for early access and help shape the product.
    </div>
  )
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  useLenis()

  return (
    <>
      <Nav onCTA={() => setModalOpen(true)} />
      <BetaBanner />
      <main>
        <Hero onCTA={() => setModalOpen(true)} />
        <CodeSection />
        <Features />
        <UseCases />
        <Compare />
        <Pricing onCTA={() => setModalOpen(true)} />
        <BuiltInPublic />
        <CTA onCTA={() => setModalOpen(true)} />
      </main>
      <Footer />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
