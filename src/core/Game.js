/**
 * Game Core
 *
 * Main game class that orchestrates all systems, handles game state,
 * and manages the render loop.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';
import { CONFIG } from '../utils/config.js';
import { Logger } from '../utils/logger.js';
import { InputManager } from '../systems/InputManager.js';
import { CheckpointManager } from '../systems/CheckpointManager.js';
import { CameraController } from './CameraController.js';
import { HUDController } from '../ui/HUDController.js';
import { MenuManager } from '../ui/MenuManager.js';
import { loadTrack } from '../tracks/TrackLoader.js';
import { Kart } from '../entities/Kart.js';

const gameLog = Logger.getLogger('Game');

export class Game {
    constructor() {
        this.state = 'MENU';
        this.previousState = null;

        gameLog.info('Game initializing');

        // Three.js setup
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();

        // Create dynamic sky shader
        this.skyMaterial = this.createSkyShader();
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
        this.skyMesh.renderOrder = -1; // Render behind everything
        this.scene.add(this.skyMesh);

        this.scene.fog = new THREE.Fog(0x8090a0, 200, 500); // Light blue-gray fog

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.camera.baseFov,
            window.innerWidth / window.innerHeight,
            0.1,
            600
        );

        // Lighting
        this.setupLighting();

        // Systems
        this.input = new InputManager();
        this.menuManager = new MenuManager(this);
        this.hud = new HUDController();
        this.cameraController = null;
        this.checkpointManager = null;

        // Game objects
        this.track = null;
        this.kart = null;

        // Timing
        this.clock = new THREE.Clock();
        this.raceTime = 0;
        this.isPaused = false;

        // Window resize
        window.addEventListener('resize', () => this.onResize());

        // Start render loop
        this.animate();
    }

    createSkyShader() {
        const vertexShader = `
            varying vec3 vPosition;
            void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec3 vPosition;

            void main() {
                vec3 direction = normalize(vPosition);
                float elevation = direction.y;

                // Simple clean gradient - deep blue at top, lighter blue at horizon
                vec3 zenith = vec3(0.15, 0.25, 0.45);
                vec3 midSky = vec3(0.4, 0.55, 0.75);
                vec3 horizon = vec3(0.7, 0.75, 0.8);

                vec3 skyColor;
                if (elevation > 0.0) {
                    // Above horizon: blend from horizon up to zenith
                    float t = smoothstep(0.0, 1.0, elevation);
                    skyColor = mix(horizon, midSky, smoothstep(0.0, 0.3, elevation));
                    skyColor = mix(skyColor, zenith, smoothstep(0.3, 0.8, elevation));
                } else {
                    // Below horizon: fade to slightly darker
                    vec3 below = vec3(0.5, 0.55, 0.6);
                    skyColor = mix(horizon, below, smoothstep(0.0, -0.5, elevation));
                }

                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;

        return new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: true
        });
    }

    setupLighting() {
        // Ambient light - warmer for sunset atmosphere
        const ambient = new THREE.AmbientLight(0xffd4aa, 0.6);
        this.scene.add(ambient);

        // Directional light (sun) - positioned lower for sunset effect
        const sun = new THREE.DirectionalLight(0xffaa77, 1.2);
        sun.position.set(50, 30, 50); // Lower angle for sunset
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        this.scene.add(sun);

        // Hemisphere light for sky/ground color - sunset tones
        const hemi = new THREE.HemisphereLight(0xff9966, 0x2d4a5a, 0.4);
        this.scene.add(hemi);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async startRace(kartType, trackType) {
        this.state = 'LOADING';
        gameLog.info('Starting race', { kartType, trackType });
        this.menuManager.showLoading(0);

        await new Promise(r => setTimeout(r, 100));
        this.menuManager.showLoading(0.3);

        // Clear previous track
        if (this.track) {
            this.track.dispose(this.scene);
            this.track = null;
        }

        // Load new track from JSON
        try {
            this.track = await loadTrack(trackType);
            this.track.addToScene(this.scene);
        } catch (error) {
            gameLog.error('Failed to load track', { trackType, error: error.message });
            this.quitToMenu();
            return;
        }

        this.menuManager.showLoading(0.6);
        await new Promise(r => setTimeout(r, 100));

        // Get start position from track
        const { position: startPosition, rotation: startRotation } = this.track.getStartPosition();

        // Create kart
        if (this.kart) this.kart.dispose();
        this.kart = new Kart(kartType, this.scene);
        this.kart.reset(startPosition, startRotation);

        // Initialize track frame at start position
        this.kart.trackFrame = this.track.getTrackFrame(startPosition, 0.02);
        this.kart.lastTrackT = this.kart.trackFrame.t;

        // Setup camera
        this.cameraController = new CameraController(this.camera);
        this.cameraController.reset(startPosition, startRotation);

        // Setup checkpoints
        const checkpoints = this.track.getCheckpointPositions();
        this.checkpointManager = new CheckpointManager(checkpoints);

        this.menuManager.showLoading(1.0);
        await new Promise(r => setTimeout(r, 200));

        // Countdown
        this.state = 'COUNTDOWN';
        this.menuManager.hideAll();
        this.hud.show();
        this.input.showTouchControls(true);
        this.hud.update(0, 1, this.track.laps, 0, false);

        await this.menuManager.showCountdown();

        // Start race
        this.state = 'RACING';
        this.raceTime = 0;
        this.checkpointManager.reset(0);
        this.clock.start();
        gameLog.info('Race started', { totalLaps: this.track.laps });
    }

    resumeRace() {
        this.state = 'RACING';
        this.isPaused = false;
        this.menuManager.hidePause();
        this.input.showTouchControls(true);
        this.clock.start();
        gameLog.info('Race resumed');
    }

    restartRace() {
        const kartType = this.kart.type;
        gameLog.info('Race restarting', { kartType });
        this.menuManager.hideAll();
        this.startRace(kartType, this.menuManager.selectedTrack);
    }

    quitToMenu() {
        gameLog.info('Quitting to menu');
        this.state = 'MENU';
        this.isPaused = false;

        if (this.kart) {
            this.kart.dispose();
            this.kart = null;
        }

        if (this.track) {
            this.track.dispose(this.scene);
            this.track = null;
        }

        this.hud.hide();
        this.input.showTouchControls(false);
        this.menuManager.showScreen('main-menu');
    }

    update() {
        const delta = this.clock.getDelta();

        // Handle pause toggle
        if (this.input.consumePause()) {
            if (this.state === 'RACING') {
                this.state = 'PAUSED';
                this.isPaused = true;
                this.menuManager.showPause();
                this.input.showTouchControls(false);
                this.clock.stop();
                gameLog.info('Race paused', { raceTime: this.raceTime });
            } else if (this.state === 'PAUSED') {
                this.resumeRace();
            }
        }

        // Handle enter key for menu
        if (this.input.consumeEnter()) {
            if (this.state === 'MENU') {
                this.menuManager.handleAction('start');
            }
        }

        if (this.state !== 'RACING') return;

        // Update race time
        this.raceTime += delta * 1000;

        // Update kart physics with track-relative system (R4 style)
        this.kart.update(this.input.keys, delta, this.track);

        // Check track boundaries
        const collision = this.track.getTrackBoundaryCollision(
            this.kart.position,
            this.kart.boundingRadius
        );

        if (collision.collision) {
            this.kart.applyCollision(collision.normal, collision.penetration);
        }

        // Update camera with boost shake effect
        this.cameraController.update(
            this.kart.position,
            this.kart.rotation,
            this.kart.forwardSpeed,
            this.kart.boostTimeRemaining > 0
        );

        // Check checkpoints
        const checkpointEvent = this.checkpointManager.update(
            this.kart.position,
            this.raceTime
        );

        if (checkpointEvent) {
            if (checkpointEvent.type === 'lap') {
                // Flash effect or sound for new lap
            } else if (checkpointEvent.type === 'finish') {
                this.state = 'FINISHED';
                this.menuManager.showFinish(
                    checkpointEvent.totalTime,
                    this.checkpointManager.lapTimes
                );
                this.hud.hide();
                this.input.showTouchControls(false);
            }
        }

        // Update HUD with drift boost level indicator
        this.hud.update(
            this.raceTime,
            this.checkpointManager.lap,
            this.track.laps,
            this.kart.forwardSpeed,
            this.kart.isDrifting,
            this.kart.driftBoostLevel
        );
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.update();

        // Keep skybox centered on camera
        if (this.skyMesh) {
            this.skyMesh.position.copy(this.camera.position);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

export default Game;
