/**
 * Kart Class
 *
 * Main kart entity with physics, drift mechanics, and visual effects.
 * Extracted from index.html during refuckulation.
 *
 * Visual effects are in KartVisuals.js.
 */

import * as THREE from 'three';
import { Logger } from '../utils/logger.js';
import { CONFIG } from '../utils/config.js';
import { KART_TYPES } from './kartTypes.js';
import { TrackFrame } from '../core/TrackFrame.js';
import { createKartGeometry } from './KartFactory.js';
import * as KartVisuals from './KartVisuals.js';

const kartLog = Logger.getLogger('Kart');

// Reusable objects for orientation calculations (avoid GC)
const _driftQuat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

export class Kart {
    constructor(type, scene) {
        this.type = type;
        this.scene = scene;
        this.config = KART_TYPES[type];
        this.mesh = createKartGeometry(type);
        scene.add(this.mesh);

        // Drift particle system (uses KartVisuals)
        this.driftParticles = KartVisuals.createDriftParticles();
        scene.add(this.driftParticles);

        // Boost flame effect (uses KartVisuals)
        this.boostFlame = KartVisuals.createBoostFlame();
        this.mesh.add(this.boostFlame);

        // Spark particle system for drift boost charging (uses KartVisuals)
        this.sparkParticles = KartVisuals.createSparkParticles();
        scene.add(this.sparkParticles);

        // Physics state - VELOCITY BASED
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y-axis rotation in radians
        this.angularVelocity = 0;

        // Vertical physics
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.groundNormal = new THREE.Vector3(0, 1, 0);
        this.previousGroundNormal = new THREE.Vector3(0, 1, 0);

        // Track-relative physics (R4 style)
        this.trackFrame = new TrackFrame();
        this.previousTrackFrame = null;
        this.lastTrackT = 0;
        this.localVelocity = new THREE.Vector3(); // Velocity in TNB frame
        this.surfaceAttached = true;
        this.airTime = 0;
        this.timeSinceLastLaunch = 1; // Cooldown for ramp launches

        // Steering state
        this.steeringInput = 0;
        this.steeringAngle = 0;

        // Drift state machine: 'NONE', 'INITIATING', 'DRIFTING', 'EXITING'
        this.driftState = 'NONE';
        this.driftDirection = 0;
        this.driftAngle = 0;
        this.driftTime = 0;
        this.driftBoostLevel = 0;

        // Boost state
        this.boostTimeRemaining = 0;
        this.boostPower = 0;

        // Derived values
        this.forwardSpeed = 0;
        this.lateralSpeed = 0;

        // Visual state
        this.pitch = 0;
        this.roll = 0;

        // Body dynamics state (R4-style arcade feel)
        this.bodyRoll = 0;              // Current body roll angle
        this.bodyPitch = 0;             // Current body pitch angle
        this.lateralG = 0;              // Lateral acceleration for effects
        this.longitudinalG = 0;         // Forward/back acceleration
        this.lastForwardSpeed = 0;      // For calculating acceleration
        this.weightFront = 0.5;         // Weight distribution (0.5 = balanced)
        this.currentSlipAngle = 0;      // Smoothed tire slip angle
        this.currentGripMultiplier = 1; // Grip from slip model

        // Brake sliding state (R4/GTA style)
        this.brakeSlipAmount = 0;       // 0 = full grip, 1 = wheels locked/sliding
        this.isBrakingHard = false;     // Flag for brake slide detection

        // Collision
        this.boundingRadius = 1.2;

        // Backwards compatibility
        this.speed = 0;
        this.isDrifting = false;

        // Physics logging state
        this._logFrameCounter = 0;
        this._lastLoggedGrounded = true;

        kartLog.info('Kart created', { type, stats: this.config.stats });
    }

    update(input, delta, trackGenerator = null) {
        const p = CONFIG.physics;
        const mod = this.config.modifiers;

        // Cap delta to prevent physics explosions
        const dt = Math.min(delta, 0.05);

        // If trackGenerator provided, use new track-relative physics
        if (trackGenerator) {
            this.updateTrackPhysics(input, dt, trackGenerator, mod);
        } else {
            // Fallback to old physics (for compatibility)
            this.updateLegacyPhysics(input, dt, mod);
        }

        // ===== PHYSICS LOGGING =====
        this._logFrameCounter++;

        // Log ground contact changes
        if (this.isGrounded !== this._lastLoggedGrounded) {
            kartLog.debug(this.isGrounded ? 'Landed' : 'Airborne', {
                speed: this.forwardSpeed.toFixed(1),
                localVelY: this.localVelocity.y.toFixed(2),
                posY: this.position.y.toFixed(2),
                trackY: this.trackFrame?.position.y.toFixed(2) || 'N/A'
            });
            this._lastLoggedGrounded = this.isGrounded;
        }

        // Log physics state every 60 frames (~1 second at 60fps)
        if (this._logFrameCounter % 60 === 0) {
            kartLog.debug('Physics state', {
                pos: `${this.position.x.toFixed(1)},${this.position.y.toFixed(1)},${this.position.z.toFixed(1)}`,
                speed: this.forwardSpeed.toFixed(1),
                drift: this.driftState,
                attached: this.surfaceAttached,
                trackT: this.lastTrackT?.toFixed(3) || 'N/A',
                slope: (this.trackFrame?.slope * 180 / Math.PI)?.toFixed(1) || '0',
                banking: (this.trackFrame?.banking * 180 / Math.PI)?.toFixed(1) || '0'
            });
        }

        // ===== UPDATE VISUALS =====
        this.updateVisuals(input, dt);
    }

