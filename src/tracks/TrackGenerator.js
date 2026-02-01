/**
 * Track Generator
 *
 * Procedurally generates race tracks with road mesh, barriers,
 * checkpoints, and collision geometry.
 * Extracted from index.html during refuckulation.
 *
 * Geometry helpers are in TrackGeometry.js.
 */

import * as THREE from 'three';
import { Logger } from '../utils/logger.js';
import { CONFIG } from '../utils/config.js';
import { TRACK_PRESETS } from './trackPresets.js';
import { TrackFrame } from '../core/TrackFrame.js';
import * as TrackGeometry from './TrackGeometry.js';

const trackLog = Logger.getLogger('Track');

export class TrackGenerator {
    constructor(scene) {
        this.scene = scene;
        this.trackMesh = null;
        this.barrierMeshes = [];
        this.barrierColliders = [];
        this.groundMesh = null;
        this.checkpoints = [];
        this.trackPath = null;
        this.trackWidth = 36;
        this.innerPoints = [];
        this.outerPoints = [];
    }

    generate(trackKey) {
        this.clear();
        trackLog.info('Generating track', { trackKey });

        const preset = TRACK_PRESETS[trackKey];
        const pathPoints = preset.generatePath();

        this.trackPath = new THREE.CatmullRomCurve3(pathPoints, true);

        this.generateRoadMesh();
        this.generateBarriers();
        this.generateStadiumLights();
        this.generateGround();
        this.generateCheckpoints();
        this.generateStartLine();

        trackLog.info('Track generated', {
            trackName: preset.name,
            pathPoints: pathPoints.length,
            checkpoints: this.checkpoints.length
        });

        return {
            startPosition: this.getStartPosition(),
            startRotation: this.getStartRotation(),
            checkpoints: this.checkpoints
        };
    }

    generateRoadMesh() {
        // Generate geometry with banking (uses TrackGeometry)
        const result = TrackGeometry.generateRoadGeometry(this.trackPath, this.trackWidth);
        this.innerPoints = result.innerPoints;
        this.outerPoints = result.outerPoints;
        this.trackCurvatures = result.curvatures;

        // Create texture and material (uses TrackGeometry)
        const texture = TrackGeometry.createRoadTexture();
        const material = TrackGeometry.createRoadMaterial(texture);

        this.trackMesh = new THREE.Mesh(result.geometry, material);
        this.trackMesh.receiveShadow = true;
        this.scene.add(this.trackMesh);
    }

    generateBarriers() {
        const barrierRadius = 0.45;

        // Use TrackGeometry helpers
        const tireGeom = TrackGeometry.createTireGeometry();
        const tireMat = TrackGeometry.createTireMaterial();

        this.barrierColliders = [];

        [this.innerPoints, this.outerPoints].forEach((points, side) => {
            const isInner = side === 0;

            for (let i = 0; i < points.length - 1; i += 4) {
                const p = points[i];
                const next = points[Math.min(i + 1, points.length - 1)];

                const barrierPos = new THREE.Vector3(
                    p.x + (next.x - p.x) * 0.5,
                    0.45,
                    p.z + (next.z - p.z) * 0.5
                );

                const tangent = new THREE.Vector3(next.x - p.x, 0, next.z - p.z).normalize();
                const normal = new THREE.Vector3(tangent.z, 0, -tangent.x);
                if (isInner) normal.negate();

                this.barrierColliders.push({
                    position: barrierPos.clone(),
                    radius: barrierRadius,
                    normal: normal
                });

                const tire = new THREE.Mesh(tireGeom, tireMat);
                tire.position.copy(barrierPos);
                tire.position.y = 0.3;
                tire.rotation.x = Math.PI / 2;
                tire.castShadow = true;
                this.scene.add(tire);
                this.barrierMeshes.push(tire);

                const tire2 = tire.clone();
                tire2.position.y = 0.6;
                this.scene.add(tire2);
                this.barrierMeshes.push(tire2);
            }
        });

        trackLog.debug('Barrier colliders created', { count: this.barrierColliders.length });
    }

    generateStadiumLights() {
        // Use TrackGeometry helpers
        const poleGeometry = TrackGeometry.createLightPoleGeometry();
        const poleMaterial = TrackGeometry.createLightPoleMaterial();
        const lightGeometry = TrackGeometry.createLightFixtureGeometry();
        const lightMaterial = TrackGeometry.createLightFixtureMaterial();

        const numLights = Math.floor(this.outerPoints.length / 15);

        for (let i = 0; i < numLights; i++) {
            const idx = Math.floor(i * this.outerPoints.length / numLights);
            const point = this.outerPoints[idx];
            const nextIdx = (idx + 1) % this.outerPoints.length;
            const nextPoint = this.outerPoints[nextIdx];

            const tangent = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            const outward = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            const polePos = point.clone().addScaledVector(outward, 6);
            polePos.y = 7.5;

            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.copy(polePos);
            pole.castShadow = true;
            this.scene.add(pole);
            this.barrierMeshes.push(pole);

            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.copy(polePos);
            light.position.y = 15.5;
            light.rotation.y = Math.atan2(tangent.x, tangent.z);
            this.scene.add(light);
            this.barrierMeshes.push(light);
        }
    }

