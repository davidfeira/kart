/**
 * Menu Manager
 *
 * Handles all menu UI, kart/track selection, and screen transitions.
 * R4/PS1 era racing game aesthetic.
 */

import * as THREE from 'three';
import { KART_TYPES } from '../entities/kartTypes.js';
import { createKartGeometry } from '../entities/KartFactory.js';

// Track metadata for menu display
const TRACK_LIST = {
    ridge_circuit: {
        name: 'Ridge Circuit',
        description: 'Flowing high-speed circuit with sweeping curves and elevation changes',
        difficulty: 2
    }
};

export class MenuManager {
    constructor(game) {
        this.game = game;
        this.selectedKart = 'dart';
        this.selectedTrack = 'ridge_circuit';
        this.selectedMenuIndex = 0;
        this.menuButtons = [];

        // Get elements
        this.mainMenu = document.getElementById('main-menu');
        this.kartSelect = document.getElementById('kart-select');
        this.trackSelect = document.getElementById('track-select');
        this.loading = document.getElementById('loading');
        this.countdown = document.getElementById('countdown');
        this.pauseMenu = document.getElementById('pause-menu');
        this.finishScreen = document.getElementById('finish-screen');
        this.crtOverlay = document.querySelector('.crt-overlay');

        this.setupKartSelect();
        this.setupTrackSelect();
        this.setupButtons();
        this.setupKeyboardNav();
    }

    setupKartSelect() {
        const container = document.getElementById('kart-options');
        container.innerHTML = '';
        this.kartPreviews = [];

        Object.entries(KART_TYPES).forEach(([key, config]) => {
            const card = document.createElement('div');
            card.className = 'select-card' + (key === this.selectedKart ? ' selected' : '');
            card.dataset.kart = key;

            // R4 style stat bars with consistent orange-gold gradient
            card.innerHTML = `
                <div class="preview" id="kart-preview-${key}"></div>
                <div class="card-content">
                    <div class="name">${config.name}</div>
                    <div class="stats">
                        <div class="stat-bar">
                            <span class="stat-label">Speed</span>
                            <div class="stat-fill">
                                <div class="stat-fill-inner" style="width: ${config.stats.speed * 20}%"></div>
                            </div>
                        </div>
                        <div class="stat-bar">
                            <span class="stat-label">Accel</span>
                            <div class="stat-fill">
                                <div class="stat-fill-inner" style="width: ${config.stats.accel * 20}%"></div>
                            </div>
                        </div>
                        <div class="stat-bar">
                            <span class="stat-label">Handle</span>
                            <div class="stat-fill">
                                <div class="stat-fill-inner" style="width: ${config.stats.handling * 20}%"></div>
                            </div>
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

            // Create mini renderer with better quality
            const width = 200;
            const height = 120;

            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            // Create scene with R4-style lighting
            const scene = new THREE.Scene();

            // Camera - slightly lower angle for dramatic effect
            const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            camera.position.set(3.5, 1.8, 3.5);
            camera.lookAt(0, 0.2, 0);

            // R4 style warm lighting
            const ambient = new THREE.AmbientLight(0xfff8e7, 0.4);
            scene.add(ambient);

            // Main key light - warm orange
            const keyLight = new THREE.DirectionalLight(0xff6b35, 0.8);
            keyLight.position.set(5, 5, 3);
            scene.add(keyLight);

            // Fill light - cooler
            const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
            fillLight.position.set(-3, 2, -2);
            scene.add(fillLight);

            // Rim light - gold accent
            const rimLight = new THREE.DirectionalLight(0xffd700, 0.5);
            rimLight.position.set(0, 3, -5);
            scene.add(rimLight);

            // Add kart
            const kart = createKartGeometry(key);
            kart.scale.set(0.85, 0.85, 0.85);
            scene.add(kart);

            this.kartPreviews.push({ renderer, scene, camera, kart });
        });

        // Start preview animation
        this.animateKartPreviews();
    }

    animateKartPreviews() {
        if (!this.kartPreviews || this.kartPreviews.length === 0) return;

        this.kartPreviews.forEach(preview => {
            preview.kart.rotation.y += 0.008;
            preview.renderer.render(preview.scene, preview.camera);
        });

        requestAnimationFrame(() => this.animateKartPreviews());
    }

    setupTrackSelect() {
        const container = document.getElementById('track-options');
        container.innerHTML = '';

        Object.entries(TRACK_LIST).forEach(([key, config]) => {
            const card = document.createElement('div');
            card.className = 'select-card track-card' + (key === this.selectedTrack ? ' selected' : '');
            card.dataset.track = key;

            // Difficulty indicator with stars
            const stars = '★'.repeat(config.difficulty) + '☆'.repeat(3 - config.difficulty);

            card.innerHTML = `
                <div class="preview" id="track-preview-${key}">
                    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--r4-amber);font-family:'Bebas Neue',sans-serif;font-size:1.2rem;letter-spacing:0.1em;opacity:0.6;">
                        COURSE PREVIEW
                    </div>
                </div>
                <div class="card-content">
                    <div class="name">${config.name}</div>
                    <div class="description">${config.description}</div>
                    <div class="difficulty" style="color: var(--r4-gold); margin-top: 0.5rem; letter-spacing: 0.15em;">${stars}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                container.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedTrack = key;
            });

