/**
 * Minimap
 *
 * Renders a 2D top-down view of the track with player position indicator.
 * Uses Canvas 2D for performance and R4 aesthetic styling.
 */

export class Minimap {
    constructor(containerSelector = '.minimap') {
        this.container = document.querySelector(containerSelector);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // Canvas sizing (2x for retina)
        this.size = 150;
        this.resolution = 300;
        this.canvas.width = this.resolution;
        this.canvas.height = this.resolution;
        this.container.appendChild(this.canvas);

        // Track data
        this.trackPath = null;
        this.trackBounds = null;
        this.trackCache = null;

        // R4 aesthetic colors
        this.colors = {
            background: 'rgba(10, 14, 20, 0.85)',
            track: '#ff6b35',
            trackGlow: 'rgba(255, 107, 53, 0.5)',
            player: '#ffd700',
            playerGlow: 'rgba(255, 215, 0, 0.7)'
        };
    }

    setTrack(track) {
        if (!this.container) return;

        // Sample track spline to get 2D points
        const samples = 100;
        this.trackPath = [];

        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const frame = track.getFrameAt(t);
            this.trackPath.push({
                x: frame.position.x,
                z: frame.position.z
            });
        }

        // Calculate bounds with margin
        this.trackBounds = this.calculateBounds(this.trackPath, 30);

        // Cache the track rendering
        this.cacheTrack();
    }

    calculateBounds(points, margin) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minZ = Math.min(minZ, p.z);
            maxZ = Math.max(maxZ, p.z);
        }

        // Ensure square aspect ratio
        const width = maxX - minX;
        const height = maxZ - minZ;
        const size = Math.max(width, height);
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        return {
            minX: centerX - size / 2 - margin,
            maxX: centerX + size / 2 + margin,
            minZ: centerZ - size / 2 - margin,
            maxZ: centerZ + size / 2 + margin
        };
    }

    projectToCanvas(worldX, worldZ) {
        const b = this.trackBounds;
        const padding = 15;
        const drawSize = this.resolution - padding * 2;

        const normalizedX = (worldX - b.minX) / (b.maxX - b.minX);
        const normalizedZ = (worldZ - b.minZ) / (b.maxZ - b.minZ);

        return {
            x: padding + normalizedX * drawSize,
            y: padding + (1 - normalizedZ) * drawSize  // Flip Z for screen coords
        };
    }

    cacheTrack() {
        // Create offscreen canvas for track
        this.trackCache = document.createElement('canvas');
        this.trackCache.width = this.resolution;
        this.trackCache.height = this.resolution;
        const ctx = this.trackCache.getContext('2d');

        // Background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.resolution, this.resolution);

        if (!this.trackPath || this.trackPath.length < 2) return;

        // Draw track with glow
        ctx.strokeStyle = this.colors.track;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = this.colors.trackGlow;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        const first = this.projectToCanvas(this.trackPath[0].x, this.trackPath[0].z);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.trackPath.length; i++) {
            const p = this.projectToCanvas(this.trackPath[i].x, this.trackPath[i].z);
            ctx.lineTo(p.x, p.y);
        }

        ctx.closePath();
        ctx.stroke();

        // Second pass without glow for crisp center
        ctx.shadowBlur = 0;
        ctx.strokeStyle = this.colors.track;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    update(kartPosition, kartRotation) {
        if (!this.container || !this.trackCache) return;

        const ctx = this.ctx;

        // Draw cached track
        ctx.drawImage(this.trackCache, 0, 0);

        // Draw player marker
        const pos = this.projectToCanvas(kartPosition.x, kartPosition.z);
        this.drawPlayer(ctx, pos.x, pos.y, kartRotation);
    }

    drawPlayer(ctx, x, y, rotation) {
        const size = 10;

        ctx.save();
        ctx.translate(x, y);
        // Rotate: negate rotation and offset by 90 degrees for correct heading
        ctx.rotate(-rotation + Math.PI / 2);

        // Glow effect
        ctx.shadowColor = this.colors.playerGlow;
        ctx.shadowBlur = 8;

        // Arrow shape pointing up (forward)
        ctx.beginPath();
        ctx.moveTo(0, -size);              // Tip
        ctx.lineTo(-size * 0.6, size * 0.5);  // Left
        ctx.lineTo(0, size * 0.2);          // Notch
        ctx.lineTo(size * 0.6, size * 0.5);   // Right
        ctx.closePath();

        ctx.fillStyle = this.colors.player;
        ctx.fill();

        ctx.restore();
    }

    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    dispose() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.trackPath = null;
        this.trackBounds = null;
        this.trackCache = null;
    }
}

export default Minimap;