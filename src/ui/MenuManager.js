/**
 * Menu Manager
 *
 * Handles all menu UI, kart/track selection, and screen transitions.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';
import { KART_TYPES } from '../entities/kartTypes.js';
import { TRACK_PRESETS } from '../tracks/trackPresets.js';
import { createKartGeometry } from '../entities/KartFactory.js';

export class MenuManager {
    constructor(game) {
        this.game = game;
        this.selectedKart = 'dart';
        this.selectedTrack = 'oval';

        // Get elements
        this.mainMenu = document.getElementById('main-menu');
        this.kartSelect = document.getElementById('kart-select');
        this.trackSelect = document.getElementById('track-select');
        this.loading = document.getElementById('loading');
        this.countdown = document.getElementById('countdown');
        this.pauseMenu = document.getElementById('pause-menu');
        this.finishScreen = document.getElementById('finish-screen');

        this.setupKartSelect();
        this.setupTrackSelect();
        this.setupButtons();
    }

    setupKartSelect() {
        const container = document.getElementById('kart-options');
        container.innerHTML = '';
        this.kartPreviews = [];

        Object.entries(KART_TYPES).forEach(([key, config]) => {
            const card = document.createElement('div');
            card.className = 'select-card' + (key === this.selectedKart ? ' selected' : '');
            card.dataset.kart = key;

            card.innerHTML = `
                <div class="preview" id="kart-preview-${key}"></div>
                <div class="name">${config.name}</div>
                <div class="stats">
                    <div class="stat-bar">
                        <span class="stat-label">Speed</span>
                        <div class="stat-fill">
                            <div class="stat-fill-inner" style="width: ${config.stats.speed * 20}%; background: linear-gradient(90deg, #ff4444, #ff8844)"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Accel</span>
                        <div class="stat-fill">
                            <div class="stat-fill-inner" style="width: ${config.stats.accel * 20}%; background: linear-gradient(90deg, #44ff44, #88ff44)"></div>
                        </div>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Handle</span>
                        <div class="stat-fill">
                            <div class="stat-fill-inner" style="width: ${config.stats.handling * 20}%; background: linear-gradient(90deg, #4444ff, #44ffff)"></div>
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedKart = key;
            });

            container.appendChild(card);
        });

        // Create 3D previews after DOM is ready
        setTimeout(() => this.createKartPreviews(), 50);
    }

    createKartPreviews() {
        Object.keys(KART_TYPES).forEach(key => {
            const container = document.getElementById(`kart-preview-${key}`);
            if (!container) return;

            // Create mini renderer
            const width = 150;
            const height = 100;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(renderer.domElement);

            // Create scene
            const scene = new THREE.Scene();

            // Camera
            const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
            camera.position.set(3, 2, 3);
            camera.lookAt(0, 0.3, 0);

            // Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambient);

            const directional = new THREE.DirectionalLight(0xffffff, 0.8);
            directional.position.set(5, 5, 5);
            scene.add(directional);

            // Add kart
            const kart = createKartGeometry(key);
            kart.scale.set(0.8, 0.8, 0.8);
            scene.add(kart);

            this.kartPreviews.push({ renderer, scene, camera, kart });
        });

        // Start preview animation
        this.animateKartPreviews();
    }

    animateKartPreviews() {
        if (!this.kartPreviews || this.kartPreviews.length === 0) return;

        this.kartPreviews.forEach(preview => {
            preview.kart.rotation.y += 0.01;
            preview.renderer.render(preview.scene, preview.camera);
        });

        requestAnimationFrame(() => this.animateKartPreviews());
    }

    setupTrackSelect() {
        const container = document.getElementById('track-options');
        container.innerHTML = '';

        Object.entries(TRACK_PRESETS).forEach(([key, config]) => {
            const card = document.createElement('div');
            card.className = 'select-card track-card' + (key === this.selectedTrack ? ' selected' : '');
            card.dataset.track = key;

            // Difficulty stars
            const stars = '★'.repeat(config.difficulty) + '☆'.repeat(3 - config.difficulty);

            card.innerHTML = `
                <div class="preview" id="track-preview-${key}">
                    <canvas id="track-minimap-${key}" width="240" height="160"></canvas>
                </div>
                <div class="name">${config.name}</div>
                <div class="description">${config.description}</div>
                <div class="stats" style="color: #ffd700">${stars}</div>
            `;

            card.addEventListener('click', () => {
                container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedTrack = key;
            });

            container.appendChild(card);
        });

        // Draw minimaps
        setTimeout(() => this.drawMinimaps(), 100);
    }

    drawMinimaps() {
        Object.entries(TRACK_PRESETS).forEach(([key, preset]) => {
            const canvas = document.getElementById(`track-minimap-${key}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const points = preset.generatePath();

            // Find bounds
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            points.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minZ = Math.min(minZ, p.z);
                maxZ = Math.max(maxZ, p.z);
            });

            const padding = 20;
            const scaleX = (canvas.width - padding * 2) / (maxX - minX);
            const scaleZ = (canvas.height - padding * 2) / (maxZ - minZ);
            const scale = Math.min(scaleX, scaleZ);

            const offsetX = (canvas.width - (maxX - minX) * scale) / 2;
            const offsetZ = (canvas.height - (maxZ - minZ) * scale) / 2;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            points.forEach((p, i) => {
                const x = (p.x - minX) * scale + offsetX;
                const z = (p.z - minZ) * scale + offsetZ;
                if (i === 0) ctx.moveTo(x, z);
                else ctx.lineTo(x, z);
            });
            ctx.closePath();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Start position marker
            const start = points[0];
            const sx = (start.x - minX) * scale + offsetX;
            const sz = (start.z - minZ) * scale + offsetZ;
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(sx, sz, 6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    setupButtons() {
        document.querySelectorAll('.menu-btn, .confirm-btn, .back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });
    }

    handleAction(action) {
        switch(action) {
            case 'start':
                this.showScreen('kart-select');
                break;
            case 'controls':
                // Could show controls overlay
                break;
            case 'confirm':
                if (!this.kartSelect.classList.contains('hidden')) {
                    this.showScreen('track-select');
                } else if (!this.trackSelect.classList.contains('hidden')) {
                    this.game.startRace(this.selectedKart, this.selectedTrack);
                }
                break;
            case 'back':
                if (!this.kartSelect.classList.contains('hidden')) {
                    this.showScreen('main-menu');
                } else if (!this.trackSelect.classList.contains('hidden')) {
                    this.showScreen('kart-select');
                }
                break;
            case 'resume':
                this.game.resumeRace();
                break;
            case 'restart':
                this.game.restartRace();
                break;
            case 'quit':
                this.game.quitToMenu();
                break;
        }
    }

    showScreen(screenId) {
        // Hide all screens
        [this.mainMenu, this.kartSelect, this.trackSelect,
         this.loading, this.pauseMenu, this.finishScreen].forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show requested screen
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
        }
    }

    hideAll() {
        [this.mainMenu, this.kartSelect, this.trackSelect,
         this.loading, this.pauseMenu, this.finishScreen].forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    showLoading(progress) {
        this.showScreen('loading');
        document.getElementById('loading-bar').style.width = `${progress * 100}%`;
    }

    async showCountdown() {
        this.countdown.classList.remove('hidden');
        const numberEl = document.getElementById('countdown-number');

        for (let i = 3; i >= 1; i--) {
            numberEl.textContent = i;
            numberEl.className = 'countdown-number';
            await new Promise(r => setTimeout(r, 1000));
        }

        numberEl.textContent = 'GO!';
        numberEl.className = 'countdown-number go';
        await new Promise(r => setTimeout(r, 500));

        this.countdown.classList.add('hidden');
    }

    showPause() {
        this.pauseMenu.classList.remove('hidden');
    }

    hidePause() {
        this.pauseMenu.classList.add('hidden');
    }

    showFinish(totalTime, lapTimes) {
        this.finishScreen.classList.remove('hidden');

        document.getElementById('finish-total-time').textContent = this.formatTime(totalTime);

        const lapTimesEl = document.getElementById('lap-times');
        lapTimesEl.innerHTML = '';

        const bestLap = Math.min(...lapTimes);
        lapTimes.forEach((time, i) => {
            const row = document.createElement('div');
            row.className = 'lap-time-row' + (time === bestLap ? ' best' : '');
            row.textContent = `Lap ${i + 1}: ${this.formatTime(time)}`;
            lapTimesEl.appendChild(row);
        });
    }

    formatTime(ms) {
        const totalSeconds = ms / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const millis = Math.floor((totalSeconds % 1) * 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    }
}

export default MenuManager;
