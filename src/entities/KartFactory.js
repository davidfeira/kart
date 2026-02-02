/**
 * Kart Factory
 *
 * Creates R4-style sports car 3D mesh geometry.
 * Features proper wheel hierarchy for correct rotation animation.
 */

import * as THREE from 'three';
import { KART_TYPES } from './kartTypes.js';

/**
 * Creates a wheel with hub (for steering) and mesh (for spin)
 * @param {Object} materials - { tire, rim }
 * @param {boolean} isFront - Whether this is a front wheel
 * @param {boolean} isLeft - Whether this is on the left side
 * @returns {THREE.Group} Wheel hub group
 */
function createWheel(materials, isFront, isLeft) {
    // Hub group handles position and steering rotation (Y axis)
    const hub = new THREE.Group();
    hub.userData.isFront = isFront;
    hub.userData.isLeft = isLeft;

    // Wheel assembly group - spins around X axis (the axle)
    const wheelAssembly = new THREE.Group();

    // Tire - cylinder with axis along X (axle direction)
    const tireGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
    tireGeom.rotateZ(Math.PI / 2); // Axis now along X
    const tire = new THREE.Mesh(tireGeom, materials.tire);
    tire.castShadow = true;
    wheelAssembly.add(tire);

    // Rim - inner metallic cylinder
    const rimGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.19, 8);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, materials.rim);
    wheelAssembly.add(rim);

    // Add 5 spokes so rotation is VISIBLE (breaks rotational symmetry)
    const spokeGeom = new THREE.BoxGeometry(0.16, 0.04, 0.04);
    const numSpokes = 5;
    for (let i = 0; i < numSpokes; i++) {
        const angle = (i / numSpokes) * Math.PI * 2;
        const spoke = new THREE.Mesh(spokeGeom, materials.rim);
        // Position spoke radially in YZ plane (perpendicular to axle)
        spoke.position.y = Math.cos(angle) * 0.12;
        spoke.position.z = Math.sin(angle) * 0.12;
        // Rotate spoke to point outward from center
        spoke.rotation.x = angle;
        wheelAssembly.add(spoke);
    }

    // Rim face discs on each side
    const rimFaceGeom = new THREE.CircleGeometry(0.08, 8);
    const rimFaceL = new THREE.Mesh(rimFaceGeom, materials.rim);
    rimFaceL.position.x = -0.095;
    rimFaceL.rotation.y = Math.PI / 2;
    wheelAssembly.add(rimFaceL);

    const rimFaceR = new THREE.Mesh(rimFaceGeom, materials.rim);
    rimFaceR.position.x = 0.095;
    rimFaceR.rotation.y = -Math.PI / 2;
    wheelAssembly.add(rimFaceR);

    hub.add(wheelAssembly);
    hub.userData.wheelAssembly = wheelAssembly;

    return hub;
}

/**
 * Creates the 90s sports car body shape
 * @param {THREE.Material} bodyMat - Main body material
 * @param {THREE.Material} accentMat - Accent color material
 * @param {THREE.Material} windowMat - Window material
 * @param {THREE.Material} trimMat - Black trim material
 * @returns {THREE.Group} Body group
 */
