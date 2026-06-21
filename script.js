const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let lines = [];
// Create a grid for the 3D surface
// Adjust density based on screen width
const isMobile = window.innerWidth <= 768;
const gridResolutionX = isMobile ? 35 : 55; // Much more dense for rounder, smoother curves on desktop
const gridResolutionZ = isMobile ? 35 : 55;
const numParticles = gridResolutionX * gridResolutionZ;

// Mouse interaction for subtle parallax
const mouse = {
    x: null,
    y: null,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0
};

// 3D camera properties
const camera = {
    z: 800,
    fov: 400
};

window.addEventListener('mousemove', (e) => {
    // Normalize mouse coords to -1 to 1 based on center of screen
    mouse.targetX = (e.clientX - width / 2) / (width / 2);
    mouse.targetY = -(e.clientY - height / 2) / (height / 2);

    // For original repulsion logic (though we'll use it less now)
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.targetX = 0;
    mouse.targetY = 0;
    mouse.x = null;
    mouse.y = null;
});

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
}

window.addEventListener('resize', resizeCanvas);

// Color map "magma"
const magmaColors = [
    '#000004', '#140e36', '#3b0f70', '#641a80',
    '#8c2981', '#b73779', '#de4968', '#f7705c',
    '#fe9f6d', '#fecf92', '#fcfdbf'
];

