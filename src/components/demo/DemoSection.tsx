import { forwardRef } from 'react'
import type { Demo } from '@/data/demos'
import { byId } from '@/data/products'
import { DemoVideo } from './DemoVideo'

// Ported from index.html's three <section class="demo-section"> blocks
// (`#demo-drxas`, `#demo-xasprep`, `#demo-xasbench`). The mobile aspect
// ratio that used to live in three ID-scoped CSS rules (style.css:1329-1339)
// is now data (`demo.aspectMobile`), applied as a custom property so the
// CSS only needs one rule instead of three.
export const DemoSection = forwardRef<HTMLElement, { demo: Demo }>(function DemoSection({ demo }, ref) {
  const product = byId(demo.productId)

  return (
    <section className="demo-section" id={demo.id} ref={ref}>
      <div className="video-wrapper" style={{ '--demo-aspect': demo.aspectMobile }}>
        <DemoVideo demo={demo} />
        {product.external && (
          <div className="video-overlay-content">
            <a href={product.external.href} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              {product.external.label}
            </a>
          </div>
        )}
      </div>
    </section>
  )
})
