/**
 * Input Manager
 *
 * Handles keyboard and touch input for the game.
 * Extracted from index.html during refuckulation.
 */

import { Logger } from '../utils/logger.js';

const inputLog = Logger.getLogger('Input');

export class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            drift: false,
            pause: false
        };
        this.pausePressed = false;
        this.enterPressed = false;

        // Touch state
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        if (this.isTouchDevice) {
            this.initTouchControls();
        }

        inputLog.info('InputManager initialized', { touch: this.isTouchDevice });
    }

    initTouchControls() {
        // Helper to setup a button
        const setupButton = (id, keyName, activeClass = 'active') => {
            const btn = document.getElementById(id);
            if (!btn) return;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[keyName] = true;
                btn.classList.add(activeClass);
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[keyName] = false;
                btn.classList.remove(activeClass);
            });

            btn.addEventListener('touchcancel', () => {
                this.keys[keyName] = false;
                btn.classList.remove(activeClass);
            });
        };

        // Steering buttons
        setupButton('left-btn', 'left');
        setupButton('right-btn', 'right');

        // Pedal buttons
        setupButton('gas-btn', 'forward');
        setupButton('brake-btn', 'backward');

        // Drift button
        setupButton('drift-btn', 'drift');

        // Pause button (special handling)
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!this.pausePressed) {
                    this.keys.pause = true;
                    this.pausePressed = true;
                }
            }, { passive: false });

            pauseBtn.addEventListener('touchend', () => {
                this.pausePressed = false;
            });
        }

        inputLog.info('Touch controls initialized');
    }

    showTouchControls(visible) {
        const el = document.getElementById('touch-controls');
        if (el && this.isTouchDevice) {
            el.classList.toggle('hidden', !visible);
        }
    }

    onKeyDown(e) {
        switch(e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.drift = true; e.preventDefault(); break;
            case 'Escape':
                if (!this.pausePressed) {
                    this.keys.pause = true;
                    this.pausePressed = true;
                }
                break;
            case 'Enter':
                if (!this.enterPressed) {
                    this.keys.enter = true;
                    this.enterPressed = true;
                }
                break;
        }
    }

    onKeyUp(e) {
        switch(e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.drift = false; break;
            case 'Escape': this.pausePressed = false; break;
            case 'Enter': this.enterPressed = false; break;
        }
    }

    consumePause() {
        const was = this.keys.pause;
        this.keys.pause = false;
        return was;
    }

    consumeEnter() {
        const was = this.keys.enter;
        this.keys.enter = false;
        return was;
    }
}

export default InputManager;
