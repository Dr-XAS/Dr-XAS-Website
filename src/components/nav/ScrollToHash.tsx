import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router doesn't scroll to URL fragments on its own (that's what
// <ScrollRestoration> does, but only in data-router mode — see plan section
// 2 for why this app stays on BrowserRouter). This replicates the browser's
// native "navigate to #anchor" behavior for in-app link clicks and back/
// forward navigation.
//
// This intentionally does NOT special-case `#ecosystem` — that section's own
// settle-on-load retry (script.js:1085-1097) is ported inside the ecosystem
// component itself, scoped to first mount, since it exists to fight layout
// shift from web font loading rather than routing.
export function ScrollToHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    const id = hash.slice(1)
    const el = document.getElementById(id)
    el?.scrollIntoView()
    // pathname is in the deps so navigating from /xaspert back to
    // /#demo-drxas re-scrolls even though the hash string is unchanged.
  }, [hash, pathname])

  return null
}
