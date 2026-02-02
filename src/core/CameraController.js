/**
 * Camera Controller
 *
 * Handles dynamic camera positioning, smooth following, and effects.
 * Enhanced with R4-style juice: lag, tilt, shake, FOV.
 */

import * as THREE from 'three';
import { CONFIG } from '../utils/config.js';

export class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.target = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // Camera mode system
        this.cameraMode = 'THIRD_PERSON';
        this.modes = ['THIRD_PERSON', 'FIRST_PERSON'];

        // Lag system - camera trails behind actual target
        this.laggedPosition = new THREE.Vector3();
        this.lagVelocity = new THREE.Vector3();

        // Shake system
        this.shakeOffset = new THREE.Vector3();
        this.shakeIntensity = 0;
        this.shakeTime = 0;

        // Tilt system
        this.currentTilt = 0;

        // FOV smoothing
        this.currentFov = CONFIG.camera.baseFov;

        // Previous state for detecting changes
        this.wasGrounded = true;
        this.lastVerticalVelocity = 0;
    }

    update(kartPosition, kartRotation, kartSpeed, isBoosting = false, kart = null) {
        // Dispatch to appropriate camera mode handler
        if (this.cameraMode === 'FIRST_PERSON') {
            this.updateFirstPerson(kartPosition, kartRotation, kartSpeed, isBoosting, kart);
            return;
        }

        this.updateThirdPerson(kartPosition, kartRotation, kartSpeed, isBoosting, kart);
    }

    updateThirdPerson(kartPosition, kartRotation, kartSpeed, isBoosting, kart) {
        const c = CONFIG.camera;
        const dt = 1 / 60; // Approximate delta

        // Get kart state for advanced effects
        const bodyRoll = kart?.bodyRoll || 0;
        const isGrounded = kart?.isGrounded ?? true;
        const verticalVelocity = kart?.localVelocity?.y || 0;
        const driftState = kart?.driftState || 'NONE';
        const driftDirection = kart?.driftDirection || 0;

        // ===== CALCULATE IDEAL CAMERA POSITION =====
        const speedRatio = Math.abs(kartSpeed) / CONFIG.physics.maxSpeed;

        // Dynamic distance - pull back slightly at speed
        const dynamicDistance = c.distance + speedRatio * 1.5;
        const dynamicHeight = c.height + speedRatio * 0.5;

        // Base offset behind and above kart
        let offsetX = -Math.sin(kartRotation) * dynamicDistance;
        let offsetZ = -Math.cos(kartRotation) * dynamicDistance;

        // Drift camera offset - shift camera outward during drift
        if (driftState === 'DRIFTING') {
            const driftOffset = driftDirection * c.driftCameraOffset;
            offsetX += Math.cos(kartRotation) * driftOffset;
            offsetZ -= Math.sin(kartRotation) * driftOffset;
        }

        const idealPosition = new THREE.Vector3(
            kartPosition.x + offsetX,
            kartPosition.y + dynamicHeight,
            kartPosition.z + offsetZ
        );

        // Look ahead point - more dramatic at speed
        const dynamicLookAhead = c.lookAheadDistance + speedRatio * 2.5;
        const lookAhead = new THREE.Vector3(
            Math.sin(kartRotation) * dynamicLookAhead,
            0.8 + speedRatio * 0.3,
            Math.cos(kartRotation) * dynamicLookAhead
        );
        const idealLookAt = kartPosition.clone().add(lookAhead);

        // ===== CAMERA LAG =====
        // Camera trails behind the ideal position, creating sense of momentum
        const lagLerp = 1 - Math.exp(-c.lagRecoverySpeed * dt * 60);

        // Position lag - camera catches up smoothly
        this.laggedPosition.lerp(idealPosition, lagLerp);

        // Additional lag based on speed (more lag = more speed sensation)
        const speedLag = speedRatio * c.lagFactor * dynamicDistance;
        const lagOffset = new THREE.Vector3(
            -Math.sin(kartRotation) * speedLag,
            0,
            -Math.cos(kartRotation) * speedLag
        );

        this.currentPosition.copy(this.laggedPosition).add(lagOffset);

        // Look-at follows more tightly
        this.currentLookAt.lerp(idealLookAt, lagLerp * 1.2);

        // ===== DETECT LANDING FOR SHAKE =====
        if (!this.wasGrounded && isGrounded) {
            // Just landed - add shake based on impact
            const impactSpeed = Math.abs(this.lastVerticalVelocity);
            if (impactSpeed > 5) {
                this.shakeIntensity = Math.min(impactSpeed * 0.008, c.landingShakeIntensity);
            }
        }
        this.wasGrounded = isGrounded;
        this.lastVerticalVelocity = verticalVelocity;

        // ===== SHAKE SYSTEM =====
        if (isBoosting) {
            this.shakeIntensity = Math.max(this.shakeIntensity, c.boostShakeIntensity);
        }

        if (this.shakeIntensity > 0.001) {
            this.shakeTime += dt * 60;

            // Perlin-ish shake using sine waves at different frequencies
            const shake1 = Math.sin(this.shakeTime * 23.7) * Math.cos(this.shakeTime * 17.3);
            const shake2 = Math.sin(this.shakeTime * 31.1) * Math.cos(this.shakeTime * 11.9);
            const shake3 = Math.sin(this.shakeTime * 19.3) * Math.cos(this.shakeTime * 29.7);

            this.shakeOffset.set(
                shake1 * this.shakeIntensity,
                shake2 * this.shakeIntensity * 0.6,
                shake3 * this.shakeIntensity * 0.8
            );

            // Decay shake
            this.shakeIntensity *= Math.exp(-c.shakeDecay * dt);
        } else {
            this.shakeOffset.set(0, 0, 0);
        }

        // ===== CAMERA TILT =====
        // Tilt camera with car's body roll (sympathetic lean)
        const targetTilt = THREE.MathUtils.clamp(-bodyRoll * c.tiltFactor, -c.maxTilt, c.maxTilt);
        this.currentTilt = THREE.MathUtils.lerp(this.currentTilt, targetTilt, 0.15);

        // ===== APPLY TO CAMERA =====
        this.camera.position.copy(this.currentPosition).add(this.shakeOffset);
        this.camera.lookAt(this.currentLookAt);

        // Apply tilt (roll the camera)
        if (Math.abs(this.currentTilt) > 0.001) {
            this.camera.rotateZ(this.currentTilt);
        }

        // ===== DYNAMIC FOV =====
        // Quadratic curve for more punch at high speed
        const fovFromSpeed = speedRatio * speedRatio * (c.maxFov - c.baseFov) * c.fovSpeedScale;
        const boostFovBonus = isBoosting ? 8 : 0;
        const targetFov = c.baseFov + fovFromSpeed + boostFovBonus;

        // Smooth FOV changes
        this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, 0.12);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
    }

    updateFirstPerson(kartPosition, kartRotation, kartSpeed, isBoosting, kart) {
        const hc = CONFIG.hoodCam;
        const dt = 1 / 60;

        // Get forward direction from kart
        const forward = kart?.getCarForward?.() ||
            new THREE.Vector3(Math.sin(kartRotation), 0, Math.cos(kartRotation));

        // Position: at hood of car
        const camPos = kartPosition.clone()
            .add(forward.clone().multiplyScalar(hc.forwardOffset))
            .add(new THREE.Vector3(0, hc.heightOffset, 0));

        // Apply terrain orientation if available (so camera tilts with car on slopes)
        if (kart?.orientationQuat) {
            // Rotate the height offset by the kart's orientation
            const upOffset = new THREE.Vector3(0, hc.heightOffset, 0);
            upOffset.applyQuaternion(kart.orientationQuat);
            camPos.copy(kartPosition)
                .add(forward.clone().multiplyScalar(hc.forwardOffset))
                .add(upOffset);
        }

        // Look at: point ahead in driving direction
        const lookAt = camPos.clone()
            .add(forward.clone().multiplyScalar(hc.lookAheadDistance));

        // Reduced shake for first-person (less nauseating)
        if (isBoosting) {
            this.shakeIntensity = Math.max(
                this.shakeIntensity,
                CONFIG.camera.boostShakeIntensity * hc.shakeMultiplier
            );
        }

        if (this.shakeIntensity > 0.001) {
            this.shakeTime += dt * 60;
            const shake1 = Math.sin(this.shakeTime * 23.7) * Math.cos(this.shakeTime * 17.3);
            const shake2 = Math.sin(this.shakeTime * 31.1) * Math.cos(this.shakeTime * 11.9);

            this.shakeOffset.set(
                shake1 * this.shakeIntensity * hc.shakeMultiplier,
                shake2 * this.shakeIntensity * hc.shakeMultiplier * 0.6,
                0
            );
            this.shakeIntensity *= Math.exp(-CONFIG.camera.shakeDecay * dt);
        } else {
            this.shakeOffset.set(0, 0, 0);
        }

        // Apply position with shake
        this.camera.position.copy(camPos).add(this.shakeOffset);
        this.camera.lookAt(lookAt);

        // Apply terrain orientation to camera (tilt with car)
        if (kart?.orientationQuat) {
            // Extract the roll from the kart's orientation and apply to camera
            const kartUp = new THREE.Vector3(0, 1, 0).applyQuaternion(kart.orientationQuat);
            const worldUp = new THREE.Vector3(0, 1, 0);

            // Get the roll component
            const kartRight = new THREE.Vector3(1, 0, 0).applyQuaternion(kart.orientationQuat);
            const rollAngle = Math.atan2(kartRight.y, Math.sqrt(kartRight.x * kartRight.x + kartRight.z * kartRight.z));

            // Apply subtle roll to camera (less extreme than kart roll)
            this.camera.rotateZ(rollAngle * 0.5);
        }

        // FOV: slightly boosted, with boost bonus
        const boostFovBonus = isBoosting ? 5 : 0;
        const targetFov = hc.fov + boostFovBonus;
        this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, 0.12);
        this.camera.fov = this.currentFov;
        this.camera.updateProjectionMatrix();
    }

    // Toggle between camera modes
    toggleMode() {
        const currentIndex = this.modes.indexOf(this.cameraMode);
        const nextIndex = (currentIndex + 1) % this.modes.length;
        this.cameraMode = this.modes[nextIndex];
        return this.cameraMode;
    }

    // Get current camera mode
    getMode() {
        return this.cameraMode;
    }

    // Add manual shake (for collisions, etc.)
    addShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    reset(kartPosition, kartRotation) {
        const c = CONFIG.camera;

        // Reset to third-person mode on race start
        this.cameraMode = 'THIRD_PERSON';

        const offset = new THREE.Vector3(
            -Math.sin(kartRotation) * c.distance,
            c.height,
            -Math.cos(kartRotation) * c.distance
        );

        const targetPos = kartPosition.clone().add(offset);
        this.currentPosition.copy(targetPos);
        this.laggedPosition.copy(targetPos);
        this.currentLookAt.copy(kartPosition);
        this.shakeOffset.set(0, 0, 0);
        this.shakeIntensity = 0;
        this.currentTilt = 0;
        this.currentFov = c.baseFov;
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
        this.camera.fov = c.baseFov;
        this.camera.updateProjectionMatrix();
    }
}

export default CameraController;
