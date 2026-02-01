/**
 * Kart Factory
 *
 * Creates kart 3D mesh geometry.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';
import { KART_TYPES } from './kartTypes.js';

export function createKartGeometry(type) {
    const config = KART_TYPES[type];
    const group = new THREE.Group();

    // Main body
    const bodyGeom = new THREE.BoxGeometry(1.2, 0.4, 2);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: config.color,
        metalness: 0.6,
        roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    // Cockpit
    const cockpitGeom = new THREE.BoxGeometry(0.8, 0.35, 0.9);
    const cockpitMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.3,
        roughness: 0.6
    });
    const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
    cockpit.position.set(0, 0.55, -0.2);
    group.add(cockpit);

    // Front nose
    const noseGeom = new THREE.BoxGeometry(0.8, 0.25, 0.6);
    const noseMat = new THREE.MeshStandardMaterial({
        color: config.accentColor,
        metalness: 0.7,
        roughness: 0.3
    });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(0, 0.3, 1.1);
    group.add(nose);

    // Spoiler
    const spoilerGeom = new THREE.BoxGeometry(1.4, 0.08, 0.2);
    const spoilerMat = new THREE.MeshStandardMaterial({
        color: config.accentColor,
        metalness: 0.8,
        roughness: 0.2
    });
    const spoiler = new THREE.Mesh(spoilerGeom, spoilerMat);
    spoiler.position.set(0, 0.7, -0.9);
    group.add(spoiler);

    // Spoiler stands
    const standGeom = new THREE.BoxGeometry(0.08, 0.25, 0.08);
    const standL = new THREE.Mesh(standGeom, spoilerMat);
    standL.position.set(-0.5, 0.55, -0.9);
    group.add(standL);
    const standR = new THREE.Mesh(standGeom, spoilerMat);
    standR.position.set(0.5, 0.55, -0.9);
    group.add(standR);

    // Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const wheelMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.2,
        roughness: 0.8
    });

    const wheelPositions = [
        { x: -0.7, z: 0.7, front: true },
        { x: 0.7, z: 0.7, front: true },
        { x: -0.7, z: -0.7, front: false },
        { x: 0.7, z: -0.7, front: false }
    ];

    const wheels = [];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.25, pos.z);
        wheel.castShadow = true;
        wheel.userData.isFront = pos.front;
        wheels.push(wheel);
        group.add(wheel);
    });

    group.userData.wheels = wheels;
    return group;
}

export default createKartGeometry;
