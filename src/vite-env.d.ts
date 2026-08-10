/// <reference types="vite/client" />

// Allow CSS custom properties ("--foo") in React's inline `style` prop.
// Needed because several ported components set per-product colors/gradients
// via inline custom properties (see src/data/products.ts) instead of
// hardcoding them per-selector in CSS.
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
