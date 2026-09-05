// Exact standalone mirror of the homepage Agentic Ecosystem engine.
(function initEcosystemParticles() {
    // Exact local copy of the homepage Magma helper, scoped to this standalone page.
    const magmaColors = [
        '#000004', '#140e36', '#3b0f70', '#641a80',
        '#8c2981', '#b73779', '#de4968', '#f7705c',
        '#fe9f6d', '#fecf92', '#fcfdbf'
    ];

    function getMagmaColorRGBA(value, alpha = 1) {
        if (value < 0) value = 0;
        if (value > 1) value = 1;
        const index = Math.floor(value * (magmaColors.length - 1));
        const hex = magmaColors[index];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const ecosystemSection = document.querySelector('.ecosystem-section');
    const ecosystemCanvas = document.getElementById('ecosystemCanvas');
    const moduleButtons = Array.from(document.querySelectorAll('[data-ecosystem-module]'));

    if (!ecosystemSection || !ecosystemCanvas || moduleButtons.length === 0) return;

    const ecoCtx = ecosystemCanvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const moduleOrder = ['XASpert', 'XASbench', 'XASagents', 'XASurrogate'];
    const animateAllModules = true;
    const moduleConfig = {
        XASpert: {
            color: '#3b0f70',
            magmaRange: [0.7, 0.9]
        },
        XASbench: {
            color: '#f7705c',
            magmaRange: [0.5, 0.7]
        },
        XASagents: {
            color: '#b73779',
            magmaRange: [0.32, 0.52]
        },
        XASurrogate: {
            color: '#3b0f70',
            magmaRange: [0.12, 0.32]
        }
    };

    let ecoWidth = 0;
    let ecoHeight = 0;
    let ecoDpr = 1;
    let ecosystemParticles = [];
    let backgroundParticles = [];
    let waveTargets = {};
    let moduleRects = {};
    let activeModule = null;
    let lockedModule = null;
    let isEcosystemVisible = false;
    let frameId = null;
    let ecosystemAnimationStartTime = null;

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

    function buildTargetsForModule(moduleName) {
        const rect = getModuleRect(moduleName);
        const points = [];
        const samples = isEcoMobile() ? 180 : 300;
        const layers = moduleName === 'XASbench'
            ? (isEcoMobile() ? 12 : 18)
            : moduleName === 'XASagents'
                ? (isEcoMobile() ? 10 : 14)
                : (isEcoMobile() ? 5 : 8);
        const insetX = rect.width * 0.16;
        const moduleYOffset = moduleName === 'XASbench' || moduleName === 'XASagents'
            ? rect.height * 0.07
            : 0;
        const baseY = rect.y + rect.height * 0.64 + moduleYOffset;
        const amp = rect.height * 0.22;
        const usableWidth = rect.width - insetX * 2;

        function waveform(module, t, layer) {
            const centered = t - 0.5;
            const depth = (layer / Math.max(1, layers - 1) - 0.5) * 2;
            const layerPhase = layer * 0.42;

            if (module === 'XASpert') {
                const envelope = Math.exp(-Math.pow(centered * 2.2, 2));
                return Math.sin(t * Math.PI * 4.6 + layerPhase) * envelope;
            }

            if (module === 'XASbench') {
                const xTerm = Math.pow(centered / 0.16, 2);
                const zTerm = Math.pow(depth / 0.52, 2);
                return Math.exp(-0.5 * (xTerm + zTerm)) * 1.18;
            }

            if (module === 'XASagents') {
                const frontLeftGaussian = Math.exp(-0.5 * (
                    Math.pow((centered + 0.25) / 0.13, 2)
                    + Math.pow((depth + 0.54) / 0.27, 2)
                ));
                const frontRightGaussian = Math.exp(-0.5 * (
                    Math.pow((centered - 0.25) / 0.13, 2)
                    + Math.pow((depth + 0.54) / 0.27, 2)
                ));
                const backLeftGaussian = Math.exp(-0.5 * (
                    Math.pow((centered + 0.25) / 0.13, 2)
                    + Math.pow((depth - 0.54) / 0.27, 2)
                ));
                const backRightGaussian = Math.exp(-0.5 * (
                    Math.pow((centered - 0.25) / 0.13, 2)
                    + Math.pow((depth - 0.54) / 0.27, 2)
                ));
                const centerValley = Math.exp(-0.5 * (
                    Math.pow(centered / 0.16, 2)
                    + Math.pow(depth / 0.34, 2)
                )) * 1;

                return (
                    frontLeftGaussian
                    + frontRightGaussian
                    + backLeftGaussian
                    + backRightGaussian
                ) * 0.9 - centerValley;
            }

            const peakA = Math.exp(-Math.pow((t - 0.25) / 0.08, 2));
            const peakB = Math.exp(-Math.pow((t - 0.56) / 0.11, 2)) * 0.78;
            const peakC = Math.exp(-Math.pow((t - 0.78) / 0.07, 2)) * 0.58;
            return (peakA + peakB + peakC - 0.7) * 0.95 + Math.sin(t * Math.PI * 5 + layerPhase) * 0.08;
        }

        for (let layer = 0; layer < layers; layer++) {
            const layerOffset = moduleName === 'XASagents'
                ? 0
                : (layer - (layers - 1) / 2) * (isEcoMobile() ? 4 : 5);

            for (let i = 0; i < samples; i++) {
                const t = i / Math.max(1, samples - 1);
                const x = rect.x + insetX + t * usableWidth;
                const y = baseY - waveform(moduleName, t, layer) * amp + layerOffset;

                points.push({
                    x,
                    y: clamp(y, rect.y + rect.height * 0.3, rect.y + rect.height * 0.9),
                    z: (layer - (layers - 1) / 2) * rect.height * (moduleName === 'XASbench' ? 0.045 : 0.08)
                });
            }
        }

        points.samples = samples;
        points.layers = layers;
        return points;
    }

    function getWaveTransform(moduleName, time) {
        const rect = getModuleRect(moduleName);
        const cx = rect.cx;
        const moduleYOffset = moduleName === 'XASbench' || moduleName === 'XASagents'
            ? rect.height * 0.07
            : 0;
        const cy = rect.y + rect.height * 0.64 + moduleYOffset;
        const t = time * 0.00032;
        const indexOffset = moduleOrder.indexOf(moduleName) * 0.55;
        const angleY = moduleName === 'XASagents'
            ? Math.PI / 18 + (reducedMotion.matches ? 0 : Math.sin(t) * 0.18)
            : (reducedMotion.matches ? 0 : Math.sin(t + indexOffset) * 0.52);
        const angleX = reducedMotion.matches ? 0 : Math.cos(t * 0.82 + indexOffset) * 0.22;
        const perspectiveDepth = moduleName === 'XASagents'
            ? Math.max(720, rect.width * 6)
            : Math.max(240, rect.width * 1.8);

        return {
            rect,
            cx,
            cy,
            cosY: Math.cos(angleY),
            sinY: Math.sin(angleY),
            cosX: Math.cos(angleX),
            sinX: Math.sin(angleX),
            perspectiveDepth
        };
    }

    function rotatedWaveTarget(target, transform) {
        const { rect, cx, cy, cosY, sinY, cosX, sinX, perspectiveDepth } = transform;
        const dx = target.x - cx;
        const dy = target.y - cy;
        const dz = target.z || 0;
        const rx = dx * cosY + dz * sinY;
        const rz = dz * cosY - dx * sinY;
        const ry = dy * cosX - rz * sinX;
        const rz2 = rz * cosX + dy * sinX;
        const perspective = 1 / (1 + rz2 / perspectiveDepth);

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

    function resetParticles() {
        updateModuleRects();

        const moduleParticleCount = isEcoMobile() ? 320 : 680;
        const backgroundCount = 0;
        ecosystemParticles = [];
        backgroundParticles = [];
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
                const waveIndex = Math.floor(i * waveTargets[moduleName].length / moduleParticleCount);
                const particle = {
                    module: moduleName,
                    index: i,
                    waveIndex,
                    formsTarget: !edgeParticle && Math.random() > 0.06,
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
                    opacity: (0.2 + Math.random() * 0.4) * edgeDecay,
                    renderAlpha: 0
                };

                ecosystemParticles.push(particle);
                moduleParticles.push(particle);
            }

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

    function createLineFadeGradient(start, end, colorVal, alpha) {
        const gradient = ecoCtx.createLinearGradient(start.x, start.y, end.x, end.y);
        gradient.addColorStop(0, getMagmaColorRGBA(colorVal, 0));
        gradient.addColorStop(0.1, getMagmaColorRGBA(colorVal, 0));
        gradient.addColorStop(0.24, getMagmaColorRGBA(colorVal, alpha * 0.34));
        gradient.addColorStop(0.36, getMagmaColorRGBA(colorVal, alpha));
        gradient.addColorStop(0.64, getMagmaColorRGBA(colorVal, alpha));
        gradient.addColorStop(0.76, getMagmaColorRGBA(colorVal, alpha * 0.34));
        gradient.addColorStop(0.9, getMagmaColorRGBA(colorVal, 0));
        gradient.addColorStop(1, getMagmaColorRGBA(colorVal, 0));
        return gradient;
    }

    function drawWaveGrid(moduleName, rotatedTargets) {
        const targets = waveTargets[moduleName];
        const samples = targets.samples;
        const layers = targets.layers;
        const colorVal = moduleMagmaValue(moduleName, 0.58);
        const columnStep = isEcoMobile() ? 12 : 10;

        ecoCtx.lineWidth = isEcoMobile() ? 0.72 : 0.9;
        for (let layer = 0; layer < layers; layer++) {
            ecoCtx.beginPath();
            let firstPoint = null;
            let lastPoint = null;

            for (let sample = 0; sample < samples; sample++) {
                const point = rotatedTargets[layer * samples + sample];
                if (!point) continue;

                if (!firstPoint) {
                    firstPoint = point;
                    ecoCtx.moveTo(point.x, point.y);
                } else {
                    ecoCtx.lineTo(point.x, point.y);
                }
                lastPoint = point;
            }

            if (firstPoint && lastPoint) {
                const depthPosition = layer / Math.max(1, layers - 1);
                const depthFade = Math.pow(Math.sin(depthPosition * Math.PI), 1.25);
                ecoCtx.strokeStyle = createLineFadeGradient(firstPoint, lastPoint, colorVal, 0.3 * depthFade);
                ecoCtx.stroke();
            }
        }

        ecoCtx.lineWidth = isEcoMobile() ? 0.55 : 0.7;

        for (let sample = 0; sample < samples; sample += columnStep) {
            ecoCtx.beginPath();
            let firstPoint = null;
            let lastPoint = null;

            for (let layer = 0; layer < layers; layer++) {
                const point = rotatedTargets[layer * samples + sample];
                if (!point) continue;

                if (!firstPoint) {
                    firstPoint = point;
                    ecoCtx.moveTo(point.x, point.y);
                } else {
                    ecoCtx.lineTo(point.x, point.y);
                }
                lastPoint = point;
            }

            if (firstPoint && lastPoint) {
                const horizontalPosition = sample / Math.max(1, samples - 1);
                const horizontalFade = Math.pow(Math.sin(horizontalPosition * Math.PI), 1.15);
                ecoCtx.strokeStyle = createLineFadeGradient(
                    firstPoint,
                    lastPoint,
                    colorVal * 0.92,
                    0.2 * horizontalFade
                );
                ecoCtx.stroke();
            }
        }
    }

    function drawEcosystem(time) {
        ecoCtx.clearRect(0, 0, ecoWidth, ecoHeight);

        const rotatedTargets = {};
        moduleOrder.forEach(moduleName => {
            const transform = getWaveTransform(moduleName, time);
            rotatedTargets[moduleName] = waveTargets[moduleName].map(target => rotatedWaveTarget(target, transform));
        });

        backgroundParticles.forEach(point => {
            const motionTime = reducedMotion.matches ? 0 : time;
            const x = point.x + Math.sin(motionTime * point.speed + point.drift) * 8;
            const y = point.y + Math.cos(motionTime * point.speed + point.drift) * 6;
            ecoCtx.fillStyle = `rgba(0, 0, 0, ${point.opacity})`;
            ecoCtx.beginPath();
            ecoCtx.arc(x, y, point.size, 0, Math.PI * 2);
            ecoCtx.fill();
        });

        moduleOrder.forEach(moduleName => drawWaveGrid(moduleName, rotatedTargets[moduleName]));

        ecosystemParticles.forEach(particle => {
            let target = randomTargetForParticle(particle, time);
            const isActive = animateAllModules || activeModule === particle.module;

            if (isActive && waveTargets[particle.module].length > 0) {
                const waveTarget = rotatedTargets[particle.module][particle.waveIndex];

                if (particle.formsTarget) {
                    target = waveTarget;
                } else {
                    target = {
                        x: target.x + (waveTarget.x - target.x) * particle.gravityStrength,
                        y: target.y + (waveTarget.y - target.y) * particle.gravityStrength
                    };
                }
            }

            const easing = isActive && particle.formsTarget ? 0.038 : (isActive ? 0.011 : 0.018);
            particle.x += (target.x - particle.x) * easing;
            particle.y += (target.y - particle.y) * easing;

            const alpha = isActive && particle.formsTarget ? 0.9 : particle.opacity * (isActive ? 0.94 : 1);
            const size = isActive && particle.formsTarget ? particle.size * 0.9 : particle.size;
            particle.renderAlpha = alpha;
            ecoCtx.fillStyle = getMagmaColorRGBA(particle.colorVal, alpha);
            ecoCtx.beginPath();
            ecoCtx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ecoCtx.fill();
        });
    }

    function animateEcosystem(time) {
        if (ecosystemAnimationStartTime === null) ecosystemAnimationStartTime = time || 0;
        const elapsedTime = Math.max(0, (time || 0) - ecosystemAnimationStartTime);

        if (isEcosystemVisible || reducedMotion.matches) {
            drawEcosystem(elapsedTime);
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
