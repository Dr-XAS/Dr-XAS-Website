const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let lines = [];
// Global variables for EXAFS data
let waveletData = null;
let gridResolutionX = 50;
let gridResolutionZ = 50;

// Create a grid for the 3D surface
// numParticles will be dynamically calculated now

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
    if (waveletData) {
        initParticles(waveletData);
    }
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
    constructor(gridX, gridZ, yVal) {
        // Spread the grid out. Adjust these based on the new dense dataset size to fit screen.
        // We have ~100x117 points, so smaller spread is needed than the 50x50 grid
        const spreadX = 12;
        const spreadZ = 12;
        this.baseX = (gridX - gridResolutionX / 2) * spreadX;
        this.baseZ = (gridZ - gridResolutionZ / 2) * spreadZ;

        // Use the loaded EXAFS wavelet value for height.
        // In Canvas, smaller Y is "up". So negate yVal to make peaks point upwards.
        const amplitude = 400;
        this.baseY = -yVal * amplitude + 150;

        // Current 3D position (starts at base)
        this.x3d = this.baseX;
        this.y3d = this.baseY;
        this.z3d = this.baseZ;

        // Visual properties
        this.size = 1.8; // Increased for dense grid

        // Color based on height (Y). yVal is already 0-1 normalized
        this.colorVal = yVal;
        this.color = getMagmaColorRGBA(this.colorVal * 0.95);

        // 2D projection coordinates
        this.x2d = 0;
        this.y2d = 0;
        this.scale = 0;

        // Grid indices for line drawing
        this.i = gridX;
        this.j = gridZ;

        // Save the amplitude for animation
        this.amplitude = amplitude;
    }

    update(time) {
        // Subtle animation of the surface over time
        // Just a gentle breathing effect so the static image feels alive
        const timeOffset = time * 0.0005;
        const breath = Math.sin(timeOffset + this.baseX * 0.01 + this.baseZ * 0.01) * 15;

        // Animated Y
        this.y3d = this.baseY + breath;

        // Subtle mouse parallax effect
        // Rotate the entire scene slightly based on mouse position
        const maxRotationX = 0.2; // radians
        const maxRotationY = 0.2;

        // Smoothly interp mouse current to target
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

        // Look down slightly more to see the structure
        let rotX = mouse.currentY * maxRotationX;
        let rotX_base = 0.8;
        rotX += rotX_base;

        let rotY = mouse.currentX * maxRotationY;

        // Apply rotation around X axis (tilt up/down)
        let y1 = this.y3d * Math.cos(rotX) - this.baseZ * Math.sin(rotX);
        let z1 = this.y3d * Math.sin(rotX) + this.baseZ * Math.cos(rotX);

        // Apply rotation around Y axis (pan left/right)
        // Adjust the center point so we spin mostly around the main peak area
        let x2 = this.baseX * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -this.baseX * Math.sin(rotY) + z1 * Math.cos(rotY);
        let y2 = y1;

        // 3D to 2D Projection
        // Move scene back in Z so it's in front of camera
        const sceneZOffset = 500;
        const finalZ = z2 + sceneZOffset;

        // Project
        this.scale = camera.fov / (camera.fov + finalZ);
        // Translate right slightly to center the plot nicely in the viewport
        this.x2d = x2 * this.scale + width / 2 + 100;
        // Shifted up to middle of screen
        this.y2d = y2 * this.scale + height / 2 - 50;

        // Update color alpha based on depth (fade out in distance)
        const depthAlpha = Math.max(0.1, Math.min(1, this.scale * 1.5));
        this.color = getMagmaColorRGBA(this.colorVal * 0.95, depthAlpha);
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

function initParticles(data) {
    particles = [];
    gridResolutionX = data.rows; // 109
    gridResolutionZ = data.cols; // 117

    // Create a 2D array to easily form grid lines
    let grid = [];

    let index = 0;
    for (let i = 0; i < gridResolutionX; i++) {
        let row = [];
        for (let j = 0; j < gridResolutionZ; j++) {
            let yVal = data.data[index];
            let p = new Particle(i, j, yVal);
            particles.push(p);
            row.push(p);
            index++;
        }
        grid.push(row);
    }

    // Generate line connections (horizontal and vertical)
    lines = [];
    for (let i = 0; i < gridResolutionX; i++) {
        for (let j = 0; j < gridResolutionZ; j++) {
            // Because the grid is so dense, only draw lines every Nth point to avoid clutter
            const sparseFactor = 2; // draw lines between every 2nd point 

            // Connect to right neighbor
            if (i < gridResolutionX - sparseFactor && j % sparseFactor === 0) {
                // Sparsely connect for a cleaner look
                lines.push([grid[i][j], grid[i + sparseFactor][j]]);
            }
            // Connect to bottom neighbor
            if (j < gridResolutionZ - sparseFactor && i % sparseFactor === 0) {
                lines.push([grid[i][j], grid[i][j + sparseFactor]]);
            }
        }
    }
}

function animate(time) {
    if (!waveletData) {
        requestAnimationFrame(animate);
        return;
    }

    ctx.clearRect(0, 0, width, height);

    // Update all particles
    particles.forEach(p => p.update(time));

    // Draw lines first so they are underneath points
    ctx.lineWidth = 0.4;
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

                // Draw lines brighter if they correspond to peaks (high value)
                const alpha = Math.max(0.1, avgColorVal * 0.4 * p1.scale);
                ctx.strokeStyle = getMagmaColorRGBA(avgColorVal * 0.9, alpha);
                ctx.stroke();
            }
        }
    });

    // Draw points on top
    particles.forEach(p => p.draw());

    requestAnimationFrame(animate);
}

// Fetch the newly generated EXAFS wavelet json
fetch('wavelet_data.json')
    .then(response => response.json())
    .then(data => {
        waveletData = data;
        resizeCanvas();
    })
    .catch(err => console.error("Could not load wavelet_data.json:", err));

requestAnimationFrame(animate);

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