// Helper to get rgba string with opacity
function getMagmaColorRGBA(value, alpha = 1) {
    if (value < 0) value = 0;
    if (value > 1) value = 1;
    const index = Math.floor(value * (magmaColors.length - 1));
    const hex = magmaColors[index];

    // Convert hex to rgb
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

class Particle {
    constructor(gridX, gridZ) {
        // Spread the grid out significantly to fill space
        // With higher density, slightly reduce spread to keep scale manageable but still large
        const spreadX = 45;
        const spreadZ = 45;
        this.baseX = (gridX - gridResolutionX / 2) * spreadX;
        this.baseZ = (gridZ - gridResolutionZ / 2) * spreadZ;

        // Amplitude and frequency for the center ripples
        // Increased amplitude and decreased frequency to make ripples physically bigger
        this.amplitude = 300;
        this.freq = 0.0075; // Lower frequency means wider rings

        // Organic noise: a fixed offset for each particle based on its position
        // Reduced from 1.5 to 0.2 to prevent breaking the cohesive rings while retaining a subtle natural wobble
        this.noiseOffset = (Math.sin(this.baseX * 0.05) * Math.cos(this.baseZ * 0.05)) * 0.2;

        // Current 3D position 
        this.x3d = this.baseX;
        this.y3d = 0; // will be calculated in update
        this.z3d = this.baseZ;

        // This will be calculated in update() so it can move with mouse
        this.distance = 0;

        // Visual properties
        // Randomize the sizes of the points for a more varied, natural feel (0.5 to 6.0 as requested)
        this.size = 0.5 + Math.random() * 5.5;

        this.colorVal = 0;
        this.color = getMagmaColorRGBA(0);

        // 2D projection coordinates
        this.x2d = 0;
        this.y2d = 0;
        this.scale = 0;

        // Grid indices for line drawing
        this.i = gridX;
        this.j = gridZ;
    }

    update(time) {
        // Subtle mouse parallax effect
        const maxRotationX = 0.2; // radians
        const maxRotationY = 0.2;

        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

        // Origin of the ripple follows the mouse slightly
        const rippleCenterX = mouse.currentX * 500;
        const rippleCenterZ = mouse.currentY * 500;

        // Update the distance to the dynamic center
        const dx = this.baseX - rippleCenterX;
        const dz = this.baseZ - rippleCenterZ;
        this.distance = Math.sqrt(dx * dx + dz * dz);

        // Water ripple animation moving outwards from the center
        const timeOffset = time * 0.0015;

        // 1. Increasing spacing outwards: 
        // We use Math.pow to stretch the wave out at the edges, but toned down from 0.85 to 0.93 
        // so the rings remain distinctly cohesive and readable as a water ripple.
        const stretchedDistance = Math.pow(this.distance, 0.93) * 1.5;

        // 2. Strong fading of amplitude outwards
        // We want tight, tall peaks in the center that fade quickly into the background plane
        // Expand decay radius since the ripple is bigger now
        const decay = Math.max(0, 1 - Math.pow(this.distance / 1600, 1.5));

        // 3. Mathematical Ripple with Noise
        // sin(stretchedDistance * freq - time + noise) * amplitude * decay
        this.y3d = Math.sin(stretchedDistance * this.freq - timeOffset + this.noiseOffset) * this.amplitude * decay;

        // Update color based on ripple height AND decay.
        // As it decays outwards, it will flatten out and the color will merge with the dark background.
        // Normalize y3d from [-amplitude, amplitude] to [0.2, 0.9], but scale back to 0.1 at edges
        let normalizedHeight = (this.y3d + this.amplitude) / (this.amplitude * 2);

        // 4. Fade color outwards to merge with background (which is dark magma / black)
        // By multiplying by decay, the colorVal drops towards 0 (dark purple/black) at the edges
        this.colorVal = Math.max(0, Math.min(1, normalizedHeight * (0.3 + 0.7 * decay)));

        // Look down to see the ripple surface
        let rotX = mouse.currentY * maxRotationX;
        let rotX_base = 1.05; // Look more top down to hide back edges behind depth fog
        rotX += rotX_base;

        let rotY = mouse.currentX * maxRotationY;

        let y1 = this.y3d * Math.cos(rotX) - this.baseZ * Math.sin(rotX);
        let z1 = this.y3d * Math.sin(rotX) + this.baseZ * Math.cos(rotX);

        let x2 = this.baseX * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -this.baseX * Math.sin(rotY) + z1 * Math.cos(rotY);
        let y2 = y1;

        // 3D to 2D Projection
        const sceneZOffset = 800; // pushed further back
        const finalZ = z2 + sceneZOffset;

        this.scale = camera.fov / (camera.fov + finalZ);
        this.x2d = x2 * this.scale + width / 2;
        // Shifted further up to match the newly raised `.content` hero text
        this.y2d = y2 * this.scale + height / 2 + 10;

        // Update color alpha based on depth AND distance to center (hides rectangular grid bounds)
        const depthAlpha = Math.max(0, Math.min(1, this.scale * 1.5));
        const finalAlpha = depthAlpha * decay;
        this.color = getMagmaColorRGBA(this.colorVal, finalAlpha);
    }

    draw() {
        if (this.scale > 0 && this.x2d > -100 && this.x2d < width + 100 && this.y2d > -100 && this.y2d < height + 100) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x2d, this.y2d, this.size * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function initParticles() {
    particles = [];

    // Create a 2D array to easily form grid lines
    let grid = [];

    for (let i = 0; i < gridResolutionX; i++) {
        let row = [];
        for (let j = 0; j < gridResolutionZ; j++) {
            let p = new Particle(i, j);
            particles.push(p);
            row.push(p);
        }
        grid.push(row);
    }

    // Generate line connections (horizontal and vertical)
    lines = [];
    for (let i = 0; i < gridResolutionX; i++) {
        for (let j = 0; j < gridResolutionZ; j++) {
            // Since we reduced the grid size, connect all immediate neighbors

            // Connect to right neighbor
            if (i < gridResolutionX - 1) {
                lines.push([grid[i][j], grid[i + 1][j]]);
            }
            // Connect to bottom neighbor
            if (j < gridResolutionZ - 1) {
                lines.push([grid[i][j], grid[i][j + 1]]);
            }
        }
    }
}

function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Update all particles
    particles.forEach(p => p.update(time));

    // Draw lines first so they are underneath points
    ctx.lineWidth = 1.2; // Slightly thicker lines for the scarce grid
    lines.forEach(pair => {
        const p1 = pair[0];
        const p2 = pair[1];

        // Only draw if both points are somewhat visible and in front of camera
        if (p1.scale > 0 && p2.scale > 0) {
            // Distance check 
            const dx = p1.x2d - p2.x2d;
            const dy = p1.y2d - p2.y2d;
            const distSq = dx * dx + dy * dy;

            if (distSq < 45000) {
                ctx.beginPath();
                ctx.moveTo(p1.x2d, p1.y2d);

                // Create a beautiful drape curve
                const ctrlX = (p1.x2d + p2.x2d) / 2;
                const ctrlY = (p1.y2d + p2.y2d) / 2 + 35 * Math.min(p1.scale, p2.scale);

                ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x2d, p2.y2d);

                const avgColorVal = (p1.colorVal + p2.colorVal) / 2;

                // Fade out edges smoothly
                const lineDecay = Math.max(0, 1 - (Math.max(p1.distance, p2.distance) / 1200));
                const alpha = Math.max(0, avgColorVal * 0.9 * Math.min(p1.scale, p2.scale) * lineDecay);
                ctx.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.9, alpha);
                ctx.stroke();
            }
        }
    });

    // Draw points on top
    particles.forEach(p => p.draw());

    requestAnimationFrame(animate);
}

