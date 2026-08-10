// Ported from script.js:617-638 (attemptVideoPlayback). Every line here
// defends against a specific real-world autoplay quirk — see the migration
// plan's video-orchestration table. Do not simplify.
export function attemptVideoPlayback(video: HTMLVideoElement | null | undefined): void {
  if (!video) return

  // React sets `muted` as a property, but iOS Safari checks the attribute at
  // load time, and `defaultMuted` is what survives a subsequent `load()`.
  video.defaultMuted = true
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')

  const playPromise = video.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise
      .then(() => {
        video.controls = false
      })
      .catch((error: unknown) => {
        // Autoplay rejection (e.g. iOS Low Power Mode) → fall back to a
        // manual play button rather than a frozen poster.
        console.log('Auto-play prevented', error)
        video.controls = true
      })
  }
}

/** True if a demo section is close enough to the viewport to justify playing its video. */
export function isSectionPlaybackVisible(rect: DOMRect): boolean {
  return rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25
}
