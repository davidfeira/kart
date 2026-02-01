/**
 * Kart Visuals
 *
 * Handles all visual effects for the kart: particles, flames, orientation.
 * Extracted from Kart.js during refuckulation.
 */

import * as THREE from 'three';
import { CONFIG } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

// Module logger - logs to /logs/physics.log in dev mode
const log = Logger.getLogger('KartVisuals');

/**
 * Creates drift smoke particle system
 */
export function createDriftParticles() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100; // Start off-screen
        positions[i * 3 + 2] = 0;
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
        sizes[i] = 0;
        lifetimes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.lifetimes = lifetimes;
    particles.userData.velocities = new Float32Array(particleCount * 3);
    particles.userData.nextParticle = 0;

    return particles;
}

/**
 * Updates drift smoke particles
 */
export function updateDriftParticles(particles, kart, dt) {
    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const lifetimes = particles.userData.lifetimes;
    const velocities = particles.userData.velocities;
    const particleCount = lifetimes.length;

    // Update existing particles
    for (let i = 0; i < particleCount; i++) {
        if (lifetimes[i] > 0) {
            lifetimes[i] -= dt;

            // Move particle
            positions[i * 3] += velocities[i * 3] * dt;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

            // Rise and slow down
            velocities[i * 3 + 1] += 2 * dt;
            velocities[i * 3] *= 0.98;
            velocities[i * 3 + 2] *= 0.98;

            // Fade out
            const alpha = lifetimes[i] / 0.8;
            colors[i * 3] = alpha;
            colors[i * 3 + 1] = alpha;
            colors[i * 3 + 2] = alpha;
        }
    }

    // Spawn new particles when drifting
    if (kart.driftState === 'DRIFTING' && Math.abs(kart.forwardSpeed) > 30) {
        const spawnRate = 15;
        const spawnCount = Math.floor(spawnRate * dt) + (Math.random() < (spawnRate * dt % 1) ? 1 : 0);

        for (let s = 0; s < spawnCount; s++) {
            const i = particles.userData.nextParticle;
            particles.userData.nextParticle = (i + 1) % particleCount;

            // Spawn at rear wheel position
            const side = Math.random() > 0.5 ? 1 : -1;
            const cos = Math.cos(kart.rotation);
            const sin = Math.sin(kart.rotation);
            const localX = side * 0.7;
            const localZ = -0.7;

            positions[i * 3] = kart.position.x + localX * cos - localZ * sin;
            positions[i * 3 + 1] = kart.position.y + 0.1;
            positions[i * 3 + 2] = kart.position.z + localX * sin + localZ * cos;

            // Random velocity
            velocities[i * 3] = (Math.random() - 0.5) * 2;
            velocities[i * 3 + 1] = Math.random() * 2;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

            lifetimes[i] = 0.5 + Math.random() * 0.3;

            // Color based on boost level
            if (kart.driftBoostLevel >= 3) {
                colors[i * 3] = 0;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
            } else if (kart.driftBoostLevel >= 2) {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 0.6;
                colors[i * 3 + 2] = 0;
            } else if (kart.driftBoostLevel >= 1) {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 0;
            } else {
                colors[i * 3] = 0.8;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 0.8;
            }
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
}

/**
 * Creates boost flame cone mesh
 */
export function createBoostFlame() {
    const flameGeom = new THREE.ConeGeometry(0.15, 0.8, 8);
    const flameMat = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });

    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0.3, -1.2);

    return flame;
}

/**
 * Updates boost flame visibility and animation
 */
export function updateBoostFlame(flame, kart, dt) {
    if (!flame) return;

    if (kart.boostTimeRemaining > 0) {
        // Show and animate flame
        flame.material.opacity = 0.8 + Math.random() * 0.2;
        flame.scale.setScalar(1 + Math.random() * 0.3);

        // Color based on boost power
        const intensity = kart.boostPower / CONFIG.physics.driftBoostPower[2];
        if (intensity > 0.8) {
            flame.material.color.setHex(0x00ffff);
        } else if (intensity > 0.5) {
            flame.material.color.setHex(0xffaa00);
        } else {
            flame.material.color.setHex(0xffff00);
        }
    } else {
        flame.material.opacity = 0;
    }
}

