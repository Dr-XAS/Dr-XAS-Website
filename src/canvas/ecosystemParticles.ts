import { getMagmaColorRGBA } from './magma'

// Ported from script.js:726-1224 (initEcosystemParticles). A framework-free
// factory, same shape as heroParticles.ts and betaWave.ts — see the
// migration plan section 4 ("The ecosystem's live-DOM-rect bridge").
//
// The biggest structural change from the original: `updateModuleRects()`
// used to call `document.querySelectorAll('[data-ecosystem-module]')`
// directly. Here it calls `options.getButtonEl(id)` instead — a getter, not
// a snapshot — so the engine never holds a DOM node across frames and is
// invisible to React remounts (StrictMode, route transitions). The
// synthetic-grid fallback in `getModuleRect` (plan finding) is kept
// verbatim: it's the safety net for the frame where refs aren't attached
// yet, which is routine under StrictMode's double-invoke.
//
// Reduced-motion behavior is NOT "loop forever if matches" like the
// original (plan finding 9 — that ran the rAF loop even off-screen for
// reduced-motion users). Instead: draw one static frame, and animate only in
// short bursts when `setActiveModule` changes, auto-stopping once particles
// settle. Full-motion users keep today's behavior of animating only while
// visible, driven externally by `start()`/`stop()`.

export type ModuleId = string

interface Rect {
  x: number
  y: number
  width: number
  height: number
  cx: number
  cy: number
}

interface Point3 {
  x: number
  y: number
  z: number
}

interface Particle {
  module: ModuleId
  index: number
  formsTarget: boolean
  gravityStrength: number
  colorVal: number
  baseX: number
  baseY: number
  wanderX: number
  wanderY: number
  edgeInset: number
  speed: number
  secondarySpeed: number
  phase: number
  drift: number
  x: number
  y: number
  size: number
  opacity: number
  renderAlpha: number
}

interface BackgroundParticle {
  x: number
  y: number
  size: number
  opacity: number
  drift: number
  speed: number
}

export interface EcosystemFieldOptions {
  order: readonly ModuleId[]
  magmaRanges: Record<ModuleId, [number, number]>
  getButtonEl: (id: ModuleId) => HTMLButtonElement | null
  reducedMotion: () => boolean
}

export interface EcosystemFieldHandle {
  start(): void
  stop(): void
  resize(): void
  renderOnce(time?: number): void
  setActiveModule(id: ModuleId | null): void
  destroy(): void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function createEcosystemField(
  canvas: HTMLCanvasElement,
  sectionEl: HTMLElement,
  options: EcosystemFieldOptions,
): EcosystemFieldHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const { order: moduleOrder, magmaRanges, getButtonEl, reducedMotion } = options

  let ecoWidth = 0
  let ecoHeight = 0
  let ecoDpr = 1
  let ecosystemParticles: Particle[] = []
  const backgroundParticles: BackgroundParticle[] = []
  let ecosystemLines: [Particle, Particle][] = []
  let waveTargets: Record<ModuleId, Point3[]> = {}
  let moduleRects: Record<ModuleId, Rect> = {}
  let activeModule: ModuleId | null = null

  function moduleMagmaValue(moduleName: ModuleId, seed: number): number {
    const range = magmaRanges[moduleName]!
    return range[0] + (range[1] - range[0]) * seed
  }

  function isEcoMobile(): boolean {
    return ecoWidth < 700
  }

  function updateModuleRects() {
    const sectionRect = sectionEl.getBoundingClientRect()
    moduleRects = {}

    moduleOrder.forEach((moduleName) => {
      const button = getButtonEl(moduleName)
      if (!button) return
      const rect = button.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      moduleRects[moduleName] = {
        x: rect.left - sectionRect.left,
        y: rect.top - sectionRect.top,
        width: rect.width,
        height: rect.height,
        cx: rect.left - sectionRect.left + rect.width / 2,
        cy: rect.top - sectionRect.top + rect.height / 2,
      }
    })
  }