resizeCanvas();
requestAnimationFrame(animate);

// --- Mobile Navigation Toggle ---
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
        mobileBtn.classList.toggle('open');
        navLinks.classList.toggle('active');
    });
}

// --- Elegant Typewriter Effect ---
const typewriterTextElement = document.getElementById('typewriter-text');
const fullText = "The next generation AI companion<br>for X-ray absorption spectroscopy.";

// Parse text to handle HTML tags like <br> natively
const typeArray = [];
let inTag = false;
let currentTagStr = "";

for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    if (char === '<') {
        inTag = true;
        currentTagStr = '<';
    } else if (inTag) {
        currentTagStr += char;
        if (char === '>') {
            inTag = false;
            typeArray.push(currentTagStr);
            currentTagStr = "";
        }
    } else {
        typeArray.push(char);
    }
}

let currentTypeIndex = 0;
function typeWriterEffect() {
    if (currentTypeIndex < typeArray.length) {
        typewriterTextElement.innerHTML += typeArray[currentTypeIndex];
        currentTypeIndex++;

        // Typing speed: 0 delay for tags, fast random delay for chars to feel organic
        const delay = typeArray[currentTypeIndex - 1].startsWith('<') ? 0 : 20 + Math.random() * 30;
        setTimeout(typeWriterEffect, delay);
    }
}

// Start the typing effect shortly after the logo fades in
setTimeout(typeWriterEffect, 600);

// --- Scroll Spy & Video Autoplay ---
const dotNav = document.querySelector('.dot-nav');
const dotItems = document.querySelectorAll('.dot-item');
const demoSections = document.querySelectorAll('.demo-section');
const demoVideos = document.querySelectorAll('.demo-video');
const mobileVideoQuery = window.matchMedia('(max-width: 900px)');

function syncVideoSources() {
    demoVideos.forEach(video => {
        const source = video.querySelector('source');
        if (!source) return;

        if (!video.dataset.desktopSrc) {
            video.dataset.desktopSrc = source.getAttribute('src') || '';
        }

        if (!video.dataset.desktopPoster) {
            video.dataset.desktopPoster = video.getAttribute('poster') || '';
        }

        const targetSrc = mobileVideoQuery.matches && video.dataset.mobileSrc
            ? video.dataset.mobileSrc
            : video.dataset.desktopSrc;
        const targetPoster = mobileVideoQuery.matches && video.dataset.mobilePoster
            ? video.dataset.mobilePoster
            : video.dataset.desktopPoster;

        if (targetPoster) {
            video.setAttribute('poster', targetPoster);
        }

        if (targetSrc && source.getAttribute('src') !== targetSrc) {
            source.setAttribute('src', targetSrc);
            video.load();
        }
    });
}

