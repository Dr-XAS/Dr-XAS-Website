import { useEffect, useRef } from 'react'
import { createHeroField } from '@/canvas/heroParticles'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Ported from index.html's <canvas id="particleCanvas"> and script.js:1-52,
// 283-284 (mouse/resize listeners + the initial resizeCanvas()+animate()
// kickoff). Lives on HomePage, not SiteLayout, so it never mounts on future
// product pages (see plan section 3's component tree).
//
// Reduced motion (plan section 4/13): render exactly one static frame and
// skip the rAF loop and mousemove listener entirely, rather than the
// original's "loop forever regardless" behavior.
export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const field = createHeroField(canvas)
    field.resize()

    if (reducedMotion) {
      field.renderOnce(0)
      return () => field.destroy()
    }

    const handleMouseMove = (e: MouseEvent) => field.setPointer(e.clientX, e.clientY)
    const handleMouseOut = () => field.clearPointer()
    const handleResize = () => field.resize()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)
    window.addEventListener('resize', handleResize)
    field.start()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
      window.removeEventListener('resize', handleResize)
      field.destroy()
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} id="particleCanvas" aria-hidden="true" />
}