function createSportsCarBody(bodyMat, accentMat, windowMat, trimMat) {
    const body = new THREE.Group();

    // === MAIN BODY SHELL ===
    // Lower body - wide base
    const lowerBodyGeom = new THREE.BoxGeometry(1.4, 0.25, 2.4);
    const lowerBody = new THREE.Mesh(lowerBodyGeom, bodyMat);
    lowerBody.position.y = 0.2;
    lowerBody.castShadow = true;
    body.add(lowerBody);

    // Upper body - tapered towards front and rear
    const upperBodyGeom = new THREE.BoxGeometry(1.3, 0.2, 1.8);
    const upperBody = new THREE.Mesh(upperBodyGeom, bodyMat);
    upperBody.position.y = 0.4;
    upperBody.position.z = -0.1;
    upperBody.castShadow = true;
    body.add(upperBody);

    // === HOOD (FRONT) ===
    // Long sloping hood - signature 90s sports car look
    const hoodGeom = new THREE.BoxGeometry(1.2, 0.12, 0.9);
    const hood = new THREE.Mesh(hoodGeom, bodyMat);
    hood.position.set(0, 0.38, 0.85);
    hood.rotation.x = -0.15; // Slight downward slope
    hood.castShadow = true;
    body.add(hood);

    // Hood scoop / air intake detail
    const scoopGeom = new THREE.BoxGeometry(0.3, 0.06, 0.25);
    const scoop = new THREE.Mesh(scoopGeom, trimMat);
    scoop.position.set(0, 0.46, 0.6);
    body.add(scoop);

    // === CABIN / GREENHOUSE ===
    // Windshield frame
    const windshieldGeom = new THREE.BoxGeometry(1.0, 0.35, 0.08);
    const windshield = new THREE.Mesh(windshieldGeom, windowMat);
    windshield.position.set(0, 0.55, 0.35);
    windshield.rotation.x = -0.5; // Angled back ~30 degrees
    body.add(windshield);

    // Roof
    const roofGeom = new THREE.BoxGeometry(1.0, 0.08, 0.5);
    const roof = new THREE.Mesh(roofGeom, bodyMat);
    roof.position.set(0, 0.62, -0.05);
    roof.castShadow = true;
    body.add(roof);

    // Rear window
    const rearWindowGeom = new THREE.BoxGeometry(0.9, 0.25, 0.06);
    const rearWindow = new THREE.Mesh(rearWindowGeom, windowMat);
    rearWindow.position.set(0, 0.52, -0.35);
    rearWindow.rotation.x = 0.4; // Angled forward
    body.add(rearWindow);

    // Side windows (left and right)
    const sideWindowGeom = new THREE.BoxGeometry(0.06, 0.22, 0.45);

    const sideWindowL = new THREE.Mesh(sideWindowGeom, windowMat);
    sideWindowL.position.set(-0.52, 0.52, 0.0);
    body.add(sideWindowL);

    const sideWindowR = new THREE.Mesh(sideWindowGeom, windowMat);
    sideWindowR.position.set(0.52, 0.52, 0.0);
    body.add(sideWindowR);

    // === REAR SECTION ===
    // Rear deck / trunk
    const rearDeckGeom = new THREE.BoxGeometry(1.25, 0.15, 0.6);
    const rearDeck = new THREE.Mesh(rearDeckGeom, bodyMat);
    rearDeck.position.set(0, 0.38, -0.75);
    rearDeck.rotation.x = 0.1; // Slight upward angle
    rearDeck.castShadow = true;
    body.add(rearDeck);

    // Integrated lip spoiler
    const spoilerGeom = new THREE.BoxGeometry(1.2, 0.04, 0.12);
    const spoiler = new THREE.Mesh(spoilerGeom, accentMat);
    spoiler.position.set(0, 0.48, -1.0);
    body.add(spoiler);

    // === FRONT FASCIA ===
    // Front bumper
    const frontBumperGeom = new THREE.BoxGeometry(1.35, 0.15, 0.15);
    const frontBumper = new THREE.Mesh(frontBumperGeom, trimMat);
    frontBumper.position.set(0, 0.15, 1.25);
    body.add(frontBumper);

    // Front air intake
    const intakeGeom = new THREE.BoxGeometry(0.6, 0.1, 0.08);
    const intake = new THREE.Mesh(intakeGeom, trimMat);
    intake.position.set(0, 0.12, 1.32);
    body.add(intake);

    // Headlights (popup style hint - just boxes for now)
    const headlightGeom = new THREE.BoxGeometry(0.2, 0.08, 0.12);
    const headlightMatL = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0x333300,
        metalness: 0.9,
        roughness: 0.1
    });
    const headlightMatR = headlightMatL.clone();

    const headlightL = new THREE.Mesh(headlightGeom, headlightMatL);
    headlightL.position.set(-0.45, 0.35, 1.15);
    body.add(headlightL);

    const headlightR = new THREE.Mesh(headlightGeom, headlightMatR);
    headlightR.position.set(0.45, 0.35, 1.15);
    body.add(headlightR);

    // === REAR FASCIA ===
    // Rear bumper
    const rearBumperGeom = new THREE.BoxGeometry(1.3, 0.15, 0.1);
    const rearBumper = new THREE.Mesh(rearBumperGeom, trimMat);
    rearBumper.position.set(0, 0.15, -1.2);
    body.add(rearBumper);

    // Taillights
    const taillightGeom = new THREE.BoxGeometry(0.25, 0.1, 0.06);
    const taillightMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0x330000,
        metalness: 0.3,
        roughness: 0.4
    });

    const taillightL = new THREE.Mesh(taillightGeom, taillightMat);
    taillightL.position.set(-0.45, 0.32, -1.18);
    body.add(taillightL);

    const taillightR = new THREE.Mesh(taillightGeom, taillightMat);
    taillightR.position.set(0.45, 0.32, -1.18);
    body.add(taillightR);

    // === FENDER FLARES (subtle) ===
    const fenderGeom = new THREE.BoxGeometry(0.12, 0.18, 0.5);

    // Front fenders
    const fenderFL = new THREE.Mesh(fenderGeom, bodyMat);
    fenderFL.position.set(-0.72, 0.22, 0.7);
    fenderFL.castShadow = true;
    body.add(fenderFL);

    const fenderFR = new THREE.Mesh(fenderGeom, bodyMat);
    fenderFR.position.set(0.72, 0.22, 0.7);
    fenderFR.castShadow = true;
    body.add(fenderFR);

    // Rear fenders (slightly wider)
    const rearFenderGeom = new THREE.BoxGeometry(0.15, 0.2, 0.55);

    const fenderRL = new THREE.Mesh(rearFenderGeom, bodyMat);
    fenderRL.position.set(-0.73, 0.23, -0.65);
    fenderRL.castShadow = true;
    body.add(fenderRL);

    const fenderRR = new THREE.Mesh(rearFenderGeom, bodyMat);
    fenderRR.position.set(0.73, 0.23, -0.65);
    fenderRR.castShadow = true;
    body.add(fenderRR);

    // === SIDE SKIRTS ===
    const skirtGeom = new THREE.BoxGeometry(0.08, 0.1, 1.6);

    const skirtL = new THREE.Mesh(skirtGeom, trimMat);
    skirtL.position.set(-0.7, 0.1, 0.0);
    body.add(skirtL);

    const skirtR = new THREE.Mesh(skirtGeom, trimMat);
    skirtR.position.set(0.7, 0.1, 0.0);
    body.add(skirtR);

    return body;
}

