import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ECOSYSTEM_PRODUCTS, gradientCss, type ProductId } from '@/data/products'
import { createEcosystemField, type EcosystemFieldHandle } from '@/canvas/ecosystemParticles'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const MODULE_ORDER: readonly ProductId[] = ECOSYSTEM_PRODUCTS.map((p) => p.id)
const MAGMA_RANGES: Record<ProductId, [number, number]> = Object.fromEntries(
  ECOSYSTEM_PRODUCTS.map((p) => [p.id, p.magmaRange ?? [0, 1]]),
) as Record<ProductId, [number, number]>

// Ported from index.html:129-152 (<section class="ecosystem-section">) and
// the button-interaction / scroll-settle half of script.js's
// initEcosystemParticles (the particle math itself lives in
// canvas/ecosystemParticles.ts). See the migration plan section 4 for the
// callback-ref Map bridge this relies on.
export function EcosystemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buttonRefs = useRef(new Map<ProductId, HTMLButtonElement>())
  const fieldRef = useRef<EcosystemFieldHandle | null>(null)
  const lockedModuleRef = useRef<ProductId | null>(null)
  const activeModuleRef = useRef<ProductId | null>(null)
  const [activeModule, setActiveModuleState] = useState<ProductId | null>(null)

  const reducedMotion = usePrefersReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  const location = useLocation()

  function setButtonRef(id: ProductId) {
    return (el: HTMLButtonElement | null) => {
      if (el) buttonRefs.current.set(id, el)
      else buttonRefs.current.delete(id)
    }
  }

  function setActiveModule(id: ProductId | null) {
    activeModuleRef.current = id
    setActiveModuleState(id)
    fieldRef.current?.setActiveModule(id)
  }

  function scrollEcosystemToTop() {
    const section = sectionRef.current
    if (!section) return
    const targetTop = section.getBoundingClientRect().top + window.pageYOffset
    window.scrollTo(0, targetTop)
    const scroller = document.scrollingElement || document.documentElement
    if (scroller) scroller.scrollTop = targetTop
  }

  function keepEcosystemInView() {
    window.requestAnimationFrame(scrollEcosystemToTop)
    window.setTimeout(scrollEcosystemToTop, 120)
    window.setTimeout(scrollEcosystemToTop, 320)
  }

  // Create the engine once.
  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const field = createEcosystemField(canvas, section, {
      order: MODULE_ORDER,
      magmaRanges: MAGMA_RANGES,
      getButtonEl: (id) => buttonRefs.current.get(id) ?? null,
      reducedMotion: () => reducedMotionRef.current,
    })
    fieldRef.current = field
    field.resize()
    if (reducedMotionRef.current) field.renderOnce(0)

    return () => {
      field.destroy()
      fieldRef.current = null
    }
  }, [])

  // Remeasure on section resize, each button's own resize (font-swap
  // reflow), and the first paint after web fonts load — coalesced through
  // one rAF-debounced call, since a remeasure rebuilds ~1040 particles.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let rafId = 0
    const scheduleRemeasure = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        fieldRef.current?.resize()
      })
    }

    const sectionObserver = new ResizeObserver(scheduleRemeasure)
    sectionObserver.observe(section)

    const buttonObservers = Array.from(buttonRefs.current.values()).map((button) => {
      const ro = new ResizeObserver(scheduleRemeasure)
      ro.observe(button)
      return ro
    })

    window.addEventListener('resize', scheduleRemeasure)
    document.fonts?.ready?.then(scheduleRemeasure).catch(() => {})

    return () => {
      sectionObserver.disconnect()
      buttonObservers.forEach((ro) => ro.disconnect())
      window.removeEventListener('resize', scheduleRemeasure)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Full-motion users: animate only while the section is on-screen (today's
  // behavior). Reduced-motion users manage their own start/stop bursts
  // inside the engine (see canvas/ecosystemParticles.ts) — this observer
  // leaves them alone (plan finding 9: the original ran the loop forever
  // for reduced-motion users regardless of visibility).
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (reducedMotionRef.current) return
        const visible = entries.some((entry) => entry.isIntersecting)
        if (visible) fieldRef.current?.start()
        else fieldRef.current?.stop()
      },
      { threshold: 0.08 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      fieldRef.current?.stop()
      fieldRef.current?.renderOnce(0)
    } else {
      fieldRef.current?.start()
    }
  }, [reducedMotion])

  // Fights layout shift from font loading, scoped to first landing on
  // #ecosystem (script.js:1085-1097, plan finding 9).
  useEffect(() => {
    if (location.hash !== '#ecosystem') return
    const timers = [120, 500, 1100, 1800].map((delay) => window.setTimeout(scrollEcosystemToTop, delay))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [location.hash])

  return (
    <section className="ecosystem-section" id="ecosystem" aria-label="Dr. XAS ecosystem modules" ref={sectionRef}>
      <canvas ref={canvasRef} id="ecosystemCanvas" aria-hidden="true" />

      <div className="ecosystem-modules" id="ecosystem-modules" aria-label="Dr. XAS ecosystem modules">
        {ECOSYSTEM_PRODUCTS.map((product) => (
          <button
            key={product.id}
            ref={setButtonRef(product.id)}
            type="button"
            className={`ecosystem-module${activeModule === product.id ? ' is-active' : ''}`}
            aria-pressed={activeModule === product.id}
            style={{
              '--product-accent': product.accent,
              '--product-gradient': gradientCss(product.gradient),
            }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActiveModule(product.id)}
            onMouseLeave={() => {
              if (!lockedModuleRef.current && activeModuleRef.current === product.id) setActiveModule(null)
            }}
            onFocus={() => setActiveModule(product.id)}
            onBlur={() => {
              if (!lockedModuleRef.current && activeModuleRef.current === product.id) setActiveModule(null)
            }}
            onClick={(e) => {
              e.preventDefault()
              lockedModuleRef.current = product.id
              setActiveModule(product.id)
              keepEcosystemInView()
            }}
            onTouchStart={() => {
              lockedModuleRef.current = product.id
              setActiveModule(product.id)
            }}
          >
            <span>{product.name}</span>
            <small>{product.ecosystemCaption}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
