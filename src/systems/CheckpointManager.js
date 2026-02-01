/**
 * Checkpoint Manager
 *
 * Handles lap/checkpoint tracking and race timing.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';
import { Logger } from '../utils/logger.js';
import { CONFIG } from '../utils/config.js';

const checkpointLog = Logger.getLogger('Checkpoint');

export class CheckpointManager {
    constructor(checkpoints) {
        this.checkpoints = checkpoints;
        this.currentCheckpoint = 0;
        this.lap = 1;
        this.lapTimes = [];
        this.raceStartTime = 0;
        this.lapStartTime = 0;
        this.finished = false;

        checkpointLog.info('CheckpointManager initialized', { totalCheckpoints: checkpoints.length });
    }

    reset(startTime) {
        this.currentCheckpoint = 0;
        this.lap = 1;
        this.lapTimes = [];
        this.raceStartTime = startTime;
        this.lapStartTime = startTime;
        this.finished = false;
        checkpointLog.info('Race timer reset');
    }

    update(kartPosition, currentTime) {
        if (this.finished) return null;

        const nextCheckpoint = this.checkpoints[this.currentCheckpoint];

        // Check if kart crossed checkpoint
        const toKart = new THREE.Vector3().subVectors(kartPosition, nextCheckpoint.position);
        const alongTrack = toKart.dot(nextCheckpoint.direction);
        const acrossTrack = Math.abs(toKart.dot(nextCheckpoint.right));

        // Checkpoint is crossed when kart passes through it
        if (alongTrack > 0 && alongTrack < 5 && acrossTrack < nextCheckpoint.width / 2) {
            this.currentCheckpoint++;
            checkpointLog.debug('Checkpoint crossed', { checkpoint: this.currentCheckpoint, lap: this.lap });

            // Check for lap completion
            if (this.currentCheckpoint >= this.checkpoints.length) {
                this.currentCheckpoint = 0;
                const lapTime = currentTime - this.lapStartTime;
                this.lapTimes.push(lapTime);
                this.lapStartTime = currentTime;

                if (this.lap >= CONFIG.race.totalLaps) {
                    this.finished = true;
                    const totalTime = currentTime - this.raceStartTime;
                    checkpointLog.info('Race finished', { totalTime, lapTimes: this.lapTimes });
                    return { type: 'finish', lapTime, totalTime };
                }

                this.lap++;
                checkpointLog.info('Lap completed', { lapNumber: this.lap - 1, lapTime });
                return { type: 'lap', lapNumber: this.lap, lapTime };
            }

            return { type: 'checkpoint', index: this.currentCheckpoint };
        }

        return null;
    }

    getTotalTime(currentTime) {
        return currentTime - this.raceStartTime;
    }

    getCurrentLapTime(currentTime) {
        return currentTime - this.lapStartTime;
    }
}

export default CheckpointManager;
