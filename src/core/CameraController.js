/**
 * Camera Controller
 *
 * Handles dynamic camera positioning, smooth following, and effects.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';
import { CONFIG } from '../utils/config.js';

export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.target = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        this.shakeOffset = new THREE.Vector3();
        this.shakeTime = 0;
    }

    update(kartPosition, kartRotation, kartSpeed, isBoosting = false) {
        const c = CONFIG.camera;

        // Calculate ideal camera position (behind and above kart)
        // Minimal pullback at high speeds to maintain full-size car feel
        const speedRatio = Math.abs(kartSpeed) / CONFIG.physics.maxSpeed;
        const dynamicDistance = c.distance + speedRatio * 1;
        const dynamicHeight = c.height + speedRatio * 0.3;

        const offset = new THREE.Vector3(
            -Math.sin(kartRotation) * dynamicDistance,
            dynamicHeight,
            -Math.cos(kartRotation) * dynamicDistance
        );

        const idealPosition = kartPosition.clone().add(offset);

        // Look ahead point - subtle look-ahead at high speed
        const dynamicLookAhead = c.lookAheadDistance + speedRatio * 1.5;
        const lookAhead = new THREE.Vector3(
            Math.sin(kartRotation) * dynamicLookAhead,
            0.8,
            Math.cos(kartRotation) * dynamicLookAhead
        );
        const idealLookAt = kartPosition.clone().add(lookAhead);

        // Smooth interpolation
        this.currentPosition.lerp(idealPosition, c.positionDamping * 60 / (1000/16));
        this.currentLookAt.lerp(idealLookAt, c.rotationDamping * 60 / (1000/16));

        // Boost shake effect
        if (isBoosting) {
            this.shakeTime += 0.5;
            const intensity = c.boostShakeIntensity;
            this.shakeOffset.set(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity * 0.5,
                (Math.random() - 0.5) * intensity
            );
        } else {
            this.shakeOffset.lerp(new THREE.Vector3(), 0.2);
        }

        // Update camera with shake
        this.camera.position.copy(this.currentPosition).add(this.shakeOffset);
        this.camera.lookAt(this.currentLookAt);

        // Dynamic FOV based on speed - more dramatic effect
        const targetFov = c.baseFov + speedRatio * (c.maxFov - c.baseFov) * c.fovSpeedScale;
        const boostFovBonus = isBoosting ? 5 : 0;
        this.camera.fov += (targetFov + boostFovBonus - this.camera.fov) * 0.15;
        this.camera.updateProjectionMatrix();
    }

    reset(kartPosition, kartRotation) {
        const c = CONFIG.camera;
        const offset = new THREE.Vector3(
            -Math.sin(kartRotation) * c.distance,
            c.height,
            -Math.cos(kartRotation) * c.distance
        );

        this.currentPosition.copy(kartPosition).add(offset);
        this.currentLookAt.copy(kartPosition);
        this.shakeOffset.set(0, 0, 0);
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }
}

export default CameraController;
