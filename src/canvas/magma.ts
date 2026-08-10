// The "magma" colormap, shared by all three canvas systems (hero particles,
// ecosystem particles, beta modal wave). Ported verbatim from script.js.
//
// This is deliberately duplicated from the `--magma-N` custom properties in
// src/styles/tokens.css rather than read via getComputedStyle: the canvas
// engines need a plain numeric array at 60fps, and going through the DOM for
// that would be both slow and would couple the render loop to layout. If you
// change one, change the other.
export const MAGMA_COLORS = [
  '#000004',
  '#140e36',
  '#3b0f70',
  '#641a80',
  '#8c2981',
  '#b73779',
  '#de4968',
  '#f7705c',
  '#fe9f6d',
  '#fecf92',
  '#fcfdbf',
] as const

/** Returns an `rgba(...)` string for a magma colormap value in [0, 1]. */
export function getMagmaColorRGBA(value: number, alpha = 1): string {
  if (value < 0) value = 0
  if (value > 1) value = 1
  const index = Math.floor(value * (MAGMA_COLORS.length - 1))
  const hex = MAGMA_COLORS[index]

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
