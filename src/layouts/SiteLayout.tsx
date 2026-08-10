import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/nav/Navbar'
import { ScrollToHash } from '@/components/nav/ScrollToHash'
import { SiteFooter } from '@/components/footer/SiteFooter'
import { BetaModal } from '@/components/beta/BetaModal'
import { BetaModalContext, type BetaModalContextValue } from '@/components/beta/BetaModalContext'

// Replaces the implicit global state of the legacy script.js: navbar,
// footer, and the beta modal all live once here, wrapping every route via
// <Outlet/>, rather than being copy-pasted per page.
export function SiteLayout() {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const value = useMemo<BetaModalContextValue>(() => ({ isOpen, open, close }), [isOpen, open, close])

  return (
    <BetaModalContext.Provider value={value}>
      <ScrollToHash />
      <Navbar />
      <Outlet />
      <SiteFooter />
      <BetaModal />
    </BetaModalContext.Provider>
  )
}
