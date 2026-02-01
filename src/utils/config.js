/**
 * Game Configuration
 *
 * Central configuration object for physics, camera, and race settings.
 * Extracted from index.html during refuckulation.
 */

export const CONFIG = {
    physics: {
        // Movement (slowed down for mobile)
        maxSpeed: 90,
        reverseMaxSpeed: 25,
        accelerationForce: 180,
        brakeForce: 300,
        coastDeceleration: 60,

        // Steering (more forgiving)
        steeringSensitivity: 2.5,
        maxSteeringAngle: Math.PI * 0.3,
        speedSteeringReduction: 0.45,
        steeringLerpSpeed: 12,

        // Grip and traction
        gripCoefficient: 3.2,
        groundFriction: 0.02,

        // Drift (Ridge Racer style)
        driftEntrySpeed: 40,
        driftGripMultiplier: 0.4,
        driftCounterSteer: 0.6,
        driftBoostLevels: [0.8, 1.6, 2.5],
        driftBoostPower: [15, 30, 50],
        driftBoostDuration: [0.4, 0.7, 1.0],

        // Ground following (spring-damper)
        groundSpringStiffness: 500,
        groundSpringDamping: 30,

        // Gravity and air
        gravity: 35,
        terminalVelocity: 50,
        airControl: 0.3,

        // Ramps
        rampLaunchMultiplier: 0.5,
        minRampAngle: 0.15,
        rampSpeedThreshold: 40,

        // Walls
        wallBounce: 0.5,
        wallSpeedLoss: 0.7,
        minBounceSpeed: 15,
        glanceAngleThreshold: 0.3,

        // Track-relative physics (R4 style)
        trackPhysics: {
            attachmentThreshold: 0.5,      // Max height above track to stay attached
            attachmentBlendSpeed: 8,       // How fast to blend back to surface
            maxBankingAngle: 0.6,          // ~35 degrees max banking
            gravityAlongTrack: 25,         // Gravity component along slope
            driftYawDamping: 3.0,          // Stabilizes drift angle
            driftCountersteerAssist: 0.15, // Subtle auto-countersteer
            driftRearGripMultiplier: 0.25, // Rear grip during drift
            trackSearchRadius: 0.1,        // Initial binary search radius
            trackSearchIterations: 8       // Max iterations for refinement
        }
    },
    camera: {
        distance: 5,
        height: 2,
        lookAheadDistance: 3,
        positionDamping: 0.05,
        rotationDamping: 0.04,
        baseFov: 65,
        maxFov: 80,
        fovSpeedScale: 0.3,
        boostShakeIntensity: 0.1
    },
    race: {
        totalLaps: 3,
        countdownTime: 4
    }
};

export default CONFIG;
