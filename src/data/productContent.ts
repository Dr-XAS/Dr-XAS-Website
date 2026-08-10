import type { ComponentType, LazyExoticComponent } from 'react'

// Infra-only for this migration (plan section 7): no product has `hasPage:
// true` yet, so nothing renders through this shape today. It exists so that
// turning a product page on later is a content change, not an architecture
// change — in particular the 'plot' variant already goes through
// `React.lazy`, which is the one piece of forward-planning worth doing
// before a real Plotly/D3 dependency shows up.
export type ProductContentBlock =
  | { kind: 'prose'; heading?: string; body: string }
  | { kind: 'feature'; title: string; description: string; icon?: string }
  | { kind: 'media'; src: string; poster?: string; alt: string }
  | { kind: 'plot'; component: LazyExoticComponent<ComponentType> }
