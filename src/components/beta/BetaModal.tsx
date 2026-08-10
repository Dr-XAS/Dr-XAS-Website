import { useEffect, useRef } from 'react'
import { createBetaWave, type BetaWaveHandle } from '@/canvas/betaWave'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { CloseIcon } from '@/components/icons/SocialIcons'
import { useBetaModal } from './BetaModalContext'

// Ported from index.html's <dialog id="beta-access-modal"> and script.js's
// openBetaModal/closeBetaModal/restoreBetaModalFocus (script.js:296-529).
// Beta form is deferred (see plan section 7) — this ships at mailto parity.

const CONTACT_EMAIL = 'juanjuan.huang@anl.gov'

export function BetaModal() {
  const { isOpen, close } = useBetaModal()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveRef = useRef<BetaWaveHandle | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const wave = createBetaWave(canvas, () => reducedMotionRef.current)
    waveRef.current = wave
    return () => {
      wave.destroy()
      waveRef.current = null
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      document.body.classList.add('modal-open')

      const raf = requestAnimationFrame(() => {
        waveRef.current?.start()
        closeButtonRef.current?.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(raf)
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
    waveRef.current?.stop()
    document.body.classList.remove('modal-open')
    returnFocusRef.current?.focus?.({ preventScroll: true })
    returnFocusRef.current = null
  }, [isOpen])

  // Native <dialog> "close" fires on Escape and on .close() — keep React
  // state in sync when the browser closes it out from under us.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => {
      waveRef.current?.stop()
      document.body.classList.remove('modal-open')
      if (isOpen) close()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleResize = () => {
      waveRef.current?.drawFrame(performance.now())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="beta-modal"
      aria-labelledby="beta-modal-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <div className="beta-modal-card">
        <button
          ref={closeButtonRef}
          type="button"
          className="beta-modal-close"
          aria-label="Close beta access message"
          onClick={close}
        >
          <CloseIcon />
        </button>
        <canvas ref={canvasRef} className="beta-modal-wave" aria-hidden="true" />
        <h2 id="beta-modal-title">Beta access</h2>
        <p className="beta-modal-message">
          Currently, beta access is available only to internal Argonne users. Please contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to request access.
        </p>
        <div className="beta-modal-actions">
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-primary">
            Contact
          </a>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}
