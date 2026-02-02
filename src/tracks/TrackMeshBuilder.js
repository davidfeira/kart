/**
 * TrackMeshBuilder
 *
 * Generates track mesh geometry from waypoints.
 * Stores segment data for unified physics lookups.
 */

import * as THREE from 'three';
import { Logger } from '../utils/logger.js';

const log = Logger.getLogger('TrackMeshBuilder');

/**
 * Build track mesh and physics data from a Track object
 */
export function buildTrackMesh(track, options = {}) {
    const {
        segments = 200,
        edgeHeight = 0.5,
        roadColor = 0x333333,
        edgeColor = 0x666666,
        lineColor = 0xffcc00
    } = options;

    log.info('Building track mesh', { name: track.name, segments });

    // Create spline from waypoints
    const points = track.waypoints.map(wp =>
        new THREE.Vector3(wp.pos[0], wp.pos[1], wp.pos[2])
    );

    track.spline = new THREE.CatmullRomCurve3(points, track.closed, 'catmullrom', 0.5);
    track.totalLength = track.spline.getLength();

    // Generate road geometry
    const roadGeometry = generateRoadGeometry(track, segments);
    const roadMaterial = new THREE.MeshStandardMaterial({
        color: roadColor,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    track.mesh = new THREE.Mesh(roadGeometry, roadMaterial);
    track.mesh.receiveShadow = true;

    // Generate edge/barrier geometry
    const { leftEdge, rightEdge } = generateEdgeGeometry(track, segments, edgeHeight);

    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: edgeColor,
        roughness: 0.6,
        metalness: 0.2
    });

    if (leftEdge) {
        const leftMesh = new THREE.Mesh(leftEdge, edgeMaterial);
        leftMesh.castShadow = true;
        track.edgeMeshes.push(leftMesh);
    }
    if (rightEdge) {
        const rightMesh = new THREE.Mesh(rightEdge, edgeMaterial.clone());
        rightMesh.castShadow = true;
        track.edgeMeshes.push(rightMesh);
    }

    // Generate center line
    const lineGeometry = generateCenterLine(track, segments);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: lineColor });
    const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
    track.edgeMeshes.push(lineMesh);

    log.info('Track mesh built', {
        vertices: roadGeometry.attributes.position.count,
        segments: track.segments.length
    });

    return track;
}

/**
 * Generate road surface geometry
 */
function generateRoadGeometry(track, segments) {
    const positions = [];
    const indices = [];
    const uvs = [];
    const normals = [];

    // Clear and rebuild segment data for physics
    track.segments = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const frame = track.getFrameAt(t);

        const halfWidth = frame.width / 2;

        // Calculate inner and outer points with banking
        const inner = frame.position.clone();
        const outer = frame.position.clone();

        // Move laterally along binormal
        inner.addScaledVector(frame.binormal, -halfWidth);
        outer.addScaledVector(frame.binormal, halfWidth);

        // Apply banking - raise outer edge on curves
        // Banking is stored as radians, positive = outer edge up
        if (Math.abs(frame.banking) > 0.001) {
            const bankHeight = Math.sin(frame.banking) * halfWidth;
            outer.y += bankHeight;
            inner.y -= bankHeight;
        }

        // Small base elevation
        inner.y += 0.05;
        outer.y += 0.05;

        // Store segment data for physics
        track.segments.push({
            t,
            centerY: frame.position.y + 0.05,
            innerY: inner.y,
            outerY: outer.y,
            width: frame.width,
            banking: frame.banking,
            normal: frame.normal.clone(),
            tangent: frame.tangent.clone()
        });

        // Add vertices
        positions.push(inner.x, inner.y, inner.z);
        positions.push(outer.x, outer.y, outer.z);

        // UVs - repeat texture along track
        uvs.push(0, t * segments / 10);
        uvs.push(1, t * segments / 10);

        // Normals - use frame normal for both
        normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
        normals.push(frame.normal.x, frame.normal.y, frame.normal.z);

        // Indices for triangles
        if (i < segments) {
            const idx = i * 2;
            indices.push(idx, idx + 1, idx + 2);
            indices.push(idx + 1, idx + 3, idx + 2);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
}

/**
 * Generate edge/barrier geometry
 */
function generateEdgeGeometry(track, segments, height) {
    const leftPositions = [];
    const leftIndices = [];
    const rightPositions = [];
    const rightIndices = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const frame = track.getFrameAt(t);
        const halfWidth = frame.width / 2;

        // Get edge positions
        const innerBase = frame.position.clone().addScaledVector(frame.binormal, -halfWidth);
        const outerBase = frame.position.clone().addScaledVector(frame.binormal, halfWidth);

        // Apply banking
        if (Math.abs(frame.banking) > 0.001) {
            const bankHeight = Math.sin(frame.banking) * halfWidth;
            outerBase.y += bankHeight;
            innerBase.y -= bankHeight;
        }

        innerBase.y += 0.05;
        outerBase.y += 0.05;

        // Left edge (inner)
        const innerTop = innerBase.clone();
        innerTop.y += height;
        leftPositions.push(innerBase.x, innerBase.y, innerBase.z);
        leftPositions.push(innerTop.x, innerTop.y, innerTop.z);

        // Right edge (outer)
        const outerTop = outerBase.clone();
        outerTop.y += height;
        rightPositions.push(outerBase.x, outerBase.y, outerBase.z);
        rightPositions.push(outerTop.x, outerTop.y, outerTop.z);

        if (i < segments) {
            const idx = i * 2;
            // Left edge faces inward
            leftIndices.push(idx, idx + 2, idx + 1);
            leftIndices.push(idx + 1, idx + 2, idx + 3);
            // Right edge faces inward
            rightIndices.push(idx, idx + 1, idx + 2);
            rightIndices.push(idx + 1, idx + 3, idx + 2);
        }
    }

    const leftGeom = new THREE.BufferGeometry();
    leftGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftPositions, 3));
    leftGeom.setIndex(leftIndices);
    leftGeom.computeVertexNormals();

    const rightGeom = new THREE.BufferGeometry();
    rightGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightPositions, 3));
    rightGeom.setIndex(rightIndices);
    rightGeom.computeVertexNormals();

    return { leftEdge: leftGeom, rightEdge: rightGeom };
}

/**
 * Generate center line dashes
 */
function generateCenterLine(track, segments) {
    const positions = [];
    const indices = [];
    const dashLength = 0.02;  // Fraction of track
    const gapLength = 0.02;
    const lineWidth = 0.5;

    let t = 0;
    let vertexIndex = 0;

    while (t < 1) {
        // Draw dash
        const dashEnd = Math.min(t + dashLength, 1);

        for (let dt = t; dt <= dashEnd; dt += dashLength / 4) {
            const frame = track.getFrameAt(dt);

            const left = frame.position.clone().addScaledVector(frame.binormal, -lineWidth / 2);
            const right = frame.position.clone().addScaledVector(frame.binormal, lineWidth / 2);

            // Raise slightly above road
            left.y += 0.06;
            right.y += 0.06;

            positions.push(left.x, left.y, left.z);
            positions.push(right.x, right.y, right.z);

            if (dt > t) {
                const idx = vertexIndex;
                indices.push(idx - 2, idx - 1, idx);
                indices.push(idx - 1, idx + 1, idx);
            }
            vertexIndex += 2;
        }

        t = dashEnd + gapLength;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    return geometry;
}

export default { buildTrackMesh };
