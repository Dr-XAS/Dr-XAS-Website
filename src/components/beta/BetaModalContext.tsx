import { createContext, useContext } from 'react'

export interface BetaModalContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const BetaModalContext = createContext<BetaModalContextValue | null>(null)

/**
 * Access the beta-access modal's open/close controls. Used by the hero's
 * "Beta access" button (`data-beta-modal-open` in the legacy markup) — any
 * future trigger elsewhere on the site should call this too, rather than
 * re-implementing open/close state.
 */
export function useBetaModal(): BetaModalContextValue {
  const ctx = useContext(BetaModalContext)
  if (!ctx) throw new Error('useBetaModal must be used within SiteLayout')
  return ctx
}
