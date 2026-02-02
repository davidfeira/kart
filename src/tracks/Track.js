/**
 * Track Class
 *
 * Represents a complete track with unified mesh and physics.
 * Created from JSON track definitions.
 */

import * as THREE from 'three';
import { Logger } from '../utils/logger.js';
import { TrackFrame } from '../core/TrackFrame.js';

const log = Logger.getLogger('Track');

// Debug frame counter (shared across all Track instances)
let _debugFrameCounter = 0;
const DEBUG_LOG_INTERVAL = 30; // Log every 30 frames (~0.5s at 60fps)

export class Track {
    constructor(data) {
        this.name = data.name || 'Unnamed Track';
        this.theme = data.theme || 'default';
        this.laps = data.laps || 3;

        // Path data
        this.waypoints = data.path.waypoints;
        this.closed = data.path.closed !== false;

        // Track features
        this.surfaces = data.surfaces || [];
        this.features = data.features || [];
        this.hazards = data.hazards || [];
        this.decorations = data.decorations || [];
        this.checkpoints = data.checkpoints || [];

        // Generated data (filled by TrackMeshBuilder)
        this.spline = null;           // THREE.CatmullRomCurve3
        this.mesh = null;             // THREE.Mesh for road surface
        this.edgeMeshes = [];         // Edge/barrier meshes
        this.decorationMeshes = [];   // Decoration objects

        // Physics lookup data (filled by TrackMeshBuilder)
        this.segments = [];           // Array of segment data for physics
        this.totalLength = 0;         // Track length in world units

        log.info('Track created', { name: this.name, waypoints: this.waypoints.length });
    }

    /**
     * Get track frame at parameter t (0-1 along track)
     * Returns position, normal, tangent, width, banking, surface type
     */
    getFrameAt(t) {
        if (!this.spline) return null;

        // Wrap t for closed tracks
        if (this.closed) {
            t = ((t % 1) + 1) % 1;
        } else {
            t = Math.max(0, Math.min(1, t));
        }

        const position = this.spline.getPointAt(t);
        const tangent = this.spline.getTangentAt(t).normalize();

        // Interpolate width and banking from waypoints
        const { width, banking } = this._interpolateWaypointData(t);

        // Calculate normal (up vector rotated by banking)
        // Binormal points to the RIGHT of the track (positive lateral direction)
        const binormal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const normal = new THREE.Vector3(0, 1, 0);

        if (Math.abs(banking) > 0.001) {
            const bankQuat = new THREE.Quaternion();
            // Negative banking rotation to match mesh (positive banking = outer edge UP)
            // This tilts the normal toward the inner edge (away from raised outer)
            bankQuat.setFromAxisAngle(tangent, -banking);
            normal.applyQuaternion(bankQuat);
        }

        // Get surface type at this position
        const surfaceType = this._getSurfaceAt(t);

        // Calculate slope from track elevation change
        const tDelta = 0.005;
        const tBefore = this.closed ? ((t - tDelta + 1) % 1) : Math.max(0, t - tDelta);
        const tAfter = this.closed ? ((t + tDelta) % 1) : Math.min(1, t + tDelta);
        const pBefore = this.spline.getPointAt(tBefore);
        const pAfter = this.spline.getPointAt(tAfter);
        const rise = pAfter.y - pBefore.y;
        const run = Math.sqrt((pAfter.x - pBefore.x) ** 2 + (pAfter.z - pBefore.z) ** 2) || 0.001;
        const slope = Math.atan2(rise, run);

        // Calculate curvature from tangent change
        const tanBefore = this.spline.getTangentAt(tBefore);
        const tanAfter = this.spline.getTangentAt(tAfter);
        const curvatureVec = tanAfter.clone().sub(tanBefore);
        const curvature = curvatureVec.length() / (tDelta * 2);

        return {
            t,
            position,
            tangent,
            normal,
            binormal,
            width,
            banking,
            slope,
            curvature,
            surfaceType
        };
    }