/**
 * Creates spark particle system for drift boost charging
 */
export function createSparkParticles() {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100;
        positions[i * 3 + 2] = 0;
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0;
        sizes[i] = 0;
        lifetimes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.lifetimes = lifetimes;
    particles.userData.velocities = new Float32Array(particleCount * 3);
    particles.userData.nextParticle = 0;

    return particles;
}

/**
 * Updates spark particles during drift boost charging
 */
export function updateSparkParticles(particles, kart, dt) {
    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size.array;
    const lifetimes = particles.userData.lifetimes;
    const velocities = particles.userData.velocities;
    const particleCount = lifetimes.length;

    // Update existing spark particles
    for (let i = 0; i < particleCount; i++) {
        if (lifetimes[i] > 0) {
            lifetimes[i] -= dt;

            // Move particle
            positions[i * 3] += velocities[i * 3] * dt;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

            // Apply gravity to sparks
            velocities[i * 3 + 1] -= 15 * dt;

            // Slow down horizontally
            velocities[i * 3] *= 0.95;
            velocities[i * 3 + 2] *= 0.95;

            // Fade out and shrink
            const alpha = Math.min(lifetimes[i] / 0.3, 1.0);
            sizes[i] = alpha * 0.3;

            // Keep bright orange/yellow color
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.5 + alpha * 0.3;
            colors[i * 3 + 2] = alpha * 0.2;
        } else {
            sizes[i] = 0;
        }
    }

    // Spawn sparks when drifting and charging boost
    if (kart.driftState === 'DRIFTING' && kart.driftBoostLevel > 0 && kart.driftBoostLevel < 3) {
        const spawnRate = 25;
        const spawnCount = Math.floor(spawnRate * dt) + (Math.random() < (spawnRate * dt % 1) ? 1 : 0);

        for (let s = 0; s < spawnCount; s++) {
            const i = particles.userData.nextParticle;
            particles.userData.nextParticle = (i + 1) % particleCount;

            // Spawn at rear wheel positions
            const side = Math.random() > 0.5 ? 1 : -1;
            const cos = Math.cos(kart.rotation);
            const sin = Math.sin(kart.rotation);
            const localX = side * 0.7;
            const localZ = -0.7;

            positions[i * 3] = kart.position.x + localX * cos - localZ * sin;
            positions[i * 3 + 1] = kart.position.y + 0.05;
            positions[i * 3 + 2] = kart.position.z + localX * sin + localZ * cos;

            // Random scattered velocity
            const scatter = 8;
            velocities[i * 3] = (Math.random() - 0.5) * scatter;
            velocities[i * 3 + 1] = Math.random() * 3 + 1;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * scatter;

            lifetimes[i] = 0.2 + Math.random() * 0.2;

            // Color based on boost level
            if (kart.driftBoostLevel >= 2) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.4;
                colors[i * 3 + 2] = 0;
            } else {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 0;
            }

            sizes[i] = 0.3;
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
}

// Debug logging counter for orientation
let orientDebugCounter = 0;

/**
 * Updates kart pitch and roll based on track surface and movement
 */
export function updateOrientation(kart, dt) {
    orientDebugCounter++;
    const shouldLog = orientDebugCounter % 60 === 0;

    if (kart.surfaceAttached && kart.trackFrame) {
        // Calculate pitch from car's forward direction vs track normal
        const forward = kart.getCarForward();

        // Pitch: how much is the car tilted forward/back relative to ground
        // Only use the component that's actually slope-related (not banking noise)
        const slopeDot = -(forward.x * kart.trackFrame.normal.x + forward.z * kart.trackFrame.normal.z);
        // Reduce pitch effect - was too dramatic
        const targetPitch = Math.asin(THREE.MathUtils.clamp(slopeDot, -0.5, 0.5)) * 0.7;

        // Roll: ONLY from significant track banking, NOT from turning or flat ground noise
        // Track reports constant 0.3 banking even on flat ground - need higher threshold
        const bankingThreshold = 0.35; // ~20 degrees - filters out the 0.3 noise
        let targetRoll = 0;

        if (shouldLog) {
            log.debug('Banking check', {
                banking: kart.trackFrame.banking.toFixed(4),
                threshold: bankingThreshold,
                currentRoll: kart.roll.toFixed(4)
            });
        }

        if (Math.abs(kart.trackFrame.banking) > bankingThreshold) {
            targetRoll = kart.trackFrame.banking * 0.4;
            if (shouldLog) {
                log.debug('Banking ABOVE THRESHOLD', { targetRoll: targetRoll.toFixed(4) });
            }
        }

        // Clamp to reasonable values
        targetRoll = THREE.MathUtils.clamp(targetRoll, -0.25, 0.25);

        // Smooth interpolation
        kart.pitch = THREE.MathUtils.lerp(kart.pitch, targetPitch, 1 - Math.exp(-12 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, targetRoll, 1 - Math.exp(-10 * dt));
    } else if (kart.isGrounded) {
        // Fallback to old ground normal method if no track frame
        const forward = new THREE.Vector3(Math.sin(kart.rotation), 0, Math.cos(kart.rotation));
        const slopeDot = forward.x * kart.groundNormal.x + forward.z * kart.groundNormal.z;
        const targetPitch = -Math.asin(THREE.MathUtils.clamp(slopeDot, -0.8, 0.8)) * 0.8;

        // No turn-induced roll - only significant slope-based roll
        // Calculate roll from the ground normal's sideways tilt
        const right = new THREE.Vector3(Math.cos(kart.rotation), 0, -Math.sin(kart.rotation));
        const bankDot = right.x * kart.groundNormal.x + right.z * kart.groundNormal.z;

        // Add threshold to ignore flat ground noise
        const bankingThreshold = 0.05;
        let targetRoll = 0;
        if (Math.abs(bankDot) > bankingThreshold) {
            targetRoll = THREE.MathUtils.clamp(Math.asin(bankDot) * 0.4, -0.25, 0.25);
        }

        kart.pitch = THREE.MathUtils.lerp(kart.pitch, targetPitch, 1 - Math.exp(-10 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, targetRoll, 1 - Math.exp(-8 * dt));
    } else {
        // In air, slowly return to level
        kart.pitch = THREE.MathUtils.lerp(kart.pitch, 0, 1 - Math.exp(-2 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, 0, 1 - Math.exp(-2 * dt));
    }
}

/**
 * Updates suspension animation based on acceleration and speed
 * Creates weight transfer effect for more arcade feel
 */
export function updateSuspension(kart, dt) {
    const wheelHubs = kart.mesh.userData.wheelHubs;
    const bodyGroup = kart.mesh.userData.bodyGroup;

    if (!wheelHubs || !bodyGroup) return;

    // Initialize suspension state if not present
    if (!kart.suspensionState) {
        kart.suspensionState = {
            frontCompression: 0,
            rearCompression: 0,
            bodyPitch: 0,
            lastSpeed: 0
        };
    }

    const state = kart.suspensionState;
    const suspensionTravel = 0.08; // Max compression distance
    const stiffness = 8; // Spring stiffness for lerp

    // Calculate acceleration (change in speed)
    const acceleration = (kart.forwardSpeed - state.lastSpeed) / Math.max(dt, 0.001);
    state.lastSpeed = kart.forwardSpeed;

    // Weight transfer: braking compresses front, acceleration compresses rear
    const accelFactor = THREE.MathUtils.clamp(acceleration / 100, -1, 1);

    // Target compression values
    let targetFrontCompression = 0;
    let targetRearCompression = 0;

    if (accelFactor < 0) {
        // Braking - front dips
        targetFrontCompression = -accelFactor * suspensionTravel;
    } else if (accelFactor > 0) {
        // Accelerating - rear dips (squat)
        targetRearCompression = accelFactor * suspensionTravel * 0.7;
    }

    // Add speed-based settling (car sits lower at high speed)
    const speedFactor = Math.min(Math.abs(kart.forwardSpeed) / 150, 1);
    const speedSettle = speedFactor * 0.02;
    targetFrontCompression += speedSettle;
    targetRearCompression += speedSettle;

    // Add landing bounce if car was airborne
    if (!kart.isGrounded && kart.wasGrounded) {
        // Just landed - compress both
        targetFrontCompression += 0.05;
        targetRearCompression += 0.05;
    }
    kart.wasGrounded = kart.isGrounded;

    // Smooth interpolation
    state.frontCompression = THREE.MathUtils.lerp(
        state.frontCompression,
        targetFrontCompression,
        1 - Math.exp(-stiffness * dt)
    );
    state.rearCompression = THREE.MathUtils.lerp(
        state.rearCompression,
        targetRearCompression,
        1 - Math.exp(-stiffness * dt)
    );

    // Apply to wheel hubs (move them up when compressed)
    wheelHubs.forEach(hub => {
        const baseY = 0.28; // Original wheel height
        const compression = hub.userData.isFront
            ? state.frontCompression
            : state.rearCompression;

        hub.position.y = baseY - compression;
    });

    // Apply subtle body pitch based on suspension difference
    const pitchFromSuspension = (state.frontCompression - state.rearCompression) * 0.5;
    state.bodyPitch = THREE.MathUtils.lerp(
        state.bodyPitch,
        pitchFromSuspension,
        1 - Math.exp(-stiffness * dt)
    );

    // Apply to body group (subtle nose dive / squat)
    bodyGroup.rotation.x = state.bodyPitch;

    // Average compression affects body height
    const avgCompression = (state.frontCompression + state.rearCompression) / 2;
    bodyGroup.position.y = -avgCompression * 0.3;
}

// Debug logging counter
let wheelDebugCounter = 0;

/**
 * Updates wheel spin and steering visuals
 * Uses new hub/assembly hierarchy for correct rotation
 */
export function updateWheelVisuals(kart, dt) {
    const wheelHubs = kart.mesh.userData.wheelHubs;

    // Fallback for old wheel structure (backwards compatibility)
    if (!wheelHubs) {
        const wheels = kart.mesh.userData.wheels;
        if (wheels) {
            wheels.forEach(wheel => {
                wheel.rotation.x += kart.forwardSpeed * 0.15 * dt;
                if (wheel.userData.isFront) {
                    let steerAngle = kart.steeringAngle * 0.8;
                    if (kart.driftState === 'DRIFTING') {
                        steerAngle = -kart.driftDirection * 0.4;
                    }
                    wheel.rotation.y = steerAngle;
                }
            });
        }
        return;
    }

    // Debug logging every 60 frames
    wheelDebugCounter++;
    const shouldLog = wheelDebugCounter % 60 === 0;

    if (shouldLog) {
        log.debug('Wheel update', { hubCount: wheelHubs.length, speed: kart.forwardSpeed.toFixed(1) });
    }

    // New hub/assembly hierarchy
    wheelHubs.forEach((hub, index) => {
        const wheelAssembly = hub.userData.wheelAssembly;

        if (!wheelAssembly) {
            log.error(`Hub ${index} missing wheelAssembly!`);
            return;
        }

        // Wheel spin - rotate around X axis (the axle)
        // Spokes make this rotation visible
        const spinRate = kart.forwardSpeed * 0.15;
        wheelAssembly.rotation.x += spinRate * dt;

        if (shouldLog) {
            log.debug(`Wheel ${index}`, { isFront: hub.userData.isFront, rotX: wheelAssembly.rotation.x.toFixed(2) });
        }

        // Front wheel steering - rotate the hub around Y
        if (hub.userData.isFront) {
            let steerAngle = kart.steeringAngle * 0.8;
            if (kart.driftState === 'DRIFTING') {
                steerAngle = -kart.driftDirection * 0.4;
            }
            hub.rotation.y = steerAngle;
        }
    });
}

/**
 * Disposes of visual resources
 */
export function disposeVisuals(kart) {
    if (kart.driftParticles) {
        kart.driftParticles.geometry.dispose();
        kart.driftParticles.material.dispose();
        kart.scene.remove(kart.driftParticles);
    }

    if (kart.sparkParticles) {
        kart.sparkParticles.geometry.dispose();
        kart.sparkParticles.material.dispose();
        kart.scene.remove(kart.sparkParticles);
    }

    if (kart.boostFlame) {
        kart.boostFlame.geometry.dispose();
        kart.boostFlame.material.dispose();
    }
}