  // Synthetic-grid fallback: used whenever a button's rect hasn't been
  // measured yet (first frame, StrictMode remount, refs not attached).
  function getModuleRect(moduleName: ModuleId): Rect {
    const measured = moduleRects[moduleName]
    if (measured) return measured

    const index = Math.max(0, moduleOrder.indexOf(moduleName))
    const columns = isEcoMobile() ? 1 : 4
    const rows = isEcoMobile() ? 4 : 1
    const gap = isEcoMobile() ? 14 : 18
    const gridWidth = Math.min(ecoWidth * 0.92, isEcoMobile() ? 360 : 1120)
    const gridHeight = isEcoMobile() ? 720 : 460
    const cellWidth = (gridWidth - gap * (columns - 1)) / columns
    const cellHeight = (gridHeight - gap * (rows - 1)) / rows
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = (ecoWidth - gridWidth) / 2 + col * (cellWidth + gap)
    const y = ecoHeight - gridHeight - 72 + row * (cellHeight + gap)

    return { x, y, width: cellWidth, height: cellHeight, cx: x + cellWidth / 2, cy: y + cellHeight / 2 }
  }

  function randomPointInRect(rect: Rect, inset = 18) {
    const marginX = Math.min(inset, rect.width * 0.18)
    const marginY = Math.min(inset, rect.height * 0.18)
    const usableWidth = Math.max(1, rect.width - marginX * 2)
    const usableHeight = Math.max(1, rect.height - marginY * 2)

    return {
      x: rect.x + marginX + Math.random() * usableWidth,
      y: rect.y + marginY + Math.random() * usableHeight,
    }
  }

