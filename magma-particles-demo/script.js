const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let lines = [];
// Create a grid for the 3D surface
const gridResolutionX = 50;
const gridResolutionZ = 50;
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
    mouse.targetY = (e.clientY - height / 2) / (height / 2);

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
        // Base 3D coordinates based on grid
        // Spread the grid out
        const spreadX = 25;
        const spreadZ = 25;
        this.baseX = (gridX - gridResolutionX / 2) * spreadX;
        this.baseZ = (gridZ - gridResolutionZ / 2) * spreadZ;

        // Calculate Y based on 3D sin function
        // f(x,z) = sin(x) * cos(z) or similar
        const freqX = 0.05;
        const freqZ = 0.05;
        const amplitude = 150;
        this.baseY = Math.sin(this.baseX * freqX) * Math.cos(this.baseZ * freqZ) * amplitude;

        // Current 3D position (starts at base)
        this.x3d = this.baseX;
        this.y3d = this.baseY;
        this.z3d = this.baseZ;

        // Visual properties
        this.size = 1.5;

        // Color based on height (Y)
        // Normalize Y from roughly [-amplitude, amplitude] to [0, 1]
        const normalizedHeight = (this.baseY + amplitude) / (amplitude * 2);
        // Map so highest peaks are yellow (1), valleys are dark purple (0)
        // We cap at 0.8 so it doesn't wash out on white
        this.colorVal = normalizedHeight;
        this.color = getMagmaColorRGBA(this.colorVal * 0.85);

        // 2D projection coordinates
        this.x2d = 0;
        this.y2d = 0;
        this.scale = 0;

        // Grid indices for line drawing
        this.i = gridX;
        this.j = gridZ;
    }

    update(time) {
        // Subtle animation of the surface over time
        const freqX = 0.03;
        const freqZ = 0.04;
        const amplitude = 120;
        const timeOffset = time * 0.001;

        // Animated Y
        this.y3d = Math.sin(this.baseX * freqX + timeOffset) * Math.cos(this.baseZ * freqZ + timeOffset) * amplitude;

        // Subtle mouse parallax effect
        // Rotate the entire scene slightly based on mouse position
        const maxRotationX = 0.2; // radians
        const maxRotationY = 0.2;

        // Smoothly interp mouse current to target
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

        let rotX = mouse.currentY * maxRotationX;
        let rotY = mouse.currentX * maxRotationY;

        // Apply rotation around X axis (tilt up/down)
        let y1 = this.y3d * Math.cos(rotX) - this.baseZ * Math.sin(rotX);
        let z1 = this.y3d * Math.sin(rotX) + this.baseZ * Math.cos(rotX);

        // Apply rotation around Y axis (pan left/right)
        let x2 = this.baseX * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -this.baseX * Math.sin(rotY) + z1 * Math.cos(rotY);
        let y2 = y1;

        // Tilt the whole plane forward slightly so we look down on it
        const baseTilt = 0.5; // radians
        let y3 = y2 * Math.cos(baseTilt) - z2 * Math.sin(baseTilt);
        let z3 = y2 * Math.sin(baseTilt) + z2 * Math.cos(baseTilt);

        // 3D to 2D Projection
        // Move scene back in Z so it's in front of camera
        const sceneZOffset = 500;
        const finalZ = z3 + sceneZOffset;

        // Project
        this.scale = camera.fov / (camera.fov + finalZ);
        this.x2d = x2 * this.scale + width / 2;
        this.y2d = y3 * this.scale + height / 2 + 100; // Shift down slightly

        // Update color alpha based on depth (fade out in distance)
        const depthAlpha = Math.max(0.1, Math.min(1, this.scale * 1.5));
        this.color = getMagmaColorRGBA(this.colorVal * 0.85, depthAlpha);
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
            // Connect to right neighbor
            if (i < gridResolutionX - 1) {
                // Sparsely connect for a cleaner look
                if (Math.random() > 0.3) {
                    lines.push([grid[i][j], grid[i + 1][j]]);
                }
            }
            // Connect to bottom neighbor
            if (j < gridResolutionZ - 1) {
                if (Math.random() > 0.3) {
                    lines.push([grid[i][j], grid[i][j + 1]]);
                }
            }
        }
    }
}

function animate(time) {
    ctx.clearRect(0, 0, width, height);

    // Update all particles
    particles.forEach(p => p.update(time));

    // Draw lines first so they are underneath points
    ctx.lineWidth = 0.5;
    lines.forEach(pair => {
        const p1 = pair[0];
        const p2 = pair[1];

        // Only draw if both points are somewhat visible and in front of camera
        if (p1.scale > 0 && p2.scale > 0) {
            // Distance check to prevent drawing crazy long lines across the screen if projection goes weird
            const dx = p1.x2d - p2.x2d;
            const dy = p1.y2d - p2.y2d;
            const distSq = dx * dx + dy * dy;

            if (distSq < 15000) {
                ctx.beginPath();
                ctx.moveTo(p1.x2d, p1.y2d);
                ctx.lineTo(p2.x2d, p2.y2d);

                // Use a blended highly transparent magma color for the line
                // Base it on the average height of the two points
                const avgColorVal = (p1.colorVal + p2.colorVal) / 2;
                // High transparency for elegance
                ctx.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.8, 0.15 * p1.scale);
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