            container.appendChild(card);
        });
    }

    setupButtons() {
        document.querySelectorAll('.menu-btn, .confirm-btn, .back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });

            // Hover sound effect simulation (visual feedback)
            btn.addEventListener('mouseenter', () => {
                if (btn.classList.contains('menu-btn')) {
                    // Update selected state on hover for menu buttons
                    const parent = btn.closest('.menu-buttons');
                    if (parent) {
                        parent.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    }
                }
            });
        });
    }

    setupKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            // Handle Enter on main menu
            if (e.key === 'Enter' && !this.mainMenu.classList.contains('hidden')) {
                const selectedBtn = this.mainMenu.querySelector('.menu-btn.selected');
                if (selectedBtn) {
                    selectedBtn.click();
                }
            }

            // Arrow key navigation for menu buttons
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                const visibleMenu = document.querySelector('.menu-overlay:not(.hidden) .menu-buttons');
                if (visibleMenu) {
                    const buttons = Array.from(visibleMenu.querySelectorAll('.menu-btn'));
                    const currentIndex = buttons.findIndex(b => b.classList.contains('selected'));
                    let newIndex = currentIndex;

                    if (e.key === 'ArrowUp') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
                    } else {
                        newIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
                    }

                    buttons.forEach(b => b.classList.remove('selected'));
                    buttons[newIndex].classList.add('selected');
                    e.preventDefault();
                }
            }

            // Arrow key navigation for cards
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const visibleSelect = document.querySelector('.menu-overlay:not(.hidden) .select-container');
                if (visibleSelect) {
                    const cards = Array.from(visibleSelect.querySelectorAll('.select-card'));
                    const currentIndex = cards.findIndex(c => c.classList.contains('selected'));
                    let newIndex = currentIndex;

                    if (e.key === 'ArrowLeft') {
                        newIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
                    } else {
                        newIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
                    }

                    cards[currentIndex].classList.remove('selected');
                    cards[newIndex].classList.add('selected');
                    cards[newIndex].click();
                    e.preventDefault();
                }
            }
        });
    }

    handleAction(action) {
        switch(action) {
            case 'start':
                this.showScreen('kart-select');
                break;
            case 'time-attack':
                // Same as start for now
                this.showScreen('kart-select');
                break;
            case 'options':
                // Options not implemented yet
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

        // Show CRT overlay for menus
        if (this.crtOverlay) {
            this.crtOverlay.classList.remove('hidden');
        }
    }

    hideAll() {
        [this.mainMenu, this.kartSelect, this.trackSelect,
         this.loading, this.pauseMenu, this.finishScreen].forEach(screen => {
            screen.classList.add('hidden');
        });

        // Hide CRT overlay during gameplay
        if (this.crtOverlay) {
            this.crtOverlay.classList.add('hidden');
        }
    }

    showLoading(progress) {
        this.loading.classList.remove('hidden');
        document.getElementById('loading-bar').style.width = `${progress * 100}%`;

        // Show CRT overlay during loading
        if (this.crtOverlay) {
            this.crtOverlay.classList.remove('hidden');
        }
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

        // Hide CRT overlay when gameplay starts
        if (this.crtOverlay) {
            this.crtOverlay.classList.add('hidden');
        }
    }

    showPause() {
        this.pauseMenu.classList.remove('hidden');
        if (this.crtOverlay) {
            this.crtOverlay.classList.remove('hidden');
        }
    }

    hidePause() {
        this.pauseMenu.classList.add('hidden');
        if (this.crtOverlay) {
            this.crtOverlay.classList.add('hidden');
        }
    }

    showFinish(totalTime, lapTimes) {
        this.finishScreen.classList.remove('hidden');
        if (this.crtOverlay) {
            this.crtOverlay.classList.remove('hidden');
        }

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