    generateGround() {
        // Ground removed - floating track aesthetic
    }

    generateCheckpoints() {
        const numCheckpoints = 8;
        this.checkpoints = [];

        for (let i = 0; i < numCheckpoints; i++) {
            const t = i / numCheckpoints;
            const point = this.trackPath.getPointAt(t);
            const tangent = this.trackPath.getTangentAt(t);
            const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

            this.checkpoints.push({
                position: point.clone(),
                direction: tangent.clone(),
                right: right.clone(),
                width: this.trackWidth,
                index: i,
                isFinishLine: i === 0
            });
        }
    }

    generateStartLine() {
        const startPoint = this.trackPath.getPointAt(0);
        const tangent = this.trackPath.getTangentAt(0);

        const lineGeom = new THREE.PlaneGeometry(this.trackWidth, 2);

        // Use TrackGeometry helpers
        const texture = TrackGeometry.createStartLineTexture();
        const lineMat = TrackGeometry.createStartLineMaterial(texture);

        const line = new THREE.Mesh(lineGeom, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.copy(startPoint);
        line.position.y = 0.1;
        line.rotation.z = Math.atan2(tangent.x, tangent.z);
        this.scene.add(line);
        this.barrierMeshes.push(line);
    }

    getStartPosition() {
        const point = this.trackPath.getPointAt(0.02);
        return new THREE.Vector3(point.x, point.y + 0.5, point.z);
    }

    getStartRotation() {
        const tangent = this.trackPath.getTangentAt(0.02);
        return Math.atan2(tangent.x, tangent.z);
    }

    findClosestT(position, lastT = null) {
        const tp = CONFIG.physics.trackPhysics;

        let bestT = lastT !== null ? lastT : 0.5;
        let searchRange = lastT !== null ? tp.trackSearchRadius : 0.5;

        const xzDistSq = (p) => {
            const dx = position.x - p.x;
            const dz = position.z - p.z;
            return dx * dx + dz * dz;
        };

        for (let i = 0; i < tp.trackSearchIterations; i++) {
            const tLeft = (bestT - searchRange + 1) % 1;
            const tRight = (bestT + searchRange) % 1;

            const pLeft = this.trackPath.getPointAt(tLeft);
            const pCenter = this.trackPath.getPointAt(bestT);
            const pRight = this.trackPath.getPointAt(tRight);

            const dLeft = xzDistSq(pLeft);
            const dCenter = xzDistSq(pCenter);
            const dRight = xzDistSq(pRight);

            if (dLeft < dCenter && dLeft < dRight) {
                bestT = tLeft;
            } else if (dRight < dCenter) {
                bestT = tRight;
            }

            searchRange *= 0.5;
        }

        return bestT;
    }

    getTrackFrame(position, lastT = null) {
        const frame = new TrackFrame();
        const tp = CONFIG.physics.trackPhysics;

        frame.t = this.findClosestT(position, lastT);

        const centerPoint = this.trackPath.getPointAt(frame.t);

        frame.tangent.copy(this.trackPath.getTangentAt(frame.t));

        const tDelta = 0.005;
        const tBefore = (frame.t - tDelta + 1) % 1;
        const tAfter = (frame.t + tDelta) % 1;
        const tanBefore = this.trackPath.getTangentAt(tBefore);
        const tanAfter = this.trackPath.getTangentAt(tAfter);

        const curvatureVec = tanAfter.clone().sub(tanBefore);
        frame.curvature = curvatureVec.length() / (tDelta * 2);

        const crossY = frame.tangent.x * curvatureVec.z - frame.tangent.z * curvatureVec.x;
        frame.banking = Math.min(frame.curvature * 0.15, tp.maxBankingAngle);
        frame.banking *= Math.sign(crossY);

        const pAhead = this.trackPath.getPointAt(tAfter);
        const pBehind = this.trackPath.getPointAt(tBefore);
        const rise = pAhead.y - pBehind.y;
        const run = Math.sqrt(
            (pAhead.x - pBehind.x) ** 2 +
            (pAhead.z - pBehind.z) ** 2
        ) || 0.001;
        frame.slope = Math.atan2(rise, run);

        const worldUp = new THREE.Vector3(0, 1, 0);

        const bankQuat = new THREE.Quaternion();
        bankQuat.setFromAxisAngle(frame.tangent, frame.banking);

        const binormalFlat = new THREE.Vector3(-frame.tangent.z, 0, frame.tangent.x).normalize();
        const slopeQuat = new THREE.Quaternion();
        slopeQuat.setFromAxisAngle(binormalFlat, frame.slope);

        frame.normal.copy(worldUp);
        frame.normal.applyQuaternion(slopeQuat);
        frame.normal.applyQuaternion(bankQuat);
        frame.normal.normalize();

        frame.binormal.crossVectors(frame.tangent, frame.normal).normalize();

        const toKart = new THREE.Vector3().subVectors(position, centerPoint);
        const lateralOffset = toKart.dot(frame.binormal);

        frame.position.copy(centerPoint);
        frame.position.addScaledVector(frame.binormal, lateralOffset);
        frame.position.y += Math.abs(lateralOffset) * Math.sin(Math.abs(frame.banking));

        return frame;
    }

    getClosestPointOnTrack(position) {
        let closest = null;
        let minDist = Infinity;
        let closestT = 0;

        for (let t = 0; t < 1; t += 0.01) {
            const point = this.trackPath.getPointAt(t);
            const dx = position.x - point.x;
            const dz = position.z - point.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
                closestT = t;
            }
        }

        return { point: closest, t: closestT, distance: minDist };
    }

