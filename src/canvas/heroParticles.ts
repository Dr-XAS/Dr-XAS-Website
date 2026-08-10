import { getMagmaColorRGBA } from './magma'

// Ported from script.js:1-283. This is a framework-free factory — React only
// supplies a canvas element and forwards window events into it. Keep this
// file's logic a line-for-line port; several things here look like bugs but
// are load-bearing for how the hero currently looks and feels:
//
// - The mouse-parallax lerp (`mouse.currentX += (targetX - currentX) * 0.05`)
//   runs *inside* Particle.update(), i.e. ~3,025 times per frame, not once
//   per frame. Moving it to a once-per-frame lerp changes the parallax feel
//   (it becomes visibly laggier/floatier). Don't "fix" it.
// - There is no DPR scaling (`canvas.width = window.innerWidth`, 1x backing
//   store). The hero is deliberately soft on retina today — adding DPR
//   scaling changes the visual and roughly 4x's the fill-rate cost.
// - `gridResolutionX/Z` is computed once from `innerWidth <= 768` at creation
//   and never recomputed on resize, even though resize re-runs
//   `initParticles()`. Preserved as-is.

interface Camera {
  z: number
  fov: number
}

class Particle {
  baseX: number
  baseZ: number
  amplitude = 300
  freq = 0.0075
  noiseOffset: number
  x3d: number
  y3d = 0
  z3d: number
  distance = 0
  size: number
  colorVal = 0
  color: string
  x2d = 0
  y2d = 0
  scale = 0
  i: number
  j: number

  constructor(
    gridX: number,
    gridZ: number,
    private gridResolutionX: number,
    private gridResolutionZ: number,
    private mouse: MouseState,
    private camera: Camera,
    private getSize: () => { width: number; height: number },
  ) {
    const spreadX = 45
    const spreadZ = 45
    this.baseX = (gridX - gridResolutionX / 2) * spreadX
    this.baseZ = (gridZ - gridResolutionZ / 2) * spreadZ

    this.noiseOffset = Math.sin(this.baseX * 0.05) * Math.cos(this.baseZ * 0.05) * 0.2

    this.x3d = this.baseX
    this.z3d = this.baseZ

    this.size = 0.5 + Math.random() * 5.5
    this.color = getMagmaColorRGBA(0)

    this.i = gridX
    this.j = gridZ
  }

