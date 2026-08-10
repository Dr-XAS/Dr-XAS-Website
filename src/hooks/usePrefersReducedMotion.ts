import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/** Tracks `prefers-reduced-motion`, updating live if the OS setting changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getSnapshot)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handler = () => setReduced(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
