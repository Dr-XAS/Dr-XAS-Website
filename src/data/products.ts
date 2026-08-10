// The Dr. XAS product taxonomy — previously hand-synced across three places:
// the nav mega-menu markup, the ecosystem button markup, and `moduleConfig`
// in script.js. This is now the single source of truth for all three.
//
// IMPORTANT: `demoAnchor` values are preserved verbatim from the legacy
// section IDs (e.g. "demo-xasprep" for XASperiment) even though the display
// name and the anchor no longer match. This is deliberate — those IDs may be
// linked from external pages or printed material, so they must not change.
// See the migration plan's "Taxonomy" decision.

export type ProductId = 'drxas' | 'xaspert' | 'xasbench' | 'xasperiment' | 'xasight'

export interface Product {
  id: ProductId
  /** Display name, e.g. "XASperiment". */
  name: string
  /** Route slug, e.g. "xasperiment" -> /xasperiment. Not yet linked to (hasPage is false for all). */
  slug: string
  /** Mega-menu .mega-desc / ecosystem <small> copy. */
  tagline: string
  /** Short caption used under the ecosystem module button. */
  ecosystemCaption?: string
  /** 3-4 stop gradient, used for both the mega-menu title and the ecosystem module span. */
  gradient: string[]
  /** Solid fallback color for .ecosystem-module (non-gradient state). */
  accent?: string
  /** Dot-nav active indicator color (border + glow). */
  dotIndicator?: string
  /**
   * Dot-nav active label color. Usually equals dotIndicator, but group-3
   * (Dr. XAS) uses a lighter readability override (#9d5de4) on dark video —
   * do not collapse this into a single token.
   */
  dotLabel?: string
  /** Window into the magma colormap [0..1] used by the ecosystem particle field. */
  magmaRange?: [number, number]
  /** Whether this product has a button in the ecosystem section. */
  inEcosystem: boolean
  /** Legacy demo section id, preserved verbatim. */
  demoAnchor?: string
  /** Dot-nav grouping class, preserved verbatim from the legacy markup. */
  dotGroup?: 1 | 2 | 3
  /** Dedicated product page not yet built — gate the route until content exists. */
  hasPage: boolean
  /** External tool link shown as a CTA overlay on the demo video (e.g. XASperiment -> easyxascalc). */
  external?: { label: string; href: string }
}

export const PRODUCTS: readonly Product[] = [
  {
    id: 'drxas',
    name: 'Dr. XAS',
    slug: 'dr-xas',
    tagline: 'The AI companion for X-ray absorption spectroscopy.',
    gradient: ['#3b0f70', '#8c2981', '#de4968', '#fe9f6d'],
    dotIndicator: '#3b0f70',
    dotLabel: '#9d5de4',
    inEcosystem: false,
    demoAnchor: 'demo-drxas',
    dotGroup: 3,
    hasPage: false,
  },
  {
    id: 'xaspert',
    name: 'XASpert',
    slug: 'xaspert',
    tagline: 'Agentic scientific reasoning, literature grounding, and hypothesis generation.',
    ecosystemCaption: 'literature grounding',
    gradient: ['#f36f63', '#fd9b6b', '#fec287'],
    accent: '#f88961',
    magmaRange: [0.7, 0.9],
    inEcosystem: true,
    // Nav "XASpert" links to the Dr. XAS demo today; preserved as-is.
    demoAnchor: 'demo-drxas',
    hasPage: false,
  },
  {
    id: 'xasbench',
    name: 'XASbench',
    slug: 'xasbench',
    tagline: 'Trusted data and benchmarking backbone powering the XAS ecosystem.',
    ecosystemCaption: 'Trusted benchmarks',
    gradient: ['#b5367a', '#e65064', '#f47461'],
    accent: '#df4c70',
    dotIndicator: '#f7705c',
    dotLabel: '#f7705c',
    magmaRange: [0.5, 0.7],
    inEcosystem: true,
    demoAnchor: 'demo-xasbench',
    dotGroup: 1,
    hasPage: false,
  },
  {
    id: 'xasperiment',
    name: 'XASperiment',
    slug: 'xasperiment',
    tagline: 'Guided experiment design and beam-ready sample preparation.',
    ecosystemCaption: 'experiment planning',
    gradient: ['#7e2584', '#a83280', '#c83e75'],
    accent: '#9f2f83',
    dotIndicator: '#b73779',
    dotLabel: '#b73779',
    magmaRange: [0.32, 0.52],
    inEcosystem: true,
    // Legacy id "demo-xasprep" preserved verbatim — see module docblock.
    demoAnchor: 'demo-xasprep',
    dotGroup: 2,
    hasPage: false,
    external: { label: 'Access the tool', href: 'https://easyxascalc.dr-xas.org/' },
  },
  {
    id: 'xasight',
    name: 'XASight',
    slug: 'xasight',
    tagline: 'Physics-informed AI for autonomous spectral analysis, simulation, and insight generation.',
    ecosystemCaption: 'insight & discovery',
    gradient: ['#1c1044', '#3f0f70', '#68177f'],
    accent: '#4f137b',
    magmaRange: [0.12, 0.32],
    inEcosystem: true,
    hasPage: false,
  },
] as const

/** Ecosystem section render order, matching the legacy `moduleOrder` array. */
export const ECOSYSTEM_PRODUCT_IDS: readonly ProductId[] = PRODUCTS.filter((p) => p.inEcosystem).map((p) => p.id)

export const ECOSYSTEM_PRODUCTS: readonly Product[] = PRODUCTS.filter((p) => p.inEcosystem)

export function bySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug)
}

export function byId(id: ProductId): Product {
  const product = PRODUCTS.find((p) => p.id === id)
  if (!product) throw new Error(`Unknown product id: ${id}`)
  return product
}

export function gradientCss(gradient: readonly string[], angle = 90): string {
  return `linear-gradient(${angle}deg, ${gradient.join(', ')})`
}
