import { useState } from 'react'
import { PRODUCTS, gradientCss, type Product } from '@/data/products'
import { ChevronIcon } from '@/components/icons/SocialIcons'

// Ported from index.html:19-100 (<nav class="navbar">) and script.js:285-294
// (mobile menu toggle). The five hand-copied mega-menu items collapse to one
// `MegaMenuItem` driven by `PRODUCTS`; the four duplicate inline `onclick`
// handlers that closed the mobile nav become the single `closeMobileNav`
// callback passed down.
//
// `demoAnchor` is used for the href — see products.ts for why display names
// and anchor ids intentionally don't match 1:1.

function MegaMenuItem({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  const content = (
    <div className="mega-content-row">
      <span
        className="mega-title menu-gradient-title"
        style={{ '--product-gradient': gradientCss(product.gradient) }}
      >
        {product.name}
      </span>
      <span className="mega-desc">{product.tagline}</span>
    </div>
  )

  if (!product.demoAnchor) {
    return (
      <div className="mega-link mega-compact" style={{ cursor: 'default' }}>
        {content}
      </div>
    )
  }

  return (
    <a href={`#${product.demoAnchor}`} className="mega-link mega-compact" onClick={onNavigate}>
      {content}
    </a>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileNav = () => setMobileOpen(false)

  const [drxas, ...rest] = PRODUCTS

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/drxas_logo.png" alt="Dr. XAS Logo" className="nav-logo" />
      </div>

      <button
        type="button"
        className={`mobile-menu-btn${mobileOpen ? ' open' : ''}`}
        aria-label="Toggle navigation"
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <ul className={`nav-links${mobileOpen ? ' active' : ''}`}>
        <li>
          <a href="#">Introduction</a>
        </li>
        <li className="dropdown">
          <a href="#" className="dropbtn">
            Dr. XAS Suite <ChevronIcon />
          </a>
          <div className="dropdown-content">
            <div className="mega-menu-inner layout-divider">
              <div className="mega-left-col">
                {drxas && <MegaMenuItem product={drxas} onNavigate={closeMobileNav} />}
              </div>
              <div className="mega-col divider-left">
                {rest.map((product, i) => (
                  <div key={product.id}>
                    {i > 0 && <div className="divider-horizontal" />}
                    <MegaMenuItem product={product} onNavigate={closeMobileNav} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </li>
        <li>
          <a href="#">Contact</a>
        </li>
      </ul>

      <div className="nav-actions" />
    </nav>
  )
}