    // New R4-style track-relative physics
    updateTrackPhysics(input, dt, trackGenerator, mod) {
        const p = CONFIG.physics;

        // Store previous track frame for ramp detection and smoothing
        if (this.trackFrame) {
            this.previousTrackFrame = this.trackFrame.clone();
        }

        // Get current track frame (optimized with lastT cache)
        this.trackFrame = trackGenerator.getTrackFrame(this.position, this.lastTrackT);
        this.lastTrackT = this.trackFrame.t;

        // Smooth the track frame normal to reduce orientation jitter
        // Higher rate = more responsive, lower rate = smoother but laggier
        if (this.previousTrackFrame) {
            const smoothRate = 40; // 15=very smooth/laggy, 40=balanced, 80=responsive
            const normalSmoothFactor = 1 - Math.exp(-smoothRate * dt);
            this.trackFrame.normal.lerp(this.previousTrackFrame.normal, 1 - normalSmoothFactor);
            this.trackFrame.normal.normalize();
        }

        // Smooth track frame position Y to prevent sudden jumps from causing detachment
        // Only when attached and previous frame exists
        if (this.surfaceAttached && this.previousTrackFrame) {
            const maxYChangePerSecond = 20; // Max 20 units/sec change in track Y
            const maxYChange = maxYChangePerSecond * dt;
            const yDelta = this.trackFrame.position.y - this.previousTrackFrame.position.y;

            if (Math.abs(yDelta) > maxYChange) {
                // Clamp the track frame Y to prevent sudden jumps
                this.trackFrame.position.y = this.previousTrackFrame.position.y +
                    Math.sign(yDelta) * maxYChange;
            }
        }

        // Project world velocity into local TNB frame
        this.projectVelocityToLocal();

        // Update derived values for compatibility
        this.forwardSpeed = this.localVelocity.x;
        this.lateralSpeed = this.localVelocity.z;
        this.speed = this.forwardSpeed;
        this.isDrifting = this.driftState === 'DRIFTING';

        // Get effective max speed
        const effectiveMaxSpeed = this.getMaxSpeed(mod);

        // ===== STEERING =====
        this.processSteeringInput(input, dt, effectiveMaxSpeed);

        // ===== DRIFT STATE MACHINE =====
        this.updateDriftState(input, dt, null); // Pass null, we use local velocity now

        // ===== APPLY HEADING (rotation) =====
        this.updateHeading(dt);

        // ===== ACCELERATION / BRAKING (in local frame) =====
        this.applyLocalAcceleration(input, dt, mod, effectiveMaxSpeed);

        // ===== APPLY LATERAL GRIP (in local frame) =====
        this.applyLocalLateralGrip(dt);

        // ===== TRACK-RELATIVE GRAVITY =====
        this.applyTrackGravity(dt);

        // ===== BOOST =====
        this.updateLocalBoost(dt);

        // ===== FRICTION =====
        // Apply frame-rate independent friction using exponential decay
        if (this.surfaceAttached) {
            // groundFriction is the decay rate per second (e.g., 0.02 = 2% per second)
            // Use exponential decay: speed *= e^(-friction * dt)
            const frictionDecay = Math.exp(-p.groundFriction * 60 * dt);
            this.localVelocity.x *= frictionDecay;
        }

        // ===== SPEED LIMITS =====
        if (Math.abs(this.localVelocity.x) > effectiveMaxSpeed) {
            this.localVelocity.x = Math.sign(this.localVelocity.x) * effectiveMaxSpeed;
        }

        // ===== CONVERT BACK TO WORLD VELOCITY =====
        this.projectVelocityToWorld();

        // ===== INTEGRATE POSITION =====
        const prevY = this.position.y;
        this.position.addScaledVector(this.velocity, dt);

        // Clamp maximum Y change per frame to prevent explosions
        const maxYChangePerFrame = 5; // Max 5 units per frame
        const yChange = this.position.y - prevY;
        if (Math.abs(yChange) > maxYChangePerFrame) {
            this.position.y = prevY + Math.sign(yChange) * maxYChangePerFrame;
            // Also clamp the velocity that caused this
            if (Math.abs(this.velocity.y) > maxYChangePerFrame / dt) {
                this.velocity.y = Math.sign(this.velocity.y) * maxYChangePerFrame / dt;
            }
        }

        // ===== SANITY CHECKS - prevent physics explosions =====
        this.sanitizePhysics();

        // ===== SURFACE ATTACHMENT =====
        this.updateSurfaceAttachment(dt);

        // ===== RAMP LAUNCH CHECK =====
        this.checkTrackRampLaunch(dt);

        // Update derived speed values
        this.forwardSpeed = this.localVelocity.x;
        this.speed = this.forwardSpeed;

        // ===== BODY DYNAMICS (R4-style feel) =====
        this.updateBodyDynamics(dt);
        this.updateSlipPhysics(dt);
    }

    // Legacy physics for backwards compatibility
    updateLegacyPhysics(input, dt, mod) {
        const p = CONFIG.physics;

        // Calculate forward and right vectors
        const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
        const right = new THREE.Vector3(forward.z, 0, -forward.x);

        // Calculate current speeds
        this.forwardSpeed = this.velocity.dot(forward);
        this.lateralSpeed = this.velocity.dot(right);

        // Backwards compatibility
        this.speed = this.forwardSpeed;
        this.isDrifting = this.driftState === 'DRIFTING';

        // Get effective max speed
        const effectiveMaxSpeed = this.getMaxSpeed(mod);

        // ===== STEERING =====
        this.processSteeringInput(input, dt, effectiveMaxSpeed);

        // ===== ACCELERATION / BRAKING =====
        this.processAcceleration(input, dt, forward, mod, effectiveMaxSpeed);

        // ===== DRIFT STATE MACHINE =====
        this.updateDriftState(input, dt, right);

        // ===== APPLY GRIP / TRACTION =====
        this.applyTractionModel(dt, forward, right, effectiveMaxSpeed);

        // ===== BOOST =====
        this.updateBoost(dt, forward);

        // ===== FRICTION =====
        if (this.isGrounded) {
            const frictionForce = this.velocity.clone().multiplyScalar(-p.groundFriction);
            this.velocity.add(frictionForce);
        }

        // ===== SPEED LIMITS =====
        const currentSpeed = this.velocity.length();
        if (currentSpeed > effectiveMaxSpeed) {
            this.velocity.multiplyScalar(effectiveMaxSpeed / currentSpeed);
        }

        // ===== INTEGRATE POSITION =====
        this.position.addScaledVector(this.velocity, dt);

        // Update derived speed values
        this.forwardSpeed = this.velocity.dot(forward);
        this.speed = this.forwardSpeed;
    }

