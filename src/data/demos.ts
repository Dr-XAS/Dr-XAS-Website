import type { ProductId } from './products'

// Importing (not referencing by public/ path) so Vite fingerprints these
// files and the manual `?v=N` cache-busting ritual from the old site goes
// away entirely.
import drxasMp4 from '@/assets/demo/dr_xas.mp4'
import drxasPoster from '@/assets/demo/dr_xas-poster.jpg'
import xasprepMp4 from '@/assets/demo/XASPrep_2x.mp4'
import xasprepMobileMp4 from '@/assets/demo/XASPrep_2x-mobile.mp4'
import xasprepPoster from '@/assets/demo/XASPrep_2x-poster.jpg'
import xasbenchMp4 from '@/assets/demo/XASBench_2x.mp4'
import xasbenchMobileMp4 from '@/assets/demo/XASBench_2x-mobile.mp4'
import xasbenchPoster from '@/assets/demo/XASBench_2x-poster.jpg'

export interface Demo {
  /** Legacy section id, preserved verbatim (see products.ts docblock). */
  id: string
  productId: ProductId
  /** Dot-nav caption — kept exactly as it reads today, mismatches with product.name are intentional/legacy. */
  dotLabel: string
  src: string
  mobileSrc?: string
  poster: string
  mobilePoster?: string
  /** Mobile-only aspect-ratio override (style.css:1329-1339 in the legacy sheet). */
  aspectMobile: string
  ariaLabel: string
}

export const DEMOS: readonly Demo[] = [
  {
    id: 'demo-drxas',
    productId: 'drxas',
    dotLabel: 'Dr. XAS',
    src: drxasMp4,
    poster: drxasPoster,
    aspectMobile: '3024 / 1654',
    ariaLabel: 'Dr. XAS demo video',
  },
  {
    id: 'demo-xasprep',
    productId: 'xasperiment',
    dotLabel: 'XASperiment',
    src: xasprepMp4,
    mobileSrc: xasprepMobileMp4,
    poster: xasprepPoster,
    aspectMobile: '2992 / 1896',
    ariaLabel: 'XASprep demo video',
  },
  {
    id: 'demo-xasbench',
    productId: 'xasbench',
    dotLabel: 'XASbench',
    src: xasbenchMp4,
    mobileSrc: xasbenchMobileMp4,
    poster: xasbenchPoster,
    mobilePoster: xasbenchPoster,
    aspectMobile: '3024 / 1898',
    ariaLabel: 'XASbench demo video',
  },
] as const
