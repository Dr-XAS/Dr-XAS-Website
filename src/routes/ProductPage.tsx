import { useParams } from 'react-router-dom'
import { bySlug } from '@/data/products'
import { NotFoundPage } from './NotFoundPage'

// Built and tested against the routing skeleton per the migration plan
// section 7 ("infra only") — every product is `hasPage: false` today, so
// this always falls through to NotFoundPage in practice. Flipping a product
// on is a one-line data change once real content exists.
export function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const product = slug ? bySlug(slug) : undefined

  if (!product || !product.hasPage) {
    return <NotFoundPage />
  }

  return (
    <main className="product-page">
      <h1>{product.name}</h1>
      <p>{product.tagline}</p>
    </main>
  )
}
