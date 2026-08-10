import { Fragment, useEffect, useState } from 'react'
import { HERO_FULL_TEXT, HERO_LINES } from '@/data/hero'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Ported from index.html's <h1 class="typing-container"> and script.js's
// typeWriterEffect (script.js:540-575). Per the migration plan, the original
// hand-rolled tag parser (whose only job was treating "<br>" as one atomic
// step) isn't ported — HERO_LINES already has the break as a data boundary,
// so a real <br/> gets the same atomicity for free.
//
// Accessibility: screen readers get the sentence once via aria-label on the
// container, instead of ~62 incremental DOM mutations from the animated span.
export function Typewriter() {
  const reducedMotion = usePrefersReducedMotion()
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    if (reducedMotion) return

    let timeoutId: number
    let li = 0
    let ci = 0

    function step() {
      const line = HERO_LINES[li]
      if (line === undefined) return

      if (ci < line.length) {
        ci++
        setLineIndex(li)
        setCharIndex(ci)
        timeoutId = window.setTimeout(step, 20 + Math.random() * 30)
      } else if (li < HERO_LINES.length - 1) {
        li++
        ci = 0
        setLineIndex(li)
        setCharIndex(ci)
        timeoutId = window.setTimeout(step, 0)
      }
    }

    timeoutId = window.setTimeout(step, 600)
    return () => window.clearTimeout(timeoutId)
  }, [reducedMotion])

  return (
    <h1 className="typing-container" aria-label={HERO_FULL_TEXT}>
      <span className="magma-text" aria-hidden="true">
        {reducedMotion
          ? HERO_LINES.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))
          : (
              <>
                {HERO_LINES.slice(0, lineIndex).map((line, i) => (
                  <Fragment key={i}>
                    {line}
                    <br />
                  </Fragment>
                ))}
                {HERO_LINES[lineIndex]?.slice(0, charIndex)}
              </>
            )}
      </span>
      {!reducedMotion && <span className="cursor" aria-hidden="true" />}
    </h1>
  )
}
