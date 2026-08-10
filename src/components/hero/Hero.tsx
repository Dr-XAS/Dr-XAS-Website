import { useBetaModal } from '@/components/beta/BetaModalContext'
import { Typewriter } from './Typewriter'

// Ported from index.html:105-121 (<section class="hero-section">). Excludes
// the particle canvas, which is a HomePage-level sibling (see HeroParticles)
// so it never mounts on future product pages.
export function Hero() {
  const { open: openBetaModal } = useBetaModal()

  return (
    <section className="hero-section">
      <div className="content">
        <div className="hero-container">
          <img src="/drxas_logo.png" alt="Dr. XAS Logo" className="logo" />
          <div className="text-content">
            <Typewriter />
          </div>
          <div className="hero-buttons">
            <a href="#demo-drxas" className="btn btn-primary">
              See demo
            </a>
            <button type="button" className="btn btn-secondary" onClick={openBetaModal}>
              Beta access
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
