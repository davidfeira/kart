/**
 * Track Preset Definitions
 *
 * Defines available tracks with their path generation functions.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';

export const TRACK_PRESETS = {
    oval: {
        name: 'Oval Speedway',
        description: 'Simple oval track - perfect for beginners',
        difficulty: 1,
        generatePath: () => {
            const points = [];
            const a = 150, b = 80; // ellipse radii (larger for high-speed racing)
            for (let i = 0; i <= 64; i++) {
                const t = (i / 64) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b));
            }
            return points;
        }
    },
    figure8: {
        name: 'Figure 8',
        description: 'Crossover track with a bridge section',
        difficulty: 2,
        generatePath: () => {
            const points = [];
            const scale = 35;
            for (let i = 0; i <= 64; i++) {
                const t = (i / 64) * Math.PI * 2;
                // Lemniscate of Bernoulli (figure 8)
                const denom = 1 + Math.sin(t) * Math.sin(t);
                const x = (scale * Math.cos(t)) / denom;
                const z = (scale * Math.sin(t) * Math.cos(t)) / denom;
                // Add height variation at crossover
                const y = Math.abs(Math.sin(t * 2)) * 3;
                points.push(new THREE.Vector3(x * 1.5, y, z * 2));
            }
            return points;
        }
    },
    circuit: {
        name: 'Grand Circuit',
        description: 'S-curves, hairpin, and hill sections',
        difficulty: 3,
        generatePath: () => {
            const points = [];
            for (let i = 0; i <= 80; i++) {
                const t = i / 80;
                const theta = t * Math.PI * 2;
                // Create a more interesting circuit
                const r = 40 + Math.sin(theta * 3) * 15 + Math.cos(theta * 2) * 10;
                const x = Math.cos(theta) * r;
                const z = Math.sin(theta) * r * 0.7;
                const y = Math.sin(theta * 2) * 2 + Math.max(0, Math.sin(theta * 4) * 3);
                points.push(new THREE.Vector3(x, y, z));
            }
            return points;
        }
    },
    drift: {
        name: 'Drift Circuit',
        description: 'R4-inspired high-speed drift track',
        difficulty: 3,
        generatePath: () => {
            const points = [];
            const numPoints = 64;

            for (let i = 0; i < numPoints; i++) {
                const t = i / numPoints;
                const theta = t * Math.PI * 2;

                // Flowing radius with smooth variations (2x scale)
                const r = 110 + Math.sin(theta * 2) * 40 + Math.cos(theta * 3) * 24;

                // Elliptical stretch for straight sections
                const x = Math.cos(theta) * r * 1.4;
                const z = Math.sin(theta) * r;

                // Gentle elevation (max ~6 units, scaled with track)
                const y = Math.sin(theta * 2) * 3 + Math.max(0, Math.sin(theta * 4) * 3);

                points.push(new THREE.Vector3(x, y, z));
            }
            return points;
        }
    }
};

export default TRACK_PRESETS;
