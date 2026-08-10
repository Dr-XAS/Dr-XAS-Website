import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/layouts/SiteLayout'
import { HomePage } from '@/routes/HomePage'
import { ProductPage } from '@/routes/ProductPage'
import { NotFoundPage } from '@/routes/NotFoundPage'

// Product routes are gated by `hasPage: false` on every entry in
// products.ts (see ProductPage) until real content exists — enabling one is
// a data change, not a routing change.
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path=":slug" element={<ProductPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