    getTrackHeightAt(position) {
        const result = this.getClosestPointOnTrack(position);
        return result.point ? result.point.y : 0;
    }

    getGroundInfo(position) {
        const result = this.getClosestPointOnTrack(position);

        if (!result.point) {
            return { found: false };
        }

        const tangent = this.trackPath.getTangentAt(result.t);

        const tAhead = (result.t + 0.01) % 1;
        const tBehind = (result.t - 0.01 + 1) % 1;
        const pointAhead = this.trackPath.getPointAt(tAhead);
        const pointBehind = this.trackPath.getPointAt(tBehind);

        const segmentLength = pointAhead.distanceTo(pointBehind) || 1;
        const forwardSlope = (pointAhead.y - pointBehind.y) / segmentLength;

        const normal = new THREE.Vector3(
            -tangent.x * forwardSlope,
            1,
            -tangent.z * forwardSlope
        ).normalize();

        return {
            found: true,
            point: result.point,
            height: result.point.y,
            normal: normal,
            distance: Math.abs(position.y - result.point.y),
            trackT: result.t
        };
    }

    isOnTrack(position) {
        const result = this.getClosestPointOnTrack(position);
        return result.distance < this.trackWidth / 2 + 2;
    }

    getTrackBoundaryCollision(position, radius) {
        const result = this.getClosestPointOnTrack(position);
        const halfWidth = this.trackWidth / 2;

        const barrierCollision = this.checkBarrierCollisions(position, radius);
        if (barrierCollision) {
            barrierCollision.trackHeight = result.point ? result.point.y : 0;
            return barrierCollision;
        }

        if (result.distance > halfWidth - radius) {
            const toCenter = new THREE.Vector3(
                result.point.x - position.x,
                0,
                result.point.z - position.z
            ).normalize();

            const penetration = result.distance - (halfWidth - radius);
            return {
                collision: true,
                normal: toCenter,
                penetration: penetration,
                trackHeight: result.point.y
            };
        }

        return { collision: false, trackHeight: result.point ? result.point.y : 0 };
    }

    checkBarrierCollisions(position, radius) {
        for (const barrier of this.barrierColliders) {
            const dx = position.x - barrier.position.x;
            const dz = position.z - barrier.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const minDist = radius + barrier.radius;

            if (distance < minDist) {
                const normal = new THREE.Vector3(dx, 0, dz);
                if (normal.length() > 0.001) {
                    normal.normalize();
                } else {
                    normal.copy(barrier.normal);
                }

                return {
                    collision: true,
                    normal: normal,
                    penetration: minDist - distance
                };
            }
        }
        return null;
    }

    clear() {
        if (this.trackMesh) {
            this.trackMesh.geometry.dispose();
            this.trackMesh.material.dispose();
            this.scene.remove(this.trackMesh);
        }

        this.barrierMeshes.forEach(mesh => {
            mesh.geometry?.dispose();
            mesh.material?.dispose();
            this.scene.remove(mesh);
        });
        this.barrierMeshes = [];
        this.barrierColliders = [];

        if (this.groundMesh) {
            this.groundMesh.geometry.dispose();
            this.groundMesh.material.dispose();
            this.scene.remove(this.groundMesh);
        }

        this.checkpoints = [];
    }
}

export default TrackGenerator;
