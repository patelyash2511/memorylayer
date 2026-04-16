import { useState } from 'react'
import useLenis from './hooks/useLenis'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CodeSection from './components/CodeSection'
import Features from './components/Features'
import UseCases from './components/UseCases'
import Compare from './components/Compare'
import Pricing from './components/Pricing'
import Testimonials from './components/Testimonials'
import CTA from './components/CTA'
import Footer from './components/Footer'
import Modal from './components/Modal'
import './App.css'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  useLenis()

  return (
    <>
      <Nav onCTA={() => setModalOpen(true)} />
      <main>
        <Hero onCTA={() => setModalOpen(true)} />
        <CodeSection />
        <Features />
        <UseCases />
        <Compare />
        <Pricing onCTA={() => setModalOpen(true)} />
        <Testimonials />
        <CTA onCTA={() => setModalOpen(true)} />
      </main>
      <Footer />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