/**
 * Creates kart/car geometry with R4 sports car styling
 * @param {string} type - Kart type from kartTypes.js
 * @returns {THREE.Group} Complete car mesh
 */
export function createKartGeometry(type) {
    const config = KART_TYPES[type];
    const group = new THREE.Group();

    // === MATERIALS ===
    // Glossy body paint - high metalness, low roughness for R4 look
    const bodyMat = new THREE.MeshStandardMaterial({
        color: config.color,
        metalness: 0.85,
        roughness: 0.15
    });

    // Accent material - slightly different finish
    const accentMat = new THREE.MeshStandardMaterial({
        color: config.accentColor,
        metalness: 0.9,
        roughness: 0.1
    });

    // Window material - dark tinted, reflective
    const windowMat = new THREE.MeshStandardMaterial({
        color: 0x111133,
        metalness: 0.95,
        roughness: 0.05,
        transparent: true,
        opacity: 0.75
    });

    // Black trim material
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.6
    });

    // Tire material - matte rubber
    const tireMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.05,
        roughness: 0.9
    });

    // Rim material - brushed metal
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0x888899,
        metalness: 0.85,
        roughness: 0.25
    });

    // === CAR BODY ===
    const carBody = createSportsCarBody(bodyMat, accentMat, windowMat, trimMat);
    group.add(carBody);

    // === WHEELS ===
    const wheelMaterials = { tire: tireMat, rim: rimMat };

    // Wheel positions - sports car has wheels further out
    const wheelPositions = [
        { x: -0.65, z: 0.75, y: 0.28, front: true, left: true },   // Front-left
        { x: 0.65, z: 0.75, y: 0.28, front: true, left: false },   // Front-right
        { x: -0.68, z: -0.72, y: 0.28, front: false, left: true }, // Rear-left
        { x: 0.68, z: -0.72, y: 0.28, front: false, left: false }  // Rear-right
    ];

    const wheelHubs = [];

    wheelPositions.forEach(pos => {
        const hub = createWheel(wheelMaterials, pos.front, pos.left);
        hub.position.set(pos.x, pos.y, pos.z);
        wheelHubs.push(hub);
        group.add(hub);
    });

    // Store references for animation
    group.userData.wheelHubs = wheelHubs;
    group.userData.bodyGroup = carBody;

    // Store materials for potential updates (e.g., damage effects)
    group.userData.materials = {
        body: bodyMat,
        accent: accentMat,
        window: windowMat,
        trim: trimMat,
        tire: tireMat,
        rim: rimMat
    };

    return group;
}

export default createKartGeometry;