function attemptVideoPlayback(video) {
    if (!video) return;

    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise
            .then(() => {
                video.controls = false;
            })
            .catch((error) => {
                console.log('Auto-play prevented', error);
                video.controls = true;
            });
    }
}

function replayVisibleVideos() {
    demoSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.25;

        if (isVisible) {
            attemptVideoPlayback(section.querySelector('video'));
        }
    });
}

syncVideoSources();
demoVideos.forEach(video => {
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
});

window.addEventListener('touchstart', replayVisibleVideos, { passive: true });
window.addEventListener('pointerdown', replayVisibleVideos, { passive: true });
const handleVideoViewportChange = () => {
    syncVideoSources();
    replayVisibleVideos();
};

if (typeof mobileVideoQuery.addEventListener === 'function') {
    mobileVideoQuery.addEventListener('change', handleVideoViewportChange);
} else if (typeof mobileVideoQuery.addListener === 'function') {
    mobileVideoQuery.addListener(handleVideoViewportChange);
}

if (dotNav && dotItems.length > 0 && demoSections.length > 0) {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // Trigger when 50% of the section is visible
    };

    let visibleSectionsCount = 0;

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const correspondingDot = document.querySelector(`.dot-item[data-target="${id}"]`);
            const video = entry.target.querySelector('video');

            if (entry.isIntersecting) {
                visibleSectionsCount++;

                // Update dots
                dotItems.forEach(dot => dot.classList.remove('active'));
                if (correspondingDot) {
                    correspondingDot.classList.add('active');
                }

                // Play video in view
                if (video) {
                    attemptVideoPlayback(video);
                }
            } else {
                if (visibleSectionsCount > 0) visibleSectionsCount--;

                // Pause video out of view to save resources
                if (video) {
                    video.pause();
                }
            }
        });

        // Toggle overall dot navigation visibility
        if (visibleSectionsCount > 0) {
            dotNav.classList.add('is-visible');
        } else {
            dotNav.classList.remove('is-visible');
        }

    }, observerOptions);

    demoSections.forEach(section => {
        sectionObserver.observe(section);
    });
}

