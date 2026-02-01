/**
 * Track Geometry Helpers
 *
 * Static helper functions for creating track textures and meshes.
 * Extracted from TrackGenerator.js during refuckulation.
 */

import * as THREE from 'three';

/**
 * Creates the road surface texture with racing line and markings
 */
export function createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base asphalt color
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, 128, 512);

    // Racing line (subtle darker line)
    const racingLineGradient = ctx.createLinearGradient(45, 0, 55, 0);
    racingLineGradient.addColorStop(0, '#3a3a3a');
    racingLineGradient.addColorStop(0.5, '#2a2a2a');
    racingLineGradient.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = racingLineGradient;
    ctx.fillRect(45, 0, 10, 512);

    // Center line (dashed yellow)
    ctx.fillStyle = '#ffff00';
    for (let y = 0; y < 512; y += 32) {
        ctx.fillRect(60, y, 8, 20);
    }

    // Edge lines (white)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 0, 4, 512);
    ctx.fillRect(120, 0, 4, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
}

/**
 * Creates the checkered start/finish line texture
 */
export function createStartLineTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const squareSize = 16;
    for (let x = 0; x < 128; x += squareSize) {
        for (let y = 0; y < 32; y += squareSize) {
            ctx.fillStyle = ((x + y) / squareSize) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(x, y, squareSize, squareSize);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

/**
 * Creates tire barrier geometry
 */
export function createTireGeometry() {
    return new THREE.TorusGeometry(0.3, 0.15, 8, 16);
}

/**
 * Creates tire barrier material
 */
export function createTireMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9
    });
}

/**
 * Creates stadium light pole geometry
 */
export function createLightPoleGeometry() {
    return new THREE.CylinderGeometry(0.3, 0.4, 15, 8);
}

/**
 * Creates stadium light pole material
 */
export function createLightPoleMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7,
        metalness: 0.3
    });
}

/**
 * Creates stadium light fixture geometry
 */
export function createLightFixtureGeometry() {
    return new THREE.BoxGeometry(3, 0.5, 0.5);
}

/**
 * Creates stadium light fixture material (emissive)
 */
export function createLightFixtureMaterial() {
    return new THREE.MeshStandardMaterial({
        color: 0xffff99,
        emissive: 0xffff66,
        emissiveIntensity: 0.8,
        roughness: 0.3
    });
}

/**
 * Creates road surface material with the given texture
 */
export function createRoadMaterial(texture) {
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1
    });
}

/**
 * Creates start line material with the given texture
 */
export function createStartLineMaterial(texture) {
    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5
    });
}

/**
 * Calculates curvature values along a track path
 * @param {THREE.CatmullRomCurve3} trackPath - The track spline
 * @param {number} segments - Number of segments
 * @returns {number[]} Array of curvature values
 */
export function calculateCurvatures(trackPath, segments) {
    const curvatures = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const tBefore = Math.max(0, (i - 1) / segments);
        const tAfter = Math.min(1, (i + 1) / segments);

        const pBefore = trackPath.getPointAt(tBefore);
        const pCurrent = trackPath.getPointAt(t);
        const pAfter = trackPath.getPointAt(tAfter);

        const v1 = new THREE.Vector3().subVectors(pCurrent, pBefore).normalize();
        const v2 = new THREE.Vector3().subVectors(pAfter, pCurrent).normalize();
        const curvature = v1.cross(v2).y;
        curvatures.push(curvature);
    }

    return curvatures;
}

/**
 * Generates road mesh geometry with banking
 * @param {THREE.CatmullRomCurve3} trackPath - The track spline
 * @param {number} trackWidth - Width of the track
 * @param {number} segments - Number of segments
 * @returns {{ geometry: THREE.BufferGeometry, innerPoints: THREE.Vector3[], outerPoints: THREE.Vector3[], curvatures: number[] }}
 */
export function generateRoadGeometry(trackPath, trackWidth, segments = 200) {
    const halfWidth = trackWidth / 2;
    const positions = [];
    const indices = [];
    const uvs = [];
    const innerPoints = [];
    const outerPoints = [];

    // Calculate curvatures for banking
    const curvatures = calculateCurvatures(trackPath, segments);

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = trackPath.getPointAt(t);
        const tangent = trackPath.getTangentAt(t);

        const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const inner = point.clone().addScaledVector(right, -halfWidth);
        const outer = point.clone().addScaledVector(right, halfWidth);

        // Slight elevation above ground
        inner.y += 0.05;
        outer.y += 0.05;

        // Apply banking based on curvature
        const bankingHeight = Math.abs(curvatures[i]) * halfWidth * 0.4;
        if (curvatures[i] > 0.02) {
            outer.y += bankingHeight;
        } else if (curvatures[i] < -0.02) {
            inner.y += bankingHeight;
        }

        innerPoints.push(inner);
        outerPoints.push(outer);

        positions.push(inner.x, inner.y, inner.z);
        positions.push(outer.x, outer.y, outer.z);

        uvs.push(0, t * 20);
        uvs.push(1, t * 20);

        if (i < segments) {
            const idx = i * 2;
            indices.push(idx, idx + 1, idx + 2);
            indices.push(idx + 1, idx + 3, idx + 2);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, innerPoints, outerPoints, curvatures };
}