    // Apply heading changes (steering/turning)
    updateHeading(dt) {
        const p = CONFIG.physics;
        const speed = Math.abs(this.localVelocity.x);

        if (speed > 2 && this.surfaceAttached) {
            const turnDir = this.localVelocity.x > 0 ? 1 : -1;
            let turnRate = this.steeringAngle * p.steeringSensitivity * turnDir;

            // During drift, reduce direct steering effect
            if (this.driftState === 'DRIFTING') {
                turnRate *= 0.6;
            }

            this.angularVelocity = turnRate;
        } else if (!this.surfaceAttached) {
            // Air control
            this.angularVelocity = this.steeringAngle * p.steeringSensitivity * p.airControl;
        } else {
            this.angularVelocity = 0;
        }

        this.rotation += this.angularVelocity * dt;
    }

    // Boost in local frame
    updateLocalBoost(dt) {
        if (this.boostTimeRemaining > 0) {
            this.boostTimeRemaining -= dt;

            // Apply boost acceleration in local forward direction
            const boostAccel = 200 * dt * (this.boostPower / CONFIG.physics.driftBoostPower[2]);
            this.localVelocity.x += boostAccel;
        } else {
            this.boostPower = 0;
        }
    }

    // R4-style body dynamics - makes car feel weighty and exciting
    updateBodyDynamics(dt) {
        const bd = CONFIG.physics.bodyDynamics;
        const wt = CONFIG.physics.weightTransfer;
        const speed = Math.abs(this.forwardSpeed);

        // ===== CALCULATE G-FORCES =====

        // Lateral G from turning (steering angle * speed = centripetal acceleration)
        // Higher speed + more steering = more lateral G
        const steeringG = this.steeringAngle * speed * 0.02;

        // Smooth lateral G
        const gLerpRate = 1 - Math.exp(-12 * dt);
        this.lateralG = THREE.MathUtils.lerp(this.lateralG, steeringG, gLerpRate);

        // Longitudinal G from acceleration/braking
        const accel = (this.forwardSpeed - this.lastForwardSpeed) / Math.max(dt, 0.001);
        this.longitudinalG = THREE.MathUtils.lerp(this.longitudinalG, accel * 0.01, gLerpRate);
        this.lastForwardSpeed = this.forwardSpeed;

        // ===== BODY ROLL =====
        // Base roll from lateral G (lean outward from turn)
        let targetRoll = -this.lateralG * bd.rollGSensitivity * 100;

        // R4 MAGIC: During drift, car leans INTO the slide (opposite to realistic physics)
        // This creates that signature arcade racing feel
        if (this.driftState === 'DRIFTING' || this.driftState === 'INITIATING') {
            // Lean into drift direction
            const driftLean = this.driftDirection * bd.driftRollBonus;
            // Also add roll from the drift angle itself
            const angleRoll = this.driftAngle * 0.3;
            targetRoll = driftLean + angleRoll;
        }

        // Clamp and smooth roll
        targetRoll = THREE.MathUtils.clamp(targetRoll, -bd.maxBodyRoll, bd.maxBodyRoll);
        const rollLerp = 1 - Math.exp(-bd.bodyRollSpeed * dt);
        this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, targetRoll, rollLerp);

        // ===== BODY PITCH =====
        let targetPitch = 0;

        if (this.surfaceAttached || this.isGrounded) {
            // Pitch from acceleration (nose up when accelerating, down when braking)
            targetPitch = -this.longitudinalG * bd.pitchAccelSensitivity * 100;
        } else {
            // In air: nose tips down gradually (looks more dynamic)
            targetPitch = Math.min(this.airTime * bd.airPitchRate, bd.maxAirPitch);
        }

        // Clamp and smooth pitch
        targetPitch = THREE.MathUtils.clamp(targetPitch, -bd.maxBodyPitch, bd.maxBodyPitch);
        const pitchLerp = 1 - Math.exp(-bd.bodyPitchSpeed * dt);
        this.bodyPitch = THREE.MathUtils.lerp(this.bodyPitch, targetPitch, pitchLerp);

        // ===== WEIGHT TRANSFER =====
        // Braking shifts weight forward, accelerating shifts it back
        let targetWeight = 0.5; // Balanced

        if (this.longitudinalG < -0.1) {
            // Braking - weight shifts forward
            targetWeight = 0.5 + Math.min(-this.longitudinalG * 2, wt.maxTransfer);
        } else if (this.longitudinalG > 0.1) {
            // Accelerating - weight shifts back
            targetWeight = 0.5 - Math.min(this.longitudinalG * 1.5, wt.maxTransfer);
        }