    /**
     * Get TrackFrame at a world position (compatible with old TrackGenerator interface)
     * @param {THREE.Vector3} position - World position to sample
     * @param {number|null} hint - Optional t hint for faster search
     * @returns {TrackFrame} - Frame data for physics
     */
    getTrackFrame(position, hint = null) {
        _debugFrameCounter++;
        const shouldLog = _debugFrameCounter % DEBUG_LOG_INTERVAL === 0;

        const closest = this.findClosestPoint(position, hint);
        if (!closest) return new TrackFrame();

        const frameData = this.getFrameAt(closest.t);
        const frame = new TrackFrame();

        frame.t = closest.t;
        frame.tangent.copy(frameData.tangent);
        frame.normal.copy(frameData.normal);
        frame.binormal.copy(frameData.binormal);
        frame.curvature = frameData.curvature || 0;
        frame.banking = frameData.banking;
        frame.slope = frameData.slope || 0;

        // Calculate position with lateral offset and proper height
        const halfWidth = frameData.width / 2;
        const clampedLateral = Math.max(-halfWidth, Math.min(halfWidth, closest.lateral));

        frame.position.copy(frameData.position);
        frame.position.addScaledVector(frameData.binormal, clampedLateral);

        // Get height from segment data with interpolation for smoothness
        const segmentCount = this.segments.length;
        const rawIndex = closest.t * segmentCount;
        const index0 = Math.floor(rawIndex) % segmentCount;
        const index1 = (index0 + 1) % segmentCount;
        const segmentFrac = rawIndex - Math.floor(rawIndex);

        const seg0 = this.segments[index0];
        const seg1 = this.segments[index1];

        if (seg0 && seg1) {
            const normalizedLateral = clampedLateral / halfWidth; // -1 to 1
            const lateralT = (normalizedLateral + 1) / 2; // 0 to 1

            // Interpolate height at this lateral position from both segments
            const height0 = THREE.MathUtils.lerp(seg0.innerY, seg0.outerY, lateralT);
            const height1 = THREE.MathUtils.lerp(seg1.innerY, seg1.outerY, lateralT);

            // Smooth interpolation between segments + small clearance
            frame.position.y = THREE.MathUtils.lerp(height0, height1, segmentFrac) + 0.15;

            // Debug logging for track frame calculations
            if (shouldLog) {
                const tDelta = hint !== null ? Math.abs(closest.t - hint) : 0;
                log.debug('TrackFrame calc', {
                    t: closest.t.toFixed(4),
                    tDelta: tDelta.toFixed(4),
                    dist: closest.distance.toFixed(2),
                    lateral: closest.lateral.toFixed(2),
                    segIdx: `${index0}->${index1}`,
                    segFrac: segmentFrac.toFixed(2),
                    h0: height0.toFixed(2),
                    h1: height1.toFixed(2),
                    finalY: frame.position.y.toFixed(2),
                    banking: frameData.banking.toFixed(3)
                });
            }
        }

        return frame;
    }

    /**
     * Find closest point on track to a world position
     * Returns { t, distance, lateral } where lateral is signed offset from center
     * Uses hint for stable frame-to-frame tracking (prevents jitter)
     */
    findClosestPoint(position, hint = null) {
        if (!this.spline) return null;

        let bestT;
        let bestDist = Infinity;
        let usedFullSearch = false;

        if (hint !== null) {
            // When hint provided, use narrow search for stability
            // Car typically moves ~0.002-0.01 t units per frame at normal speed
            const searchRadius = 0.03; // Tight search around hint
            const steps = 30;

            // Search around hint
            for (let i = 0; i <= steps; i++) {
                let t = hint - searchRadius + (2 * searchRadius) * (i / steps);
                if (this.closed) t = ((t % 1) + 1) % 1;
                else t = Math.max(0, Math.min(1, t));

                const point = this.spline.getPointAt(t);
                const dist = position.distanceTo(point);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestT = t;
                }
            }

            // If we're far from track, fall back to wider search
            if (bestDist > 30) {
                log.warn('Track search fallback - far from track', {
                    hint: hint.toFixed(4),
                    bestDist: bestDist.toFixed(2),
                    pos: `${position.x.toFixed(1)},${position.y.toFixed(1)},${position.z.toFixed(1)}`
                });
                bestT = null;
                bestDist = Infinity;
                usedFullSearch = true;
            }
        }

