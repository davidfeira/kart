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
        coastDeceleration: 15,            // Reduced - cars coast longer like R4/GTA

        // Braking physics (R4/GTA style sliding)
        braking: {
            maxBrakeForce: 120,           // Maximum braking force (reduced for longer stops)
            minBrakeForce: 40,            // Minimum braking force at low speed
            brakeSpeedFalloff: 0.4,       // Braking reduction at high speed (0-1)
            brakeFalloffStart: 30,        // Speed where falloff begins
            brakeSlipThreshold: 0.7,      // Speed ratio that starts causing slip
            brakeSlipGripLoss: 0.5,       // Grip lost when wheels "lock" (0-1)
            brakeSlipBuildRate: 4.0,      // How fast brake slip builds up
            brakeSlipRecoveryRate: 8.0,   // How fast brake slip recovers
            brakeSteerRotation: 0.3,      // Rotation from steering while braking
            brakeRearSlideMultiplier: 1.5, // Extra rear grip loss during slide
            reverseThreshold: 2           // Speed below which brake becomes reverse
        },

        // Steering (more forgiving)
        steeringSensitivity: 2.5,
        maxSteeringAngle: Math.PI * 0.3,
        speedSteeringReduction: 0.45,
        steeringLerpSpeed: 12,

        // Grip and traction
        gripCoefficient: 3.2,
        groundFriction: 0.02,

        // R4-style grip system - E-brake focused drifting
        grip: {
            // Base grip
            baseGrip: 1.0,

            // Speed-induced grip loss (minimal - mostly stable at speed)
            speedGripLossStart: 80,        // Only at very high speed
            speedGripLossMax: 0.08,        // Very small effect

            // Cornering force grip loss (minimal - e-brake is the main drift method)
            corneringForceThreshold: 8000, // Very high - normal turning is stable
            corneringGripLossMax: 0.15,    // Small effect when exceeded

            // Throttle lift-off (small bonus, not a drift trigger)
            liftOffGripBonus: 0.1,         // Small grip bonus
            liftOffTransitionSpeed: 4.0,

            // Brake tap - still works but less aggressive
            brakeTapGripLoss: 0.25,        // Moderate grip loss
            brakeTapDecay: 6.0,            // Fades quickly

            // Throttle reapply - disabled (e-brake is the drift method)
            reapplyGripLoss: 0.0,          // No effect
            reapplyMinLiftTime: 0.15,

            // Recovery - fast so car feels responsive
            gripRecoveryRate: 8.0,         // Very fast recovery
            gripLossRate: 10.0,            // Fast grip loss when e-braking

            // Thresholds
            slideThreshold: 0.55,          // Below this grip = sliding
            fullDriftThreshold: 0.35,      // Below this = full drift mode
            minGrip: 0.2,                  // Minimum grip

            // Slide angle control
            slideAngleBuildRate: 3.0,      // How fast slide angle builds
            slideAngleDamping: 3.5,        // Damping
            counterSteerRate: 4.0,         // Very effective counter-steering
            maxSlideAngle: 0.7,            // ~40 degrees max slide

            // The "snap" exit
            snapAngleReduction: 0.15,      // Quick snap back
            snapDuration: 0.25,
            snapGripBonus: 0.2             // Good grip boost on exit
        },

        // E-brake (primary drift method)
        eBrake: {
            gripLoss: 0.6,                 // Strong grip loss for easy drifts
            speedReduction: 0.92,          // Less speed loss (was 0.85)
            slideAngleBoost: 1.8,          // Stronger slide angle
            recoveryDelay: 0.2             // Quick recovery after release
        },

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
            attachmentThreshold: 1.5,      // Max height above track to stay attached
            attachmentBlendSpeed: 8,       // How fast to blend back to surface
            maxBankingAngle: 0.6,          // ~35 degrees max banking
            gravityAlongTrack: 25,         // Gravity component along slope
            slideYawDamping: 3.0,          // Stabilizes slide angle
            slideCountersteerAssist: 0.15, // Subtle auto-countersteer at extreme angles
            trackSearchRadius: 0.1,        // Initial binary search radius
            trackSearchIterations: 8       // Max iterations for refinement
        },

        // Body dynamics (arcade aggressive - R4 style)
        bodyDynamics: {
            maxBodyRoll: 0.12,             // ~7 degrees max roll - visible but not extreme
            bodyRollSpeed: 18,             // Snappy response and recovery
            rollGSensitivity: 0.008,       // Roll per unit of lateral G (reduced)
            driftRollBonus: 0.10,          // Extra inward roll when drifting (R4 style)
            maxBodyPitch: 0.10,            // ~6 degrees max pitch
            bodyPitchSpeed: 12,            // Snappier pitch response
            pitchAccelSensitivity: 0.0006, // Pitch per unit of acceleration
            airPitchRate: 0.3,             // Nose-down rate when airborne
            maxAirPitch: 0.15              // Max nose-down angle in air
        },

        // Weight transfer (affects grip distribution)
        weightTransfer: {
            transferRate: 4.0,             // How fast weight shifts
            maxTransfer: 0.35,             // Max weight shift (0.5 = all on one axle)
            brakeRearGripLoss: 0.3,        // Rear grip reduction when braking
            accelFrontGripLoss: 0.15       // Front grip reduction when accelerating
        },

        // Slip physics (Pacejka-lite tire model)
        slipPhysics: {
            peakSlipAngle: 0.12,           // Radians where grip peaks
            slipFalloff: 0.5,              // How much grip drops past peak
            minGrip: 0.25,                 // Minimum grip even at max slip
            slipSmoothRate: 15             // How fast slip angle changes
        }
    },
    camera: {
        distance: 5,
        height: 2,
        lookAheadDistance: 3,
        positionDamping: 0.05,
        rotationDamping: 0.04,
        baseFov: 65,
        maxFov: 85,
        fovSpeedScale: 0.5,              // More dramatic FOV change with speed
        boostShakeIntensity: 0.12,

        // Camera juice (R4-style)
        lagFactor: 0.06,                 // Camera trails behind car
        lagRecoverySpeed: 3.0,           // How fast lag catches up
        tiltFactor: 0.25,                // Camera tilts with car roll
        maxTilt: 0.08,                   // Max camera tilt angle
        landingShakeIntensity: 0.08,     // Shake on landing
        shakeDecay: 8,                   // How fast shake fades
        driftCameraOffset: 0.8           // Camera shifts outward during drift
    },
    hoodCam: {
        forwardOffset: 0.3,              // Units in front of kart center
        heightOffset: 0.6,               // Units above kart
        lookAheadDistance: 8,            // How far ahead to look
        fov: 75,                         // Slightly wider for immersion
        shakeMultiplier: 0.3             // Reduced shake to prevent nausea
    },
    race: {
        totalLaps: 3,
        countdownTime: 4
    }
};

export default CONFIG;
