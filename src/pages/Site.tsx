import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Metrics } from '@/components/landing/Metrics'
import { Comparison } from '@/components/landing/Comparison'
import { Steps } from '@/components/landing/Steps'
import { Features } from '@/components/landing/Features'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'

export default function Site() {
  return (
    <div className="min-h-screen bg-[#f6f8f6] font-sans">
      <Navbar />
      <Hero />
      <Metrics />
      <Comparison />
      <Steps />
      <Features />
      <CTA />
      <Footer />
    </div>
  )
}
