import { getMagmaColorRGBA } from './magma'

// Ported from script.js:317-461 (the beta modal's background wave canvas).
// Already correct with respect to prefers-reduced-motion in the original —
// draws exactly one frame and does not loop — so it ports as-is with no
// behavior change.

function noise(x: number, z: number, time: number): number {
  return (
    Math.sin(x * 0.063 + z * 0.21 + time * 0.0011) * 0.56 +
    Math.sin(x * 0.027 - z * 0.31 + time * 0.0017) * 0.32 +
    Math.sin((x + z) * 0.043 + time * 0.0014) * 0.24 +
    Math.cos((x - z) * 0.071 - time * 0.001) * 0.16
  )
}

function seed(row: number, col: number, salt = 0): number {
  const value = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453123
  return value - Math.floor(value)
}

export interface BetaWaveHandle {
  start(): void
  stop(): void
  drawFrame(time?: number): void
  destroy(): void
}

export function createBetaWave(canvas: HTMLCanvasElement, reducedMotion: () => boolean): BetaWaveHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  let waveWidth = 0
  let waveHeight = 0
  let dpr = 1

  function resizeCanvas(): boolean {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)

    if (width === waveWidth && height === waveHeight && nextDpr === dpr) {
      return false
    }

    waveWidth = width
    waveHeight = height
    dpr = nextDpr
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  function drawFrame(time = 0) {
    resizeCanvas()

    const width = waveWidth
    const height = waveHeight
    const columns = width < 330 ? 34 : 44
    const rows = 13
    interface Point {
      x: number
      y: number
      colorVal: number
      alpha: number
      size: number
    }
    const points: Point[][] = []

    ctx!.clearRect(0, 0, width, height)

    for (let row = 0; row < rows; row++) {
      const depth = row / Math.max(1, rows - 1)
      const rowPoints: Point[] = []
      const perspective = 0.52 + depth * 0.62
      const z = (depth - 0.5) * height * 0.78
      const amplitude = height * (0.055 + depth * 0.055)
      const lateralSkew = (depth - 0.5) * 30

      for (let col = 0; col < columns; col++) {
        const xNorm = col / Math.max(1, columns - 1)
        const baseX = xNorm * width
        const jitterX = (seed(row, col, 1) - 0.5) * 10
        const jitterY = (seed(row, col, 2) - 0.5) * 8
        const scaleJitter = seed(row, col, 3)
        const phaseJitter = (seed(row, col, 4) - 0.5) * 0.9
        const phase = xNorm * Math.PI * 5.2 - time * 0.0036 + depth * 1.05 + phaseJitter
        const n = noise(baseX, z, time)
        const flow = (Math.sin(xNorm * Math.PI * 2 - time * 0.0026 + depth * 0.7) + 1) / 2
        const x = baseX + lateralSkew * Math.cos(time * 0.00075 + depth * 1.4) + jitterX
        const y = height * 0.5 + z * 0.32 + Math.sin(phase) * amplitude * perspective + n * height * 0.052 + jitterY
        const centerDistance = Math.abs(xNorm - 0.5) * 2
        const edgeFade = Math.max(0, 1 - Math.pow(centerDistance, 1.7))
        const depthFade = 0.5 + depth * 0.5

        rowPoints.push({
          x,
          y,
          colorVal: Math.min(1, 0.18 + depth * 0.42 + flow * 0.4),
          alpha: Math.min(0.4, (0.06 + depth * 0.1 + flow * 0.15) * edgeFade * depthFade),
          size: 0.42 + depth * 0.7 + flow * 0.34 + scaleJitter * 0.48,
        })
      }

      points.push(rowPoints)
    }

    points.forEach((rowPoints, rowIndex) => {
      const depth = rowIndex / Math.max(1, rows - 1)
      ctx!.beginPath()
      rowPoints.forEach((point, index) => {
        if (index === 0) ctx!.moveTo(point.x, point.y)
        else ctx!.lineTo(point.x, point.y)
      })
      ctx!.lineWidth = 0.42 + depth * 0.18
      ctx!.strokeStyle = getMagmaColorRGBA(0.28 + depth * 0.46, 0.045 + depth * 0.07)
      ctx!.stroke()
    })

    for (let col = 0; col < columns; col += 4) {
      ctx!.beginPath()
      points.forEach((rowPoints, rowIndex) => {
        const point = rowPoints[col]!
        if (rowIndex === 0) ctx!.moveTo(point.x, point.y)
        else ctx!.lineTo(point.x, point.y)
      })
      ctx!.lineWidth = 0.35
      ctx!.strokeStyle = 'rgba(59, 15, 112, 0.045)'
      ctx!.stroke()
    }

    points.flat().forEach((point) => {
      ctx!.fillStyle = getMagmaColorRGBA(point.colorVal, point.alpha)
      ctx!.beginPath()
      ctx!.arc(point.x, point.y, point.size, 0, Math.PI * 2)
      ctx!.fill()
    })
  }

  let raf = 0

  function loop(time: number) {
    drawFrame(time)
    if (!reducedMotion()) {
      raf = requestAnimationFrame(loop)
    } else {
      raf = 0
    }
  }

  return {
    start() {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      drawFrame(performance.now())
      if (!reducedMotion()) {
        raf = requestAnimationFrame(loop)
      }
    },
    stop() {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
    },
    drawFrame,
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
  }
}