        const weightLerp = 1 - Math.exp(-wt.transferRate * dt);
        this.weightFront = THREE.MathUtils.lerp(this.weightFront, targetWeight, weightLerp);
    }

    // Progressive tire slip model (Pacejka-lite)
    updateSlipPhysics(dt) {
        const sp = CONFIG.physics.slipPhysics;

        // Calculate slip angle from lateral vs forward velocity
        const lateralVel = Math.abs(this.localVelocity.z);
        const forwardVel = Math.abs(this.localVelocity.x) + 0.1; // Prevent div by zero
        const rawSlipAngle = Math.atan2(lateralVel, forwardVel);

        // Smooth slip angle changes
        const slipLerp = 1 - Math.exp(-sp.slipSmoothRate * dt);
        this.currentSlipAngle = THREE.MathUtils.lerp(this.currentSlipAngle, rawSlipAngle, slipLerp);

        // Pacejka-lite grip curve
        // Grip increases linearly until peak, then falls off
        const slipRatio = this.currentSlipAngle / sp.peakSlipAngle;
        let gripCurve;

        if (slipRatio < 1) {
            // Below peak - grip increases with slip (gives progressive feel)
            gripCurve = 0.7 + slipRatio * 0.3;
        } else {
            // Past peak - grip drops but never to zero
            gripCurve = 1.0 - (slipRatio - 1) * sp.slipFalloff;
        }

        this.currentGripMultiplier = Math.max(sp.minGrip, gripCurve);
    }

    getMaxSpeed(mod) {
        const p = CONFIG.physics;
        let maxSpeed = p.maxSpeed * mod.maxSpeed;
        if (this.boostTimeRemaining > 0) {
            maxSpeed += this.boostPower;
        }
        return maxSpeed;
    }

    // ===== TRACK-RELATIVE PHYSICS (R4 Style) =====

    // Get car's forward direction based on its rotation (heading)
    getCarForward() {
        return new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    }

    // Get car's right direction based on its rotation
    getCarRight() {
        const forward = this.getCarForward();
        return new THREE.Vector3(forward.z, 0, -forward.x);
    }

    // Project world velocity into car-local frame (using car heading, not track tangent)
    projectVelocityToLocal() {
        const forward = this.getCarForward();
        const right = this.getCarRight();

        // ALWAYS use world up for velocity projection
        // Using track normal caused cars to float up/down on banked sections
        this.localVelocity.set(
            this.velocity.dot(forward),     // Forward speed (car's heading)
            this.velocity.y,                // Vertical speed (world Y directly)
            this.velocity.dot(right)        // Lateral speed (car's right)
        );
    }

    // Convert local velocity back to world space (using car heading)
    projectVelocityToWorld() {
        const forward = this.getCarForward();
        const right = this.getCarRight();

        // ALWAYS use world up for velocity - track normal is only for visuals
        this.velocity.set(0, 0, 0);
        this.velocity.addScaledVector(forward, this.localVelocity.x);
        this.velocity.y = this.localVelocity.y;  // Direct world Y
        this.velocity.addScaledVector(right, this.localVelocity.z);
    }

    // Prevent NaN/Infinity from exploding the physics
    sanitizePhysics() {
        const maxPos = 1000;  // Max reasonable position from track center
        const maxVel = 200;   // Max reasonable velocity

        // Check for NaN or Infinity in position
        if (!Number.isFinite(this.position.x) || !Number.isFinite(this.position.y) || !Number.isFinite(this.position.z)) {
            kartLog.warn('Position NaN/Infinity detected, resetting');
            this.position.set(0, 5, 0);
            this.velocity.set(0, 0, 0);
            this.localVelocity.set(0, 0, 0);
            this.surfaceAttached = false;
            return;
        }

        // Check for NaN or Infinity in velocity
        if (!Number.isFinite(this.velocity.x) || !Number.isFinite(this.velocity.y) || !Number.isFinite(this.velocity.z)) {
            kartLog.warn('Velocity NaN/Infinity detected, resetting velocity');
            this.velocity.set(0, 0, 0);
            this.localVelocity.set(0, 0, 0);
            return;
        }

        // Clamp extreme positions (likely fell off track)
        if (Math.abs(this.position.x) > maxPos || Math.abs(this.position.z) > maxPos || this.position.y < -50 || this.position.y > maxPos) {
            kartLog.warn('Extreme position detected', {
                pos: `${this.position.x.toFixed(1)},${this.position.y.toFixed(1)},${this.position.z.toFixed(1)}`
            });
            // Don't reset automatically - let game handle respawn
        }

        // Clamp extreme velocities
        const speed = this.velocity.length();
        if (speed > maxVel) {
            this.velocity.multiplyScalar(maxVel / speed);
            kartLog.debug('Velocity clamped', { originalSpeed: speed.toFixed(1) });
        }
    }

    // Apply gravity in track-relative frame
    applyTrackGravity(dt) {
        const p = CONFIG.physics;
        const tp = p.trackPhysics;

        if (this.surfaceAttached) {
            // Use the track frame's pre-computed slope value
            // slope is in radians, positive = going uphill along track tangent
            // We need to account for car heading vs track tangent direction
            const trackSlope = this.trackFrame.slope || 0;

            // Calculate how aligned the car is with the track direction
            const forward = this.getCarForward();
            const tangentDot = forward.x * this.trackFrame.tangent.x + forward.z * this.trackFrame.tangent.z;

            // Apply slope effect based on car's alignment with track direction
            // If car faces same direction as tangent, use slope as-is
            // If car faces opposite, reverse the slope effect
            const effectiveSlope = trackSlope * tangentDot;

            // Apply gravity along slope (positive slope = uphill = slow down)
            const slopeGravity = tp.gravityAlongTrack * Math.sin(effectiveSlope);
            this.localVelocity.x -= slopeGravity * dt;

            // No vertical velocity when attached to surface
            this.localVelocity.y = 0;
        } else {
            // In air: use simple world gravity (don't use track frame - it's unreliable when far from track)
            // Just apply gravity directly to vertical velocity
            this.localVelocity.y -= p.gravity * dt;

            // Terminal velocity
            if (this.localVelocity.y < -p.terminalVelocity) {
                this.localVelocity.y = -p.terminalVelocity;
            }
        }
    }

    // Handle surface attachment - replaces spring-damper
    updateSurfaceAttachment(dt) {
        const tp = CONFIG.physics.trackPhysics;

        // Calculate height above track surface
        const heightAboveTrack = this.position.y - this.trackFrame.position.y;

        // Track previous frame's position.y for detecting sudden jumps
        const trackYDelta = this.previousTrackFrame
            ? Math.abs(this.trackFrame.position.y - this.previousTrackFrame.position.y)
            : 0;

        if (this.surfaceAttached) {
            // Currently attached to surface

            // Only detach if:
            // 1. Height above track is significant (>0.5m) AND not caused by sudden track Y jump
            // 2. OR we've been explicitly launched (localVelocity.y > 10, not just 5)
            const significantHeight = heightAboveTrack > tp.attachmentThreshold && trackYDelta < 0.3;
            const intentionalLaunch = this.localVelocity.y > 10;

            if (significantHeight || intentionalLaunch) {
                // Left the surface (ramp, jump, or intentional launch)
                this.surfaceAttached = false;
                this.airTime = 0;
                this.isGrounded = false;
                kartLog.debug('Left surface', {
                    height: heightAboveTrack.toFixed(2),
                    velY: this.localVelocity.y.toFixed(2),
                    trackYDelta: trackYDelta.toFixed(2),
                    reason: intentionalLaunch ? 'launch' : 'height'
                });
            } else {
                // Stay attached: smoothly follow surface
                const targetY = this.trackFrame.position.y;

                // If BELOW track, snap up immediately (prevent sinking)
                if (heightAboveTrack < 0) {
                    this.position.y = targetY;
                } else if (Math.abs(heightAboveTrack) < 0.1) {
                    // If very close to track, snap directly
                    this.position.y = targetY;
                } else {
                    // More aggressive attachment - prevent bouncing
                    const blendSpeed = tp.attachmentBlendSpeed * (1 + Math.abs(heightAboveTrack) * 2);
                    this.position.y = THREE.MathUtils.lerp(
                        this.position.y,
                        targetY,
                        1 - Math.exp(-blendSpeed * dt)
                    );
                }

                this.isGrounded = true;
            }
        } else {
            // In the air
            this.airTime += dt;

            // Check for landing
            if (heightAboveTrack <= 0.1) {
                const impactSpeed = -this.localVelocity.y;

                if (impactSpeed > 40) {
                    // Hard landing: small bounce
                    this.localVelocity.y = impactSpeed * 0.2;
                    this.position.y = this.trackFrame.position.y + 0.1;
                    kartLog.debug('Hard landing bounce', { impactSpeed: impactSpeed.toFixed(1) });
                } else {
                    // Soft landing: attach to surface
                    this.surfaceAttached = true;
                    this.isGrounded = true;
                    this.localVelocity.y = 0;
                    this.position.y = this.trackFrame.position.y;
                    kartLog.debug('Landed', {
                        airTime: this.airTime.toFixed(2),
                        impactSpeed: impactSpeed.toFixed(1)
                    });
                }
            }
        }

        // Update ground normal for orientation
        this.groundNormal.copy(this.trackFrame.normal);
    }

    // Apply lateral grip in local frame with progressive slip model
    applyLocalLateralGrip(dt) {
        const p = CONFIG.physics;
        const tp = p.trackPhysics;
        const wt = p.weightTransfer;
        const bp = p.braking;

        if (!this.surfaceAttached) return;

        // Start with slip-model grip
        let gripMultiplier = this.currentGripMultiplier;

        // Drift reduces rear grip significantly
        if (this.driftState === 'DRIFTING' || this.driftState === 'INITIATING') {
            gripMultiplier *= tp.driftRearGripMultiplier;
        }

        // Weight transfer affects grip
        // When braking (weight forward), rear has less grip = easier oversteer
        if (this.weightFront > 0.55) {
            const rearWeightLoss = (this.weightFront - 0.5) / wt.maxTransfer;
            gripMultiplier *= (1 - rearWeightLoss * wt.brakeRearGripLoss);
        }

        // ===== BRAKE SLIDE GRIP LOSS =====
        // When braking hard with slip, lateral grip drops significantly
        // This makes the rear slide out under braking (R4/GTA feel)
        if (this.isBrakingHard && this.brakeSlipAmount > 0) {
            const brakeSlideGripLoss = this.brakeSlipAmount * bp.brakeSlipGripLoss * bp.brakeRearSlideMultiplier;
            gripMultiplier *= (1 - brakeSlideGripLoss);
        }

        // Apply lateral grip force to reduce sideways velocity
        const lateralGrip = -this.localVelocity.z * p.gripCoefficient * gripMultiplier;
        this.localVelocity.z += lateralGrip * dt;

        // ===== TRAIL BRAKING ROTATION =====
        // Steering while braking hard induces rotation (rear comes around)
        if (this.isBrakingHard && Math.abs(this.steeringInput) > 0.3) {
            const brakeSteerForce = this.steeringInput * this.brakeSlipAmount * bp.brakeSteerRotation * this.forwardSpeed * 0.01;
            this.localVelocity.z += brakeSteerForce * dt;
        }
    }

    // Apply acceleration in local frame
    applyLocalAcceleration(input, dt, mod, effectiveMaxSpeed) {
        const p = CONFIG.physics;
        const bp = p.braking;

        // Acceleration curve - stronger at low speed
        const getAccelCurve = (speed) => {
            const ratio = Math.abs(speed) / effectiveMaxSpeed;
            return 1.0 - (ratio * ratio * 0.7);
        };

        const forwardSpeed = this.localVelocity.x;

        if (input.forward && forwardSpeed < effectiveMaxSpeed) {
            const accelMultiplier = getAccelCurve(forwardSpeed);
            const accelForce = p.accelerationForce * mod.acceleration * accelMultiplier * dt;
            this.localVelocity.x += accelForce;

            // Recover brake slip when accelerating
            this.brakeSlipAmount = Math.max(0, this.brakeSlipAmount - bp.brakeSlipRecoveryRate * dt);
            this.isBrakingHard = false;

        } else if (input.backward) {
            if (forwardSpeed > bp.reverseThreshold) {
                // ===== R4/GTA STYLE BRAKING =====

                // 1. Speed-dependent brake effectiveness
                // Braking is less effective at high speed (simulates brake fade)
                let speedFactor = 1.0;
                if (forwardSpeed > bp.brakeFalloffStart) {
                    const overSpeed = (forwardSpeed - bp.brakeFalloffStart) / (effectiveMaxSpeed - bp.brakeFalloffStart);
                    speedFactor = 1.0 - (Math.min(overSpeed, 1.0) * bp.brakeSpeedFalloff);
                }

                // 2. Grip-limited braking force
                const gripFactor = this.currentGripMultiplier;

                // 3. Calculate brake slip (wheel lock tendency)
                const brakeIntensity = forwardSpeed / effectiveMaxSpeed;

                if (brakeIntensity > bp.brakeSlipThreshold) {
                    // Build up brake slip - wheels starting to lock
                    const slipBuildRate = (brakeIntensity - bp.brakeSlipThreshold) / (1 - bp.brakeSlipThreshold);
                    this.brakeSlipAmount = Math.min(1, this.brakeSlipAmount + slipBuildRate * bp.brakeSlipBuildRate * dt);
                    this.isBrakingHard = true;
                } else {
                    // Recover from slip
                    this.brakeSlipAmount = Math.max(0, this.brakeSlipAmount - bp.brakeSlipRecoveryRate * dt);
                    this.isBrakingHard = false;
                }

                // 4. Brake slip reduces grip (simulates locked wheels)
                const slipGripPenalty = 1 - (this.brakeSlipAmount * bp.brakeSlipGripLoss);

                // 5. Calculate final brake force
                const baseBrake = bp.minBrakeForce + (bp.maxBrakeForce - bp.minBrakeForce) * speedFactor;
                const effectiveBrake = baseBrake * gripFactor * slipGripPenalty;

                // 6. Apply braking deceleration
                this.localVelocity.x -= effectiveBrake * dt;

                // Prevent going negative
                if (this.localVelocity.x < 0) {
                    this.localVelocity.x = 0;
                }

            } else {
                // Reverse
                const reverseForce = p.accelerationForce * 0.6 * dt;
                this.localVelocity.x -= reverseForce;
                // Clamp reverse speed
                if (this.localVelocity.x < -p.reverseMaxSpeed) {
                    this.localVelocity.x = -p.reverseMaxSpeed;
                }

                // No slip during reverse
                this.brakeSlipAmount = Math.max(0, this.brakeSlipAmount - bp.brakeSlipRecoveryRate * dt);
                this.isBrakingHard = false;
            }
        } else if (forwardSpeed > 0 && this.surfaceAttached) {
            // Coast deceleration
            this.localVelocity.x -= p.coastDeceleration * dt;
            if (this.localVelocity.x < 0) this.localVelocity.x = 0;

            // Recover brake slip when coasting
            this.brakeSlipAmount = Math.max(0, this.brakeSlipAmount - bp.brakeSlipRecoveryRate * dt);
            this.isBrakingHard = false;
        }
    }

    // Check for ramp launch using track frame slope change
    // Made more conservative to prevent random launches on bumpy tracks
    checkTrackRampLaunch(dt) {
        const p = CONFIG.physics;

        // Update launch cooldown
        this.timeSinceLastLaunch += dt;

        if (!this.surfaceAttached) return;
        if (!this.previousTrackFrame) return;

        // Cooldown: no launches within 0.5 seconds of last launch
        if (this.timeSinceLastLaunch < 0.5) return;

        const speed = Math.abs(this.localVelocity.x);
        // Higher speed threshold - only launch at high speeds
        if (speed < p.rampSpeedThreshold * 1.5) return;

        // Detect slope discontinuity
        const slopeBefore = this.previousTrackFrame.slope;
        const slopeNow = this.trackFrame.slope;
        const slopeChange = slopeBefore - slopeNow;

        // Much stricter requirements:
        // - Need significant uphill slope (> 25 degrees = 0.44 rad)
        // - Need significant change (slope drops by > 20 degrees)
        // - Current slope should be much flatter than before
        const minSlopeForRamp = 0.44; // ~25 degrees (increased from 20)
        const minSlopeChange = 0.35;  // ~20 degrees change (increased from 15)

        if (slopeBefore > minSlopeForRamp && slopeChange > minSlopeChange && slopeNow < slopeBefore * 0.3) {
            // Launch!
            const launchAngle = Math.min(slopeBefore, 0.5); // Cap at ~30 degrees
            const launchPower = speed * p.rampLaunchMultiplier * 0.4; // Further reduced power

            this.surfaceAttached = false;
            this.isGrounded = false;
            this.localVelocity.y = launchPower * Math.sin(launchAngle);
            this.localVelocity.x *= Math.cos(launchAngle);
            this.timeSinceLastLaunch = 0; // Reset cooldown

            kartLog.info('Ramp launch', {
                angle: launchAngle.toFixed(2),
                power: this.localVelocity.y.toFixed(1),
                speed: speed.toFixed(1),
                slopeBefore: slopeBefore.toFixed(2),
                slopeNow: slopeNow.toFixed(2)
            });
        }
    }

    processSteeringInput(input, dt, effectiveMaxSpeed) {
        const p = CONFIG.physics;

        // Raw steering input
        let targetSteering = 0;
        if (input.left) targetSteering = 1;
        if (input.right) targetSteering = -1;

        // Fast, responsive steering lerp
        const lerpFactor = 1 - Math.exp(-p.steeringLerpSpeed * dt);
        this.steeringInput = THREE.MathUtils.lerp(this.steeringInput, targetSteering, lerpFactor);

        // Speed-dependent steering reduction
        const speed = Math.abs(this.forwardSpeed);
        let steeringFactor = 1.0;
        if (speed > 5) {
            const speedRatio = Math.min(speed / effectiveMaxSpeed, 1.0);
            steeringFactor = 1.0 - (speedRatio * p.speedSteeringReduction);
        }

        // Air control reduction
        if (!this.isGrounded) {
            steeringFactor *= p.airControl;
        }

        this.steeringAngle = this.steeringInput * p.maxSteeringAngle * steeringFactor;
    }

    processAcceleration(input, dt, forward, mod, effectiveMaxSpeed) {
        const p = CONFIG.physics;

        // Acceleration curve - stronger at low speed
        const getAccelCurve = (speed) => {
            const ratio = Math.abs(speed) / effectiveMaxSpeed;
            return 1.0 - (ratio * ratio * 0.7);
        };

        if (input.forward && this.forwardSpeed < effectiveMaxSpeed) {
            const accelMultiplier = getAccelCurve(this.forwardSpeed);
            const accelForce = p.accelerationForce * mod.acceleration * accelMultiplier * dt;
            this.velocity.addScaledVector(forward, accelForce);
        } else if (input.backward) {
            if (this.forwardSpeed > 5) {
                // Braking
                this.velocity.addScaledVector(forward, -p.brakeForce * dt);
            } else {
                // Reverse
                const reverseForce = p.accelerationForce * 0.6 * dt;
                this.velocity.addScaledVector(forward, -reverseForce);
                // Clamp reverse speed
                if (this.forwardSpeed < -p.reverseMaxSpeed) {
                    this.velocity.copy(forward).multiplyScalar(-p.reverseMaxSpeed);
                }
            }
        } else if (this.forwardSpeed > 0 && this.isGrounded) {
            // Coast deceleration
            this.velocity.addScaledVector(forward, -p.coastDeceleration * dt);
            if (this.forwardSpeed < 0) this.velocity.set(0, 0, 0);
        }
    }

    updateDriftState(input, dt, right) {
        const p = CONFIG.physics;
        const speed = Math.abs(this.forwardSpeed);

        switch (this.driftState) {
            case 'NONE':
                // Check for drift initiation: drift button + steering + speed
                if (input.drift && speed > p.driftEntrySpeed && Math.abs(this.steeringInput) > 0.5) {
                    this.driftState = 'INITIATING';
                    this.driftDirection = Math.sign(this.steeringInput);
                    this.driftAngle = 0;
                    this.driftTime = 0;
                    this.driftBoostLevel = 0;
                    kartLog.debug('Drift initiating', { direction: this.driftDirection, speed });
                }
                break;

            case 'INITIATING':
                // Build up drift angle
                this.driftAngle += this.driftDirection * 0.4 * dt * 5;
                this.driftAngle = THREE.MathUtils.clamp(this.driftAngle, -Math.PI * 0.5, Math.PI * 0.5);

                // Transition to full drift
                if (Math.abs(this.driftAngle) > 0.3) {
                    this.driftState = 'DRIFTING';
                    kartLog.debug('Drift active', { driftAngle: this.driftAngle });
                }

                // Cancel if drift released early
                if (!input.drift) {
                    this.driftState = 'EXITING';
                }
                break;

            case 'DRIFTING':
                this.driftTime += dt;
                const tp = p.trackPhysics;

                // Charge boost based on drift time
                for (let i = 0; i < p.driftBoostLevels.length; i++) {
                    if (this.driftTime >= p.driftBoostLevels[i]) {
                        this.driftBoostLevel = i + 1;
                    }
                }

                // Counter-steering affects drift angle
                const counterSteer = -this.steeringInput * this.driftDirection;
                if (counterSteer > 0) {
                    // Active countersteer: tighten drift
                    this.driftAngle -= counterSteer * p.driftCounterSteer * dt;
                } else {
                    // Steer into drift: widen drift angle
                    this.driftAngle += Math.abs(this.steeringInput) * p.driftCounterSteer * dt * 0.5;
                }

                // R4-style yaw damping: prevents oscillation, makes drift stable
                this.driftAngle *= (1 - tp.driftYawDamping * dt);

                // R4-style subtle countersteer assist at extreme angles
                if (Math.abs(this.driftAngle) > 0.5) {
                    const assistForce = -Math.sign(this.driftAngle) * tp.driftCountersteerAssist;
                    this.driftAngle += assistForce * dt;
                }

                // Maintain minimum drift angle
                const minAngle = 0.15;
                const maxAngle = Math.PI * 0.45;
                if (Math.abs(this.driftAngle) < minAngle) {
                    this.driftAngle = minAngle * this.driftDirection;
                }

                // Clamp drift angle
                this.driftAngle = THREE.MathUtils.clamp(this.driftAngle, -maxAngle, maxAngle);

                // Only apply world-space drift physics if using legacy system
                if (right) {
                    const lateralGripForce = -this.lateralSpeed * p.gripCoefficient * p.driftGripMultiplier;
                    this.velocity.addScaledVector(right, lateralGripForce * dt);
                }

                // Exit conditions
                if (!input.drift || speed < p.driftEntrySpeed * 0.4) {
                    this.driftState = 'EXITING';
                }
                break;

            case 'EXITING':
                // Apply boost if earned
                if (this.driftBoostLevel > 0) {
                    const level = this.driftBoostLevel - 1;
                    this.boostPower = p.driftBoostPower[level];
                    this.boostTimeRemaining = p.driftBoostDuration[level];
                    kartLog.info('Drift boost activated', {
                        level: this.driftBoostLevel,
                        power: this.boostPower,
                        duration: this.boostTimeRemaining
                    });
                }

                // Reset drift state
                this.driftState = 'NONE';
                this.driftDirection = 0;
                this.driftAngle = 0;
                this.driftTime = 0;
                this.driftBoostLevel = 0;
                break;
        }
    }

    applyTractionModel(dt, forward, right, effectiveMaxSpeed) {
        const p = CONFIG.physics;

        if (!this.isGrounded) {
            // Reduced turning in air
            const turnDir = this.forwardSpeed >= 0 ? 1 : -1;
            this.angularVelocity = this.steeringAngle * p.steeringSensitivity * p.airControl * turnDir;
        } else if (Math.abs(this.forwardSpeed) > 5) {
            // Ground turning - arcade style
            const turnDir = this.forwardSpeed > 0 ? 1 : -1;
            this.angularVelocity = this.steeringAngle * p.steeringSensitivity * turnDir;

            // Apply lateral grip (not during drift)
            if (this.driftState !== 'DRIFTING' && this.driftState !== 'INITIATING') {
                const lateralGripForce = -this.lateralSpeed * p.gripCoefficient;
                this.velocity.addScaledVector(right, lateralGripForce * dt);
            }
        } else {
            this.angularVelocity = 0;
        }

        // Update rotation
        this.rotation += this.angularVelocity * dt;
    }

    updateBoost(dt, forward) {
        if (this.boostTimeRemaining > 0) {
            this.boostTimeRemaining -= dt;

            // Apply boost acceleration
            const boostAccel = 200 * dt * (this.boostPower / CONFIG.physics.driftBoostPower[2]);
            this.velocity.addScaledVector(forward, boostAccel);
        } else {
            this.boostPower = 0;
        }
    }

    applyGroundPhysics(groundHeight, groundNormal, dt) {
        const p = CONFIG.physics;

        // Store previous ground normal for ramp detection
        this.previousGroundNormal.copy(this.groundNormal);

        const currentHeight = this.position.y;
        const penetration = groundHeight - currentHeight;

        // Spring-damper suspension
        const springForce = p.groundSpringStiffness * penetration;
        const dampingForce = -p.groundSpringDamping * this.verticalVelocity;
        const totalForce = springForce + dampingForce;

        this.verticalVelocity += totalForce * dt;

        // Check grounded state
        if (penetration > -0.3 && this.verticalVelocity <= 0) {
            this.isGrounded = true;
            this.groundNormal.copy(groundNormal);

            // Snap to ground if very close
            if (penetration > -0.1 && Math.abs(this.verticalVelocity) < 2) {
                this.position.y = groundHeight;
                this.verticalVelocity = 0;
            }
        }

        // Check for ramp launch
        this.checkRampLaunch(groundNormal);
    }

    applyGravity(dt) {
        const p = CONFIG.physics;

        if (!this.isGrounded) {
            this.verticalVelocity -= p.gravity * dt;
            this.verticalVelocity = Math.max(this.verticalVelocity, -p.terminalVelocity);
        }

        this.position.y += this.verticalVelocity * dt;
    }

    checkRampLaunch(currentNormal) {
        const p = CONFIG.physics;

        if (!this.isGrounded) return;
        if (Math.abs(this.forwardSpeed) < p.rampSpeedThreshold) return;

        // Calculate slope angles
        const prevAngle = Math.acos(THREE.MathUtils.clamp(this.previousGroundNormal.y, -1, 1));
        const currAngle = Math.acos(THREE.MathUtils.clamp(currentNormal.y, -1, 1));
        const angleChange = prevAngle - currAngle;

        // Check if going uphill and leaving a ramp
        const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
        const slopeDir = new THREE.Vector3(this.previousGroundNormal.x, 0, this.previousGroundNormal.z).normalize();
        const goingUphill = forward.dot(slopeDir) < -0.3;

        if (angleChange > p.minRampAngle && goingUphill && currAngle < prevAngle * 0.5) {
            // Launch!
            const effectiveAngle = Math.min(prevAngle, 0.7);
            const launchPower = Math.abs(this.forwardSpeed) * p.rampLaunchMultiplier;

            this.verticalVelocity = launchPower * Math.sin(effectiveAngle);
            this.isGrounded = false;

            kartLog.info('Ramp launch', { launchVelocity: this.verticalVelocity, speed: this.forwardSpeed });
        }
    }

    applyCollision(normal, penetration) {
        const p = CONFIG.physics;

        // Push out of wall
        this.position.addScaledVector(normal, penetration + 0.1);

        // Calculate velocity direction
        const velocityDir = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));

        // Dot product to determine impact angle
        const impactAngle = velocityDir.dot(normal);

        if (impactAngle > p.glanceAngleThreshold) {
            return; // Moving away from wall
        }

        const speed = Math.abs(this.forwardSpeed);
        const impactSeverity = Math.abs(impactAngle);

        if (speed > p.minBounceSpeed && impactSeverity > 0.5) {
            // Significant impact - apply bounce
            const reflection = velocityDir.clone().sub(normal.clone().multiplyScalar(2 * impactAngle));
            this.rotation = Math.atan2(reflection.x, reflection.z);

            // Apply speed loss with bounce
            const speedLoss = p.wallSpeedLoss * (1 - impactSeverity * (1 - p.wallBounce));
            this.velocity.multiplyScalar(speedLoss);

            kartLog.debug('Wall bounce', { impactAngle, speedLoss });
        } else {
            // Glancing hit - slide along wall
            const slideDir = velocityDir.clone().sub(normal.clone().multiplyScalar(impactAngle)).normalize();
            if (slideDir.length() > 0.1) {
                this.rotation = Math.atan2(slideDir.x, slideDir.z);
            }
            this.velocity.multiplyScalar(p.wallSpeedLoss + (1 - p.wallSpeedLoss) * (1 - impactSeverity));
        }
    }

    updateVisuals(input, dt) {
        // Update mesh position
        this.mesh.position.copy(this.position);

        // Calculate visual yaw (add drift angle during drift)
        // Update orientation to align with terrain (uses KartVisuals)
        KartVisuals.updateOrientation(this, dt);

        // Apply quaternion-based orientation
        if (this.orientationQuat) {
            this.mesh.quaternion.copy(this.orientationQuat);

            // Apply drift angle offset when drifting
            if (this.driftState === 'DRIFTING' || this.driftState === 'INITIATING') {
                _driftQuat.setFromAxisAngle(_yAxis, this.driftAngle * 0.7);
                this.mesh.quaternion.multiply(_driftQuat);
            }
        } else {
            // Fallback to simple rotation
            this.mesh.rotation.set(0, this.rotation, 0);
        }

        // Animate wheels, suspension, and particles (uses KartVisuals)
        KartVisuals.updateSuspension(this, dt);
        KartVisuals.updateWheelVisuals(this, dt);
        KartVisuals.updateDriftParticles(this.driftParticles, this, dt);
        KartVisuals.updateSparkParticles(this.sparkParticles, this, dt);
        KartVisuals.updateBoostFlame(this.boostFlame, this, dt);
    }

    reset(position, rotation) {
        this.position.copy(position);
        this.rotation = rotation;
        this.velocity.set(0, 0, 0);
        this.verticalVelocity = 0;
        this.angularVelocity = 0;
        this.steeringInput = 0;
        this.steeringAngle = 0;
        this.isGrounded = true;
        this.groundNormal.set(0, 1, 0);
        this.previousGroundNormal.set(0, 1, 0);

        // Track-relative physics state
        this.trackFrame = new TrackFrame();
        this.previousTrackFrame = null;
        this.lastTrackT = 0;
        this.localVelocity.set(0, 0, 0);
        this.surfaceAttached = true;
        this.airTime = 0;
        this.timeSinceLastLaunch = 1;

        this.driftState = 'NONE';
        this.driftDirection = 0;
        this.driftAngle = 0;
        this.driftTime = 0;
        this.driftBoostLevel = 0;
        this.boostTimeRemaining = 0;
        this.boostPower = 0;
        this.pitch = 0;
        this.roll = 0;
        this.speed = 0;
        this.forwardSpeed = 0;
        this.lateralSpeed = 0;
        this.isDrifting = false;

        // Reset body dynamics state
        this.bodyRoll = 0;
        this.bodyPitch = 0;
        this.lateralG = 0;
        this.longitudinalG = 0;
        this.lastForwardSpeed = 0;
        this.weightFront = 0.5;
        this.currentSlipAngle = 0;
        this.currentGripMultiplier = 1;

        // Reset brake sliding state
        this.brakeSlipAmount = 0;
        this.isBrakingHard = false;

        // Reset orientation quaternions
        if (this.orientationQuat) {
            this.orientationQuat.identity();
        }
        if (this.baseOrientationQuat) {
            this.baseOrientationQuat.identity();
        }

        this.mesh.position.copy(position);
        this.mesh.rotation.set(0, rotation, 0);
    }

    dispose() {
        this.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.mesh.parent?.remove(this.mesh);

        // Clean up visual effects (uses KartVisuals)
        KartVisuals.disposeVisuals(this);
    }
}

export default Kart;
