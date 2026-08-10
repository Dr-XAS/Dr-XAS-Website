import { useEffect, useRef } from 'react'
import type { Demo } from '@/data/demos'
import { attemptVideoPlayback } from '@/lib/video'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// Ported from the <video class="demo-video active"> elements in index.html
// and script.js's syncVideoSources (script.js:592-614). The mobile/desktop
// source and poster swap that syncVideoSources did imperatively is now just
// which values React renders, driven by the same breakpoint
// (`max-width: 900px` — script.js:642).
//
// Note the class is always "demo-video active": these videos aren't
// scroll-gated by CSS, only by the IntersectionObserver in HomePage that
// plays/pauses them (see the `~` sibling-selector finding in the plan for
// why the video and its overlay must stay direct siblings).
export function DemoVideo({ demo }: { demo: Demo }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isMobile = useMediaQuery('(max-width: 900px)')
  const mountedRef = useRef(false)

  const src = isMobile && demo.mobileSrc ? demo.mobileSrc : demo.src
  const poster = isMobile && demo.mobilePoster ? demo.mobilePoster : demo.poster

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.defaultMuted = true
    video.muted = true
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
  }, [])

  // Skip on first mount — the initial render already picked the right
  // source for the current breakpoint. Only a genuine breakpoint crossing
  // (e.g. rotating the device) needs an explicit reload + replay.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const video = videoRef.current
    if (!video) return
    video.load()
    attemptVideoPlayback(video)
  }, [src, poster])

  return (
    <video
      ref={videoRef}
      preload="metadata"
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className="demo-video active"
      aria-label={demo.ariaLabel}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