// --- Dr. XAS Ecosystem Particle Section ---
(function initEcosystemParticles() {
    const ecosystemSection = document.querySelector('.ecosystem-section');
    const ecosystemCanvas = document.getElementById('ecosystemCanvas');
    const moduleButtons = Array.from(document.querySelectorAll('[data-ecosystem-module]'));

    if (!ecosystemSection || !ecosystemCanvas || moduleButtons.length === 0) return;

    const ecoCtx = ecosystemCanvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const moduleOrder = ['XASpert', 'XASbench', 'XASperiment', 'XASight'];
    const moduleConfig = {
        XASpert: {
            color: '#3b0f70',
            magmaRange: [0.7, 0.9]
        },
        XASbench: {
            color: '#f7705c',
            magmaRange: [0.5, 0.7]
        },
        XASperiment: {
            color: '#b73779',
            magmaRange: [0.32, 0.52]
        },
        XASight: {
            color: '#3b0f70',
            magmaRange: [0.12, 0.32]
        }
    };

    let ecoWidth = 0;
    let ecoHeight = 0;
    let ecoDpr = 1;
    let ecosystemParticles = [];
    let backgroundParticles = [];
    let ecosystemLines = [];
    let waveTargets = {};
    let moduleRects = {};
    let activeModule = null;
    let lockedModule = null;
    let isEcosystemVisible = false;
    let frameId = null;

    function moduleMagmaValue(moduleName, seed) {
        const range = moduleConfig[moduleName].magmaRange;
        return range[0] + (range[1] - range[0]) * seed;
    }

    function isEcoMobile() {
        return ecoWidth < 700;
    }

    function updateModuleRects() {
        const sectionRect = ecosystemSection.getBoundingClientRect();
        moduleRects = {};

        moduleButtons.forEach(button => {
            const moduleName = button.dataset.ecosystemModule;
            const rect = button.getBoundingClientRect();

            if (rect.width <= 0 || rect.height <= 0) return;

            moduleRects[moduleName] = {
                x: rect.left - sectionRect.left,
                y: rect.top - sectionRect.top,
                width: rect.width,
                height: rect.height,
                cx: rect.left - sectionRect.left + rect.width / 2,
                cy: rect.top - sectionRect.top + rect.height / 2
            };
        });
    }

    function getModuleRect(moduleName) {
        if (moduleRects[moduleName]) return moduleRects[moduleName];

        const index = Math.max(0, moduleOrder.indexOf(moduleName));
        const columns = isEcoMobile() ? 1 : 4;
        const rows = isEcoMobile() ? 4 : 1;
        const gap = isEcoMobile() ? 14 : 18;
        const gridWidth = Math.min(ecoWidth * 0.92, isEcoMobile() ? 360 : 1120);
        const gridHeight = isEcoMobile() ? 720 : 460;
        const cellWidth = (gridWidth - gap * (columns - 1)) / columns;
        const cellHeight = (gridHeight - gap * (rows - 1)) / rows;
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = (ecoWidth - gridWidth) / 2 + col * (cellWidth + gap);
        const y = ecoHeight - gridHeight - (isEcoMobile() ? 72 : 72) + row * (cellHeight + gap);

        return {
            x,
            y,
            width: cellWidth,
            height: cellHeight,
            cx: x + cellWidth / 2,
            cy: y + cellHeight / 2
        };
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function randomPointInRect(rect, inset = 18) {
        const marginX = Math.min(inset, rect.width * 0.18);
        const marginY = Math.min(inset, rect.height * 0.18);
        const usableWidth = Math.max(1, rect.width - marginX * 2);
        const usableHeight = Math.max(1, rect.height - marginY * 2);

        return {
            x: rect.x + marginX + Math.random() * usableWidth,
            y: rect.y + marginY + Math.random() * usableHeight
        };
    }

    function shufflePoints(points) {
        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const current = points[i];
            points[i] = points[j];
            points[j] = current;
        }
        return points;
    }

    function buildTargetsForModule(moduleName) {
        const rect = getModuleRect(moduleName);
        const points = [];
        const samples = isEcoMobile() ? 86 : 132;
        const layers = isEcoMobile() ? 3 : 4;
        const insetX = rect.width * 0.16;
        const baseY = rect.y + rect.height * 0.64;
        const amp = rect.height * 0.16;
        const usableWidth = rect.width - insetX * 2;

        function waveform(module, t, layer) {
            const centered = t - 0.5;
            const layerPhase = layer * 0.42;

            if (module === 'XASpert') {
                const envelope = Math.exp(-Math.pow(centered * 2.2, 2));
                return Math.sin(t * Math.PI * 4.6 + layerPhase) * envelope;
            }

            if (module === 'XASbench') {
                const sigmoid = 1 / (1 + Math.exp(-(t - 0.5) * 10));
                return (sigmoid - 0.5) * 1.45 + Math.sin(t * Math.PI * 2 + layerPhase) * 0.16;
            }

            if (module === 'XASperiment') {
                const envelope = Math.exp(-Math.pow(centered * 3.1, 2));
                return Math.sin(t * Math.PI * 8.2 + layerPhase) * envelope * 0.9;
            }

            const peakA = Math.exp(-Math.pow((t - 0.25) / 0.08, 2));
            const peakB = Math.exp(-Math.pow((t - 0.56) / 0.11, 2)) * 0.78;
            const peakC = Math.exp(-Math.pow((t - 0.78) / 0.07, 2)) * 0.58;
            return (peakA + peakB + peakC - 0.7) * 0.95 + Math.sin(t * Math.PI * 5 + layerPhase) * 0.08;
        }

        for (let layer = 0; layer < layers; layer++) {
            const layerOffset = (layer - (layers - 1) / 2) * (isEcoMobile() ? 4 : 5);

            for (let i = 0; i < samples; i++) {
                const t = i / Math.max(1, samples - 1);
                const x = rect.x + insetX + t * usableWidth;
                const y = baseY - waveform(moduleName, t, layer) * amp + layerOffset;

                points.push({
                    x: x + (Math.random() - 0.5) * 2.8,
                    y: clamp(y + (Math.random() - 0.5) * 3.2, rect.y + rect.height * 0.36, rect.y + rect.height * 0.86),
                    z: (layer - (layers - 1) / 2) * rect.height * 0.08 + (Math.random() - 0.5) * rect.height * 0.04
                });
            }
        }

        return shufflePoints(points);
    }

    function rotatedWaveTarget(moduleName, target, time) {
        if (reducedMotion.matches) return target;

        const rect = getModuleRect(moduleName);
        const cx = rect.cx;
        const cy = rect.y + rect.height * 0.64;
        const dx = target.x - cx;
        const dy = target.y - cy;
        const dz = target.z || 0;
        const t = time * 0.00028;
        const indexOffset = moduleOrder.indexOf(moduleName) * 0.55;
        const angleY = Math.sin(t + indexOffset) * 0.52;
        const angleX = Math.cos(t * 0.82 + indexOffset) * 0.22;
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const rx = dx * cosY + dz * sinY;
        const rz = dz * cosY - dx * sinY;
        const ry = dy * cosX - rz * sinX;
        const rz2 = rz * cosX + dy * sinX;
        const perspective = 1 / (1 + rz2 / Math.max(240, rect.width * 1.8));

        return {
            x: cx + rx * perspective,
            y: clamp(cy + ry * perspective, rect.y + rect.height * 0.28, rect.y + rect.height * 0.9)
        };
    }

    function randomTargetForParticle(particle, time) {
        const rect = getModuleRect(particle.module);
        const motionTime = reducedMotion.matches ? 0 : time;
        const x = particle.baseX
            + Math.sin(motionTime * particle.speed + particle.phase) * particle.wanderX
            + Math.sin(motionTime * particle.secondarySpeed + particle.drift) * particle.wanderX * 0.35;
        const y = particle.baseY
            + Math.cos(motionTime * particle.speed + particle.phase) * particle.wanderY
            + Math.cos(motionTime * particle.secondarySpeed + particle.drift) * particle.wanderY * 0.35;
        const inset = particle.edgeInset;

        return {
            x: clamp(x, rect.x + inset, rect.x + rect.width - inset),
            y: clamp(y, rect.y + inset, rect.y + rect.height - inset)
        };
    }

    function buildEcosystemLines(moduleParticles, rect) {
        const maxDistance = Math.min(rect.width, rect.height) * (isEcoMobile() ? 0.22 : 0.2);
        const maxDistanceSq = maxDistance * maxDistance;

        for (let i = 0; i < moduleParticles.length; i += 2) {
            const particle = moduleParticles[i];
            let nearest = null;
            let nearestDistanceSq = Infinity;
            let secondNearest = null;
            let secondDistanceSq = Infinity;

            for (let j = i + 1; j < moduleParticles.length; j++) {
                const candidate = moduleParticles[j];
                const dx = particle.baseX - candidate.baseX;
                const dy = particle.baseY - candidate.baseY;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq > maxDistanceSq) continue;

                if (distanceSq < nearestDistanceSq) {
                    secondNearest = nearest;
                    secondDistanceSq = nearestDistanceSq;
                    nearest = candidate;
                    nearestDistanceSq = distanceSq;
                } else if (distanceSq < secondDistanceSq) {
                    secondNearest = candidate;
                    secondDistanceSq = distanceSq;
                }
            }

            if (nearest && Math.random() > 0.12) {
                ecosystemLines.push([particle, nearest]);
            }

            if (secondNearest && Math.random() > 0.76) {
                ecosystemLines.push([particle, secondNearest]);
            }
        }
    }

    function resetParticles() {
        updateModuleRects();

        const moduleParticleCount = isEcoMobile() ? 130 : 260;
        const backgroundCount = 0;
        ecosystemParticles = [];
        backgroundParticles = [];
        ecosystemLines = [];
        waveTargets = {};

        moduleOrder.forEach(moduleName => {
            waveTargets[moduleName] = buildTargetsForModule(moduleName);
            const rect = getModuleRect(moduleName);
            const moduleParticles = [];

            for (let i = 0; i < moduleParticleCount; i++) {
                const start = randomPointInRect(rect, isEcoMobile() ? 14 : 18);
                const centerDx = (start.x - rect.cx) / Math.max(1, rect.width * 0.5);
                const centerDy = (start.y - rect.cy) / Math.max(1, rect.height * 0.5);
                const centerDistance = Math.min(1, Math.sqrt(centerDx * centerDx + centerDy * centerDy));
                const edgeDecay = Math.max(0.24, 1 - Math.pow(centerDistance, 1.45) * 0.62);
                const edgeParticle = centerDistance > 0.82;
                const particle = {
                    module: moduleName,
                    index: i,
                    formsTarget: !edgeParticle && Math.random() > 0.28,
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
                    renderAlpha: 0
                };

                ecosystemParticles.push(particle);
                moduleParticles.push(particle);
            }

            buildEcosystemLines(moduleParticles, rect);
        });

        for (let i = 0; i < backgroundCount; i++) {
            backgroundParticles.push({
                x: Math.random() * ecoWidth,
                y: Math.random() * ecoHeight,
                size: 0.7 + Math.random() * 1.6,
                opacity: 0.18 + Math.random() * 0.42,
                drift: Math.random() * Math.PI * 2,
                speed: 0.00008 + Math.random() * 0.00008
            });
        }
    }

    function resizeEcosystemCanvas() {
        const rect = ecosystemSection.getBoundingClientRect();
        ecoWidth = Math.max(1, rect.width);
        ecoHeight = Math.max(1, rect.height);
        ecoDpr = Math.min(window.devicePixelRatio || 1, 2);
        ecosystemCanvas.width = Math.floor(ecoWidth * ecoDpr);
        ecosystemCanvas.height = Math.floor(ecoHeight * ecoDpr);
        ecosystemCanvas.style.width = `${ecoWidth}px`;
        ecosystemCanvas.style.height = `${ecoHeight}px`;
        ecoCtx.setTransform(ecoDpr, 0, 0, ecoDpr, 0, 0);
        resetParticles();
    }

    function setActiveModule(moduleName) {
        activeModule = moduleName;
        moduleButtons.forEach(button => {
            const isActive = button.dataset.ecosystemModule === moduleName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function scrollEcosystemToTop() {
        const targetTop = ecosystemSection.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo(0, targetTop);
        const scroller = document.scrollingElement || document.documentElement;
        if (scroller) {
            scroller.scrollTop = targetTop;
        }
    }

    function settleEcosystemHash() {
        if (window.location.hash === '#ecosystem') {
            [120, 500, 1100, 1800].forEach(delay => {
                window.setTimeout(scrollEcosystemToTop, delay);
            });
        }
    }

    function keepEcosystemInView() {
        window.requestAnimationFrame(scrollEcosystemToTop);
        window.setTimeout(scrollEcosystemToTop, 120);
        window.setTimeout(scrollEcosystemToTop, 320);
    }

    function drawEcosystem(time) {
        ecoCtx.clearRect(0, 0, ecoWidth, ecoHeight);

        backgroundParticles.forEach(point => {
            const motionTime = reducedMotion.matches ? 0 : time;
            const x = point.x + Math.sin(motionTime * point.speed + point.drift) * 8;
            const y = point.y + Math.cos(motionTime * point.speed + point.drift) * 6;
            ecoCtx.fillStyle = `rgba(0, 0, 0, ${point.opacity})`;
            ecoCtx.beginPath();
            ecoCtx.arc(x, y, point.size, 0, Math.PI * 2);
            ecoCtx.fill();
        });

        ecoCtx.lineWidth = isEcoMobile() ? 0.65 : 0.8;
        ecosystemLines.forEach(pair => {
            const p1 = pair[0];
            const p2 = pair[1];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;
            const maxDistSq = isEcoMobile() ? 4200 : 6200;

            if (distSq > maxDistSq) return;

            const activeLine = activeModule === p1.module;
            const avgColorVal = (p1.colorVal + p2.colorVal) / 2;
            const baseAlpha = Math.min(p1.renderAlpha || p1.opacity, p2.renderAlpha || p2.opacity);
            const distanceFade = Math.max(0, 1 - distSq / maxDistSq);
            const alpha = Math.min(0.2, avgColorVal * baseAlpha * distanceFade * (activeLine ? 0.36 : 0.52));

            if (alpha <= 0.01) return;

            ecoCtx.beginPath();
            ecoCtx.moveTo(p1.x, p1.y);

            const ctrlX = (p1.x + p2.x) / 2;
            const ctrlY = (p1.y + p2.y) / 2 + Math.min(18, Math.sqrt(distSq) * 0.16);
            ecoCtx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
            ecoCtx.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.9, alpha);
            ecoCtx.stroke();
        });

        ecosystemParticles.forEach(particle => {
            let target = randomTargetForParticle(particle, time);
            const isActive = activeModule === particle.module;

            if (isActive && particle.formsTarget && waveTargets[particle.module].length > 0) {
                const waveTarget = waveTargets[particle.module][particle.index % waveTargets[particle.module].length];
                target = rotatedWaveTarget(particle.module, waveTarget, time);
            }

            const easing = isActive && particle.formsTarget ? 0.038 : 0.018;
            particle.x += (target.x - particle.x) * easing;
            particle.y += (target.y - particle.y) * easing;

            const alpha = isActive && particle.formsTarget ? 0.76 : particle.opacity * (isActive ? 0.82 : 1);
            const size = isActive && particle.formsTarget ? particle.size * 0.9 : particle.size;
            particle.renderAlpha = alpha;
            ecoCtx.fillStyle = getMagmaColorRGBA(particle.colorVal, alpha);
            ecoCtx.beginPath();
            ecoCtx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ecoCtx.fill();
        });
    }

    function animateEcosystem(time) {
        if (isEcosystemVisible || reducedMotion.matches) {
            drawEcosystem(time || 0);
        }

        frameId = requestAnimationFrame(animateEcosystem);
    }

    moduleButtons.forEach(button => {
        const moduleName = button.dataset.ecosystemModule;
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('mouseenter', () => setActiveModule(moduleName));
        button.addEventListener('mouseleave', () => {
            if (!lockedModule && activeModule === moduleName) setActiveModule(null);
        });
        button.addEventListener('focus', () => setActiveModule(moduleName));
        button.addEventListener('blur', () => {
            if (!lockedModule && activeModule === moduleName) setActiveModule(null);
        });
        button.addEventListener('click', event => {
            event.preventDefault();
            lockedModule = moduleName;
            setActiveModule(moduleName);
            keepEcosystemInView();
        });
        button.addEventListener('touchstart', () => {
            lockedModule = moduleName;
            setActiveModule(moduleName);
        }, { passive: true });
    });

    const ecosystemObserver = new IntersectionObserver(entries => {
        isEcosystemVisible = entries.some(entry => entry.isIntersecting);
    }, { threshold: 0.08 });

    ecosystemObserver.observe(ecosystemSection);
    window.addEventListener('resize', resizeEcosystemCanvas);
    window.addEventListener('load', settleEcosystemHash, { once: true });
    window.addEventListener('hashchange', settleEcosystemHash);
    resizeEcosystemCanvas();
    setActiveModule(null);
    settleEcosystemHash();
    frameId = requestAnimationFrame(animateEcosystem);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(resizeEcosystemCanvas).catch(() => { });
    }

    window.addEventListener('beforeunload', () => {
        if (frameId) cancelAnimationFrame(frameId);
    });
})();
