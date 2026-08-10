import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMOS } from '@/data/demos'
import { attemptVideoPlayback, isSectionPlaybackVisible } from '@/lib/video'

// Ported from script.js:675-724 (the scroll-spy IntersectionObserver) plus
// the touchstart/pointerdown replay listeners (script.js:659-662) that
// recover videos an iOS Low Power Mode suspended.
//
// `visibleSectionsCount` is closure-mutated in the original (plan finding
// 8) specifically so that toggling dot-nav visibility never re-renders on
// every intersection change — it only needs to know "zero or not". That
// stays a ref here for the same reason; only the derived `isVisible`
// boolean becomes state.
export function useDemoScrollSpy() {
  const sectionsRef = useRef(new Map<string, HTMLElement>())
  const visibleCountRef = useRef(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const setSectionRef = useMemo(() => {
    return (id: string) => (el: HTMLElement | null) => {
      if (el) sectionsRef.current.set(id, el)
      else sectionsRef.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const sections = Array.from(sectionsRef.current.values())
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('id')
          const video = entry.target.querySelector('video')

          if (entry.isIntersecting) {
            visibleCountRef.current++
            if (id) setActiveId(id)
            attemptVideoPlayback(video)
          } else {
            if (visibleCountRef.current > 0) visibleCountRef.current--
            video?.pause()
          }
        })

        setIsVisible(visibleCountRef.current > 0)
      },
      { root: null, rootMargin: '0px', threshold: 0.5 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const replayVisibleVideos = () => {
      sectionsRef.current.forEach((section) => {
        const rect = section.getBoundingClientRect()
        if (isSectionPlaybackVisible(rect)) {
          attemptVideoPlayback(section.querySelector('video'))
        }
      })
    }

    window.addEventListener('touchstart', replayVisibleVideos, { passive: true })
    window.addEventListener('pointerdown', replayVisibleVideos, { passive: true })
    return () => {
      window.removeEventListener('touchstart', replayVisibleVideos)
      window.removeEventListener('pointerdown', replayVisibleVideos)
    }
  }, [])

  return { setSectionRef, activeId, isVisible, demoIds: DEMOS.map((d) => d.id) }
}
