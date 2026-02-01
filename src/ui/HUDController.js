/**
 * HUD Controller
 *
 * Handles in-race display: timer, lap count, speed, drift indicator.
 * Extracted from index.html during refuckulation.
 */

export class HUDController {
    constructor() {
        this.hud = document.getElementById('hud');
        this.timerEl = document.getElementById('hud-timer');
        this.lapEl = document.getElementById('hud-lap');
        this.speedEl = document.getElementById('hud-speed');
        this.driftEl = document.getElementById('hud-drift');
    }

    show() {
        this.hud.classList.remove('hidden');
    }

    hide() {
        this.hud.classList.add('hidden');
    }

    update(time, lap, totalLaps, speed, isDrifting, driftBoostLevel = 0) {
        this.timerEl.textContent = this.formatTime(time);
        this.lapEl.textContent = `LAP ${lap}/${totalLaps}`;
        // Speed display scales for more impressive numbers
        this.speedEl.textContent = Math.abs(Math.round(speed * 1.5));

        // Drift indicator with boost level colors
        if (isDrifting) {
            this.driftEl.classList.add('active');

            // Change color based on boost level
            if (driftBoostLevel >= 3) {
                this.driftEl.textContent = 'MAX BOOST!';
                this.driftEl.style.color = '#00ffff';
                this.driftEl.style.textShadow = '0 0 20px #00ffff, 0 0 40px #00ffff';
            } else if (driftBoostLevel >= 2) {
                this.driftEl.textContent = 'BOOST!';
                this.driftEl.style.color = '#ffaa00';
                this.driftEl.style.textShadow = '0 0 15px #ffaa00, 0 0 30px #ff6600';
            } else if (driftBoostLevel >= 1) {
                this.driftEl.textContent = 'DRIFT!';
                this.driftEl.style.color = '#ffff00';
                this.driftEl.style.textShadow = '0 0 10px #ffff00';
            } else {
                this.driftEl.textContent = 'DRIFT!';
                this.driftEl.style.color = '#ffffff';
                this.driftEl.style.textShadow = '0 0 5px #ffffff';
            }
        } else {
            this.driftEl.classList.remove('active');
            this.driftEl.textContent = 'DRIFT!';
            this.driftEl.style.color = '';
            this.driftEl.style.textShadow = '';
        }
    }

    formatTime(ms) {
        const totalSeconds = ms / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const millis = Math.floor((totalSeconds % 1) * 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    }
}

export default HUDController;