  update(time: number) {
    const mouse = this.mouse
    const { width, height } = this.getSize()
    const maxRotationX = 0.2
    const maxRotationY = 0.2

    // Per-particle lerp — intentional, see module docblock.
    mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05
    mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05

    const rippleCenterX = mouse.currentX * 500
    const rippleCenterZ = mouse.currentY * 500

    const dx = this.baseX - rippleCenterX
    const dz = this.baseZ - rippleCenterZ
    this.distance = Math.sqrt(dx * dx + dz * dz)

    const timeOffset = time * 0.0015

    const stretchedDistance = Math.pow(this.distance, 0.93) * 1.5
    const decay = Math.max(0, 1 - Math.pow(this.distance / 1600, 1.5))

    this.y3d = Math.sin(stretchedDistance * this.freq - timeOffset + this.noiseOffset) * this.amplitude * decay

    const normalizedHeight = (this.y3d + this.amplitude) / (this.amplitude * 2)
    this.colorVal = Math.max(0, Math.min(1, normalizedHeight * (0.3 + 0.7 * decay)))

    let rotX = mouse.currentY * maxRotationX
    const rotXBase = 1.05
    rotX += rotXBase

    const rotY = mouse.currentX * maxRotationY

    const y1 = this.y3d * Math.cos(rotX) - this.baseZ * Math.sin(rotX)
    const z1 = this.y3d * Math.sin(rotX) + this.baseZ * Math.cos(rotX)

    const x2 = this.baseX * Math.cos(rotY) + z1 * Math.sin(rotY)
    const z2 = -this.baseX * Math.sin(rotY) + z1 * Math.cos(rotY)
    const y2 = y1

    const sceneZOffset = 800
    const finalZ = z2 + sceneZOffset

    this.scale = this.camera.fov / (this.camera.fov + finalZ)
    this.x2d = x2 * this.scale + width / 2
    this.y2d = y2 * this.scale + height / 2 + 10

    const depthAlpha = Math.max(0, Math.min(1, this.scale * 1.5))
    const finalAlpha = depthAlpha * decay
    this.color = getMagmaColorRGBA(this.colorVal, finalAlpha)
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.scale > 0 && this.x2d > -100 && this.x2d < width + 100 && this.y2d > -100 && this.y2d < height + 100) {
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(this.x2d, this.y2d, this.size * this.scale, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

interface MouseState {
  targetX: number
  targetY: number
  currentX: number
  currentY: number
}

export interface HeroFieldHandle {
  start(): void
  stop(): void
  resize(): void
  /** Draws a single static frame (used for prefers-reduced-motion). */
  renderOnce(time?: number): void
  setPointer(clientX: number, clientY: number): void
  clearPointer(): void
  destroy(): void
}

export function createHeroField(canvas: HTMLCanvasElement): HeroFieldHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  let width = 0
  let height = 0
  let particles: Particle[] = []
  let lines: [Particle, Particle][] = []

  // Computed once, matching the legacy module-load-time behavior (finding 3
  // in the migration plan): rotating/resizing never changes the grid density.
  const isMobile = window.innerWidth <= 768
  const gridResolutionX = isMobile ? 35 : 55
  const gridResolutionZ = isMobile ? 35 : 55

  const mouse: MouseState = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 }
  const camera: Camera = { z: 800, fov: 400 }

  const getSize = () => ({ width, height })

  function initParticles() {
    particles = []
    const grid: Particle[][] = []

    for (let i = 0; i < gridResolutionX; i++) {
      const row: Particle[] = []
      for (let j = 0; j < gridResolutionZ; j++) {
        const p = new Particle(i, j, gridResolutionX, gridResolutionZ, mouse, camera, getSize)
        particles.push(p)
        row.push(p)
      }
      grid.push(row)
    }

    lines = []
    for (let i = 0; i < gridResolutionX; i++) {
      for (let j = 0; j < gridResolutionZ; j++) {
        if (i < gridResolutionX - 1) lines.push([grid[i]![j]!, grid[i + 1]![j]!])
        if (j < gridResolutionZ - 1) lines.push([grid[i]![j]!, grid[i]![j + 1]!])
      }
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
    initParticles()
  }

  function drawFrame(time: number) {
    ctx!.clearRect(0, 0, width, height)

    particles.forEach((p) => p.update(time))

    ctx!.lineWidth = 1.2
    lines.forEach(([p1, p2]) => {
      if (p1.scale > 0 && p2.scale > 0) {
        const dx = p1.x2d - p2.x2d
        const dy = p1.y2d - p2.y2d
        const distSq = dx * dx + dy * dy

        if (distSq < 45000) {
          ctx!.beginPath()
          ctx!.moveTo(p1.x2d, p1.y2d)

          const ctrlX = (p1.x2d + p2.x2d) / 2
          const ctrlY = (p1.y2d + p2.y2d) / 2 + 35 * Math.min(p1.scale, p2.scale)

          ctx!.quadraticCurveTo(ctrlX, ctrlY, p2.x2d, p2.y2d)

          const avgColorVal = (p1.colorVal + p2.colorVal) / 2
          const lineDecay = Math.max(0, 1 - Math.max(p1.distance, p2.distance) / 1200)
          const alpha = Math.max(0, avgColorVal * 0.9 * Math.min(p1.scale, p2.scale) * lineDecay)
          ctx!.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.9, alpha)
          ctx!.stroke()
        }
      }
    })

    particles.forEach((p) => p.draw(ctx!, width, height))
  }

  let raf = 0
  function loop(time: number) {
    drawFrame(time)
    raf = requestAnimationFrame(loop)
  }

  return {
    start() {
      if (!raf) raf = requestAnimationFrame(loop)
    },
    stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
    resize,
    renderOnce(time = 0) {
      if (particles.length === 0) resize()
      drawFrame(time)
    },
    setPointer(clientX, clientY) {
      mouse.targetX = (clientX - width / 2) / (width / 2)
      mouse.targetY = -(clientY - height / 2) / (height / 2)
    },
    clearPointer() {
      mouse.targetX = 0
      mouse.targetY = 0
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      particles = []
      lines = []
    },
  }
}
