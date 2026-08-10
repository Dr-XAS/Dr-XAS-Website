// The legacy fullText ("...companion<br>for X-ray...") was typed character-
// by-character through a hand-rolled tag parser whose only job was treating
// "<br>" as one atomic unit (script.js:548-564). Splitting the line break
// into data instead means the React version can render a real <br/> and get
// that atomicity for free — see Typewriter.tsx.
export const HERO_LINES: readonly string[] = [
  'The next generation AI companion',
  'for X-ray absorption spectroscopy.',
]

export const HERO_FULL_TEXT = HERO_LINES.join(' ')
