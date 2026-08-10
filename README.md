# Dr-XAS Website

Welcome to the repository for the **Dr. XAS Website**. This project serves as the landing page and portfolio interface for the Dr. XAS ecosystem, an AI companion for X-ray absorption spectroscopy.

**🌍 Live Website:** [dr-xas.org](https://dr-xas.org)

## Overview

The website features an interactive landing page that showcases:

- **Dr. XAS**: The next generation AI companion for X-ray absorption spectroscopy.
- **XASpert, XASbenchmark, XASperiment, XASight**: the surrounding tool ecosystem.

It utilizes modern web design principles including:

- Interactive particle canvas backgrounds (hero, ecosystem, beta modal).
- Typing animations.
- Fully responsive design for desktop and mobile devices.
- Direct links to community platforms (GitHub, X, Discord) and a beta access signup.

## Stack

Vite + React + TypeScript, with `react-router-dom` for client-side routing. Styling is plain global CSS (see [`DESIGN.md`](DESIGN.md) for the design tokens) — no CSS Modules, no CSS-in-JS.

## Project Structure

- `src/` — application source.
  - `routes/`, `layouts/` — pages and the shared site chrome (navbar, footer, beta modal).
  - `components/` — one directory per section (`hero/`, `ecosystem/`, `demo/`, `nav/`, `footer/`, `beta/`, `icons/`).
  - `canvas/` — framework-free canvas engines (hero particles, ecosystem particles, beta modal wave). Each is a plain factory function with no React dependency; components wrap them in a `useRef`/`useEffect` pair.
  - `data/` — the single typed product/demo/social/footer taxonomy that drives the nav, ecosystem, dot-nav, and footer instead of hand-copied markup.
  - `styles/` — global CSS, split by section and imported in cascade order from `styles/index.css`. `tokens.css` holds the design tokens extracted from `DESIGN.md`.
  - `assets/demo/` — demo videos and posters, imported so Vite content-hashes them.
- `public/` — files served byte-for-byte with no hashing: `CNAME`, `.nojekyll`, the two logo PNGs, and `go/` (the permanent QR redirect page — see below).

## Local Development

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL. `npm run build` produces a production build in `dist/`; `npm run preview` serves it locally.

> Note: Vite's dev server (`npm run dev`) doesn't resolve directory-index requests inside `public/`, so `localhost:5173/go/` (trailing slash) falls through to the app instead of the redirect page — `localhost:5173/go/index.html` works, and so does `/go/` under `npm run preview`, which is the one that matters since it mirrors real static hosting.

## Deployment

Deployment is automated via GitHub Actions (see `.github/workflows/deploy.yml`) on every push to `main`: install, type-check, build, copy `dist/index.html` to `dist/404.html` for SPA deep-link support on GitHub Pages, verify the `/go/` contract, then publish via `actions/deploy-pages`.

## Permanent QR Redirect

The permanent QR code URL is **<https://dr-xas.org/go>**. Its current destination is stored separately in [`public/go/target.json`](public/go/target.json), so the printed QR code never needs to change.

To point the QR code somewhere new, edit only the `target` value in `public/go/target.json` and deploy the change. Use a complete `https://` or `http://` URL. The redirect page bypasses the normal GitHub Pages asset cache when it reads this file, so returning visitors receive the latest destination.

A print-ready PNG containing the fixed QR code is available at [`public/go/dr-xas-go-qr.png`](public/go/dr-xas-go-qr.png).

`public/go/` is never touched by the Vite build or the React router — it is copied verbatim so the printed QR code keeps working forever, independent of any future redesign.

## Contact

- **Email**: <dr.xas.drx@gmail.com>
- **Discord**: [Join our community](https://discord.gg/cxefJpZQ)
- **X**: [@drx_xas](https://x.com/drx_xas)
- **GitHub**: [Dr-XAS Organization](https://github.com/Dr-XAS)