  function shufflePoints<T>(points: T[]): T[] {
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const current = points[i]!
      points[i] = points[j]!
      points[j] = current
    }
    return points
  }

  function waveform(module: ModuleId, t: number, layer: number): number {
    const centered = t - 0.5
    const layerPhase = layer * 0.42

    if (module === moduleOrder[0]) {
      // XASpert: single sharp pulse
      const envelope = Math.exp(-Math.pow(centered * 2.2, 2))
      return Math.sin(t * Math.PI * 4.6 + layerPhase) * envelope
    }

    if (module === moduleOrder[1]) {
      // XASbench: sigmoid step
      const sigmoid = 1 / (1 + Math.exp(-(t - 0.5) * 10))
      return (sigmoid - 0.5) * 1.45 + Math.sin(t * Math.PI * 2 + layerPhase) * 0.16
    }

    if (module === moduleOrder[2]) {
      // XASperiment: tighter oscillation
      const envelope = Math.exp(-Math.pow(centered * 3.1, 2))
      return Math.sin(t * Math.PI * 8.2 + layerPhase) * envelope * 0.9
    }

    // XASight: three-peak spectrum shape
    const peakA = Math.exp(-Math.pow((t - 0.25) / 0.08, 2))
    const peakB = Math.exp(-Math.pow((t - 0.56) / 0.11, 2)) * 0.78
    const peakC = Math.exp(-Math.pow((t - 0.78) / 0.07, 2)) * 0.58
    return (peakA + peakB + peakC - 0.7) * 0.95 + Math.sin(t * Math.PI * 5 + layerPhase) * 0.08
  }

  function buildTargetsForModule(moduleName: ModuleId): Point3[] {
    const rect = getModuleRect(moduleName)
    const points: Point3[] = []
    const samples = isEcoMobile() ? 86 : 132
    const layers = isEcoMobile() ? 3 : 4
    const insetX = rect.width * 0.16
    const baseY = rect.y + rect.height * 0.64
    const amp = rect.height * 0.16
    const usableWidth = rect.width - insetX * 2

    for (let layer = 0; layer < layers; layer++) {
      const layerOffset = (layer - (layers - 1) / 2) * (isEcoMobile() ? 4 : 5)

      for (let i = 0; i < samples; i++) {
        const t = i / Math.max(1, samples - 1)
        const x = rect.x + insetX + t * usableWidth
        const y = baseY - waveform(moduleName, t, layer) * amp + layerOffset

        points.push({
          x: x + (Math.random() - 0.5) * 2.8,
          y: clamp(y + (Math.random() - 0.5) * 3.2, rect.y + rect.height * 0.36, rect.y + rect.height * 0.86),
          z: (layer - (layers - 1) / 2) * rect.height * 0.08 + (Math.random() - 0.5) * rect.height * 0.04,
        })
      }
    }

    return shufflePoints(points)
  }

  function rotatedWaveTarget(moduleName: ModuleId, target: Point3, time: number) {
    if (reducedMotion()) return target

    const rect = getModuleRect(moduleName)
    const cx = rect.cx
    const cy = rect.y + rect.height * 0.64
    const dx = target.x - cx
    const dy = target.y - cy
    const dz = target.z || 0
    const t = time * 0.00028
    const indexOffset = moduleOrder.indexOf(moduleName) * 0.55
    const angleY = Math.sin(t + indexOffset) * 0.52
    const angleX = Math.cos(t * 0.82 + indexOffset) * 0.22
    const cosY = Math.cos(angleY)
    const sinY = Math.sin(angleY)
    const cosX = Math.cos(angleX)
    const sinX = Math.sin(angleX)
    const rx = dx * cosY + dz * sinY
    const rz = dz * cosY - dx * sinY
    const ry = dy * cosX - rz * sinX
    const rz2 = rz * cosX + dy * sinX
    const perspective = 1 / (1 + rz2 / Math.max(240, rect.width * 1.8))

    return {
      x: cx + rx * perspective,
      y: clamp(cy + ry * perspective, rect.y + rect.height * 0.28, rect.y + rect.height * 0.9),
    }
  }

  function randomTargetForParticle(particle: Particle, time: number) {
    const rect = getModuleRect(particle.module)
    const motionTime = reducedMotion() ? 0 : time
    const x =
      particle.baseX +
      Math.sin(motionTime * particle.speed + particle.phase) * particle.wanderX +
      Math.sin(motionTime * particle.secondarySpeed + particle.drift) * particle.wanderX * 0.35
    const y =
      particle.baseY +
      Math.cos(motionTime * particle.speed + particle.phase) * particle.wanderY +
      Math.cos(motionTime * particle.secondarySpeed + particle.drift) * particle.wanderY * 0.35
    const inset = particle.edgeInset

    return {
      x: clamp(x, rect.x + inset, rect.x + rect.width - inset),
      y: clamp(y, rect.y + inset, rect.y + rect.height - inset),
    }
  }

  function buildEcosystemLines(moduleParticles: Particle[], rect: Rect) {
    const maxDistance = Math.min(rect.width, rect.height) * (isEcoMobile() ? 0.22 : 0.2)
    const maxDistanceSq = maxDistance * maxDistance

    for (let i = 0; i < moduleParticles.length; i += 2) {
      const particle = moduleParticles[i]!
      let nearest: Particle | null = null
      let nearestDistanceSq = Infinity
      let secondNearest: Particle | null = null
      let secondDistanceSq = Infinity

      for (let j = i + 1; j < moduleParticles.length; j++) {
        const candidate = moduleParticles[j]!
        const dx = particle.baseX - candidate.baseX
        const dy = particle.baseY - candidate.baseY
        const distanceSq = dx * dx + dy * dy

        if (distanceSq > maxDistanceSq) continue

        if (distanceSq < nearestDistanceSq) {
          secondNearest = nearest
          secondDistanceSq = nearestDistanceSq
          nearest = candidate
          nearestDistanceSq = distanceSq
        } else if (distanceSq < secondDistanceSq) {
          secondNearest = candidate
          secondDistanceSq = distanceSq
        }
      }

      if (nearest && Math.random() > 0.12) {
        ecosystemLines.push([particle, nearest])
      }

      if (secondNearest && Math.random() > 0.76) {
        ecosystemLines.push([particle, secondNearest])
      }
    }
  }

  function resetParticles() {
    updateModuleRects()

    const moduleParticleCount = isEcoMobile() ? 130 : 260
    ecosystemParticles = []
    ecosystemLines = []
    waveTargets = {}

    moduleOrder.forEach((moduleName) => {
      waveTargets[moduleName] = buildTargetsForModule(moduleName)
      const rect = getModuleRect(moduleName)
      const moduleParticles: Particle[] = []

      for (let i = 0; i < moduleParticleCount; i++) {
        const start = randomPointInRect(rect, isEcoMobile() ? 14 : 18)
        const centerDx = (start.x - rect.cx) / Math.max(1, rect.width * 0.5)
        const centerDy = (start.y - rect.cy) / Math.max(1, rect.height * 0.5)
        const centerDistance = Math.min(1, Math.sqrt(centerDx * centerDx + centerDy * centerDy))
        const edgeDecay = Math.max(0.24, 1 - Math.pow(centerDistance, 1.45) * 0.62)
        const edgeParticle = centerDistance > 0.82

        const particle: Particle = {
          module: moduleName,
          index: i,
          formsTarget: !edgeParticle && Math.random() > 0.28,
          gravityStrength: 0.1 + Math.random() * 0.18,
          colorVal: moduleMagmaValue(moduleName, Math.random()),
          baseX: start.x,
          baseY: start.y,
          wanderX: 6 + Math.random() * (isEcoMobile() ? 12 : 18),
          wanderY: 6 + Math.random() * (isEcoMobile() ? 12 : 18),
          edgeInset: isEcoMobile() ? 12 : 16,
          speed: (Math.random() > 0.5 ? 1 : -1) * (0.00007 + Math.random() * 0.00014),
          secondarySpeed: (Math.random() > 0.5 ? 1 : -1) * (0.00004 + Math.random() * 0.00008),
          phase: Math.random() * Math.PI * 2,
          drift: Math.random() * Math.PI * 2,
          x: start.x,
          y: start.y,
          size: 0.32 + Math.random() * (isEcoMobile() ? 1.8 : 2.35),
          opacity: (0.14 + Math.random() * 0.34) * edgeDecay,
          renderAlpha: 0,
        }

        ecosystemParticles.push(particle)
        moduleParticles.push(particle)
      }

      buildEcosystemLines(moduleParticles, rect)
    })
  }

  function resizeEcosystemCanvas() {
    const rect = sectionEl.getBoundingClientRect()
    ecoWidth = Math.max(1, rect.width)
    ecoHeight = Math.max(1, rect.height)
    ecoDpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(ecoWidth * ecoDpr)
    canvas.height = Math.floor(ecoHeight * ecoDpr)
    canvas.style.width = `${ecoWidth}px`
    canvas.style.height = `${ecoHeight}px`
    ctx!.setTransform(ecoDpr, 0, 0, ecoDpr, 0, 0)
    resetParticles()
  }

  function drawEcosystem(time: number): number {
    ctx!.clearRect(0, 0, ecoWidth, ecoHeight)

    backgroundParticles.forEach((point) => {
      const motionTime = reducedMotion() ? 0 : time
      const x = point.x + Math.sin(motionTime * point.speed + point.drift) * 8
      const y = point.y + Math.cos(motionTime * point.speed + point.drift) * 6
      ctx!.fillStyle = `rgba(0, 0, 0, ${point.opacity})`
      ctx!.beginPath()
      ctx!.arc(x, y, point.size, 0, Math.PI * 2)
      ctx!.fill()
    })

    ctx!.lineWidth = isEcoMobile() ? 0.65 : 0.8
    ecosystemLines.forEach(([p1, p2]) => {
      const dx = p1.x - p2.x
      const dy = p1.y - p2.y
      const distSq = dx * dx + dy * dy
      const maxDistSq = isEcoMobile() ? 4200 : 6200

      if (distSq > maxDistSq) return

      const activeLine = activeModule === p1.module
      const avgColorVal = (p1.colorVal + p2.colorVal) / 2
      const baseAlpha = Math.min(p1.renderAlpha || p1.opacity, p2.renderAlpha || p2.opacity)
      const distanceFade = Math.max(0, 1 - distSq / maxDistSq)
      const alpha = Math.min(0.2, avgColorVal * baseAlpha * distanceFade * (activeLine ? 0.36 : 0.52))

      if (alpha <= 0.01) return

      ctx!.beginPath()
      ctx!.moveTo(p1.x, p1.y)
      const ctrlX = (p1.x + p2.x) / 2
      const ctrlY = (p1.y + p2.y) / 2 + Math.min(18, Math.sqrt(distSq) * 0.16)
      ctx!.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y)
      ctx!.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.9, alpha)
      ctx!.stroke()
    })

    let maxDelta = 0

    ecosystemParticles.forEach((particle) => {
      let target = randomTargetForParticle(particle, time)
      const isActive = activeModule === particle.module

      if (isActive && waveTargets[particle.module]!.length > 0) {
        const targets = waveTargets[particle.module]!
        const waveIndex = (particle.index * 3 + Math.floor(particle.phase * 11)) % targets.length
        const waveTarget = rotatedWaveTarget(particle.module, targets[waveIndex]!, time)

        if (particle.formsTarget) {
          target = waveTarget
        } else {
          target = {
            x: target.x + (waveTarget.x - target.x) * particle.gravityStrength,
            y: target.y + (waveTarget.y - target.y) * particle.gravityStrength,
          }
        }
      }

      const easing = isActive && particle.formsTarget ? 0.038 : isActive ? 0.011 : 0.018
      const dx = (target.x - particle.x) * easing
      const dy = (target.y - particle.y) * easing
      particle.x += dx
      particle.y += dy
      maxDelta = Math.max(maxDelta, Math.abs(dx), Math.abs(dy))

      const alpha = isActive && particle.formsTarget ? 0.76 : particle.opacity * (isActive ? 0.82 : 1)
      const size = isActive && particle.formsTarget ? particle.size * 0.9 : particle.size
      particle.renderAlpha = alpha
      ctx!.fillStyle = getMagmaColorRGBA(particle.colorVal, alpha)
      ctx!.beginPath()
      ctx!.arc(particle.x, particle.y, size, 0, Math.PI * 2)
      ctx!.fill()
    })

    return maxDelta
  }

  let raf = 0
  let settledFrames = 0
  const SETTLE_DELTA = 0.2
  const SETTLE_FRAMES = 40

  function loop(time: number) {
    const maxDelta = drawEcosystem(time)

    if (reducedMotion()) {
      // Burst mode: keep animating until particles have converged, then
      // stop on our own so a reduced-motion user never pays for a
      // perpetual off-screen rAF loop (plan finding 9).
      settledFrames = maxDelta < SETTLE_DELTA ? settledFrames + 1 : 0
      if (settledFrames >= SETTLE_FRAMES) {
        raf = 0
        return
      }
    }

    raf = requestAnimationFrame(loop)
  }

  return {
    start() {
      if (!raf) {
        settledFrames = 0
        raf = requestAnimationFrame(loop)
      }
    },
    stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
    resize: resizeEcosystemCanvas,
    renderOnce(time = 0) {
      if (ecosystemParticles.length === 0) resizeEcosystemCanvas()
      drawEcosystem(time)
    },
    setActiveModule(id) {
      activeModule = id
      if (reducedMotion()) {
        // A hover/focus/click while reduced motion is on: animate a short
        // burst so the assembly is still visible as information, then settle.
        settledFrames = 0
        if (!raf) raf = requestAnimationFrame(loop)
      }
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      ecosystemParticles = []
      ecosystemLines = []
    },
  }
}