        // Full search if no hint or hint search failed
        if (bestT === undefined || bestT === null) {
            usedFullSearch = true;
            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const point = this.spline.getPointAt(t);
                const dist = position.distanceTo(point);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestT = t;
                }
            }
        }

        // Fine refinement using binary search style narrowing
        // Much more stable than linear search
        let searchRange = 0.005;
        for (let iteration = 0; iteration < 3; iteration++) {
            const tMinus = this.closed ? ((bestT - searchRange + 1) % 1) : Math.max(0, bestT - searchRange);
            const tPlus = this.closed ? ((bestT + searchRange) % 1) : Math.min(1, bestT + searchRange);

            const pMinus = this.spline.getPointAt(tMinus);
            const pPlus = this.spline.getPointAt(tPlus);

            const distMinus = position.distanceTo(pMinus);
            const distPlus = position.distanceTo(pPlus);

            if (distMinus < bestDist) {
                bestDist = distMinus;
                bestT = tMinus;
            } else if (distPlus < bestDist) {
                bestDist = distPlus;
                bestT = tPlus;
            }

            searchRange *= 0.5;
        }

        // Log significant t jumps (likely cause of jitter)
        if (hint !== null && !usedFullSearch) {
            let tDelta = Math.abs(bestT - hint);
            // Handle wrap-around for closed tracks
            if (this.closed && tDelta > 0.5) {
                tDelta = 1 - tDelta;
            }
            // Log if t jumped more than expected (>0.02 is suspicious)
            if (tDelta > 0.02) {
                log.warn('Track t-value jump detected', {
                    hint: hint.toFixed(4),
                    bestT: bestT.toFixed(4),
                    delta: tDelta.toFixed(4),
                    dist: bestDist.toFixed(2)
                });
            }
        }

        // Calculate lateral offset
        const frame = this.getFrameAt(bestT);
        const toPos = new THREE.Vector3().subVectors(position, frame.position);
        const lateral = toPos.dot(frame.binormal);

        return {
            t: bestT,
            distance: bestDist,
            lateral,
            frame
        };
    }

    /**
     * Get the exact surface height at a world XZ position
     * Uses the segment vertex data for accurate height
     */
    getSurfaceHeight(position, trackT = null) {
        const closest = trackT !== null
            ? { t: trackT, frame: this.getFrameAt(trackT) }
            : this.findClosestPoint(position);

        if (!closest || !closest.frame) return null;

        const frame = closest.frame;
        const toPos = new THREE.Vector3().subVectors(position, frame.position);
        const lateral = toPos.dot(frame.binormal);

        // Clamp lateral to track width
        const halfWidth = frame.width / 2;
        const clampedLateral = Math.max(-halfWidth, Math.min(halfWidth, lateral));
        const normalizedLateral = clampedLateral / halfWidth; // -1 to 1

        // Find the segment for this t value
        const segmentIndex = Math.floor(closest.t * this.segments.length) % this.segments.length;
        const segment = this.segments[segmentIndex];

        if (segment) {
            // Interpolate between inner and outer edge heights
            const innerHeight = segment.innerY;
            const outerHeight = segment.outerY;
            const t = (normalizedLateral + 1) / 2; // 0 at inner, 1 at outer
            return THREE.MathUtils.lerp(innerHeight, outerHeight, t);
        }

        // Fallback to frame position
        return frame.position.y;
    }

    /**
     * Check if position is on track
     */
    isOnTrack(position) {
        const closest = this.findClosestPoint(position);
        if (!closest) return false;

        const halfWidth = closest.frame.width / 2;
        return Math.abs(closest.lateral) <= halfWidth;
    }

    /**
     * Get track boundary collision data
     * Compatible with old TrackGenerator.getTrackBoundaryCollision()
     */
    getTrackBoundaryCollision(position, radius) {
        const closest = this.findClosestPoint(position);
        if (!closest) return { collision: false };

        const halfWidth = closest.frame.width / 2;
        const distFromEdge = halfWidth - Math.abs(closest.lateral);

        if (distFromEdge < radius) {
            // Collision with edge
            const penetration = radius - distFromEdge;
            const side = closest.lateral > 0 ? 1 : -1;

            // Normal points inward (toward track center)
            const normal = closest.frame.binormal.clone().multiplyScalar(-side);

            return {
                collision: true,
                normal,
                penetration
            };
        }

        return { collision: false };
    }

    /**
     * Get start position and rotation for race
     */
    getStartPosition() {
        const frame = this.getFrameAt(0);
        if (!frame) return { position: new THREE.Vector3(), rotation: 0 };

        // Position slightly above track surface
        const position = frame.position.clone();
        position.y += 0.5;

        // Rotation from tangent direction
        const rotation = Math.atan2(frame.tangent.x, frame.tangent.z);

        return { position, rotation };
    }

    /**
     * Get checkpoint world positions for CheckpointManager
     */
    getCheckpointPositions() {
        return this.checkpoints.map(t => {
            const frame = this.getFrameAt(t);
            // direction = forward (tangent), right = binormal
            const right = new THREE.Vector3(-frame.tangent.z, 0, frame.tangent.x).normalize();
            return {
                t,
                position: frame.position.clone(),
                direction: frame.tangent.clone(),
                right,
                width: frame.width
            };
        });
    }

    /**
     * Interpolate width and banking from waypoint data
     */
    _interpolateWaypointData(t) {
        const n = this.waypoints.length;
        const scaledT = t * n;
        const i0 = Math.floor(scaledT) % n;
        const i1 = (i0 + 1) % n;
        const frac = scaledT - Math.floor(scaledT);

        const wp0 = this.waypoints[i0];
        const wp1 = this.waypoints[i1];

        const width = THREE.MathUtils.lerp(
            wp0.width || 20,
            wp1.width || 20,
            frac
        );

        const banking = THREE.MathUtils.lerp(
            wp0.banking || 0,
            wp1.banking || 0,
            frac
        );

        return { width, banking };
    }

    /**
     * Get surface type at track parameter
     */
    _getSurfaceAt(t) {
        for (const surface of this.surfaces) {
            if (t >= surface.start && t < surface.end) {
                return surface.type;
            }
        }
        return 'road';
    }

    /**
     * Add mesh to scene
     */
    addToScene(scene) {
        if (this.mesh) {
            scene.add(this.mesh);
        }
        for (const edge of this.edgeMeshes) {
            scene.add(edge);
        }
        for (const deco of this.decorationMeshes) {
            scene.add(deco);
        }
    }

    /**
     * Remove from scene and dispose resources
     */
    dispose(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (this.mesh.material.dispose) this.mesh.material.dispose();
        }
        for (const edge of this.edgeMeshes) {
            scene.remove(edge);
            edge.geometry.dispose();
            if (edge.material.dispose) edge.material.dispose();
        }
        for (const deco of this.decorationMeshes) {
            scene.remove(deco);
            // Decorations may have complex disposal needs
        }

        log.info('Track disposed', { name: this.name });
    }
}

export default Track;
