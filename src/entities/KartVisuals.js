/**
 * Kart Visuals
 *
 * Handles all visual effects for the kart: particles, flames, orientation.
 * Extracted from Kart.js during refuckulation.
 */

import * as THREE from 'three';
import { CONFIG } from '../utils/config.js';

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

/**
 * Updates kart pitch and roll based on track surface and movement
 */
export function updateOrientation(kart, dt) {
    if (kart.surfaceAttached && kart.trackFrame) {
        // Calculate pitch from car's forward direction vs track normal
        const forward = kart.getCarForward();

        // Pitch: how much is the car tilted forward/back relative to ground
        // Only use the component that's actually slope-related (not banking noise)
        const slopeDot = -(forward.x * kart.trackFrame.normal.x + forward.z * kart.trackFrame.normal.z);
        // Reduce pitch effect - was too dramatic
        const targetPitch = Math.asin(THREE.MathUtils.clamp(slopeDot, -0.5, 0.5)) * 0.7;

        // Roll: mostly from turn dynamics, with just a hint of banking
        // Don't use bankDot directly - it was causing the "Riyadh drift" tilting
        // Instead, use the actual calculated banking angle from the track frame
        let targetRoll = kart.trackFrame.banking * 0.3; // Only 30% of track banking

        // Add turn-induced roll (this is the main source of visual roll)
        const turnRoll = -kart.angularVelocity * 0.08;

        // Add lateral velocity roll (sliding sensation) - reduced
        const lateralRoll = -kart.lateralSpeed * 0.002;

        // Add drift roll bias - reduced
        const driftRoll = kart.driftState === 'DRIFTING' ? -kart.driftDirection * 0.08 : 0;

        targetRoll += turnRoll + lateralRoll + driftRoll;
        // Much tighter clamp - max ~17 degrees instead of ~30
        targetRoll = THREE.MathUtils.clamp(targetRoll, -0.3, 0.3);

        // Smooth interpolation
        kart.pitch = THREE.MathUtils.lerp(kart.pitch, targetPitch, 1 - Math.exp(-12 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, targetRoll, 1 - Math.exp(-10 * dt));
    } else if (kart.isGrounded) {
        // Fallback to old ground normal method if no track frame
        const forward = new THREE.Vector3(Math.sin(kart.rotation), 0, Math.cos(kart.rotation));
        const slopeDot = forward.x * kart.groundNormal.x + forward.z * kart.groundNormal.z;
        const targetPitch = -Math.asin(THREE.MathUtils.clamp(slopeDot, -0.8, 0.8)) * 0.8;

        const turnRoll = -kart.angularVelocity * 0.15;
        const lateralRoll = -kart.lateralSpeed * 0.003;
        const driftRoll = kart.driftState === 'DRIFTING' ? -kart.driftDirection * 0.1 : 0;
        const targetRoll = THREE.MathUtils.clamp(turnRoll + lateralRoll + driftRoll, -0.4, 0.4);

        kart.pitch = THREE.MathUtils.lerp(kart.pitch, targetPitch, 1 - Math.exp(-10 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, targetRoll, 1 - Math.exp(-8 * dt));
    } else {
        // In air, slowly return to level
        kart.pitch = THREE.MathUtils.lerp(kart.pitch, 0, 1 - Math.exp(-2 * dt));
        kart.roll = THREE.MathUtils.lerp(kart.roll, 0, 1 - Math.exp(-2 * dt));
    }
}

/**
 * Updates wheel spin and steering visuals
 */
export function updateWheelVisuals(kart, dt) {
    const wheels = kart.mesh.userData.wheels;

    wheels.forEach(wheel => {
        // Wheel spin based on forward speed
        wheel.rotation.x += kart.forwardSpeed * 0.15 * dt;

        // Front wheel steering
        if (wheel.userData.isFront) {
            let steerAngle = kart.steeringAngle * 0.8;
            if (kart.driftState === 'DRIFTING') {
                steerAngle = -kart.driftDirection * 0.4;
            }
            wheel.rotation.y = steerAngle;
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
