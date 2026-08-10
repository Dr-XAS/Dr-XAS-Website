import { DEMOS } from '@/data/demos'
import { byId } from '@/data/products'

// Ported from index.html's <nav class="dot-nav"> (three `.dot-item`s hand-
// copied with a `groupN` class each). `--dot-color`/`--dot-label-color` are
// two separate custom properties, not one, because group-3 (Dr. XAS) has a
// label color that deliberately differs from its indicator color for
// readability on dark video (style.css:766-769, plan finding 4).
export function DotNav({ activeId, isVisible }: { activeId: string | null; isVisible: boolean }) {
  return (
    <nav className={`dot-nav${isVisible ? ' is-visible' : ''}`}>
      {DEMOS.map((demo) => {
        const product = byId(demo.productId)
        return (
          <a
            key={demo.id}
            href={`#${demo.id}`}
            className={`dot-item group-${product.dotGroup}${activeId === demo.id ? ' active' : ''}`}
            style={{
              '--dot-color': product.dotIndicator,
              '--dot-label-color': product.dotLabel ?? product.dotIndicator,
            }}
          >
            <span className="dot-indicator" />
            <span className="dot-label">{demo.dotLabel}</span>
          </a>
        )
      })}
    </nav>
  )
}
