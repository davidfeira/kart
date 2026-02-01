/**
 * TrackFrame - TNB Coordinate System
 *
 * Represents a position and orientation on the track surface using
 * the Frenet-Serret (TNB) frame: Tangent, Normal, Binormal.
 * Extracted from index.html during refuckulation.
 */

import * as THREE from 'three';

export class TrackFrame {
    constructor() {
        this.t = 0;                              // Parameter [0,1] along track
        this.position = new THREE.Vector3();    // World position on track surface
        this.tangent = new THREE.Vector3(0, 0, 1);   // T: forward along track
        this.normal = new THREE.Vector3(0, 1, 0);    // N: up from track surface
        this.binormal = new THREE.Vector3(1, 0, 0);  // B: lateral (right)
        this.curvature = 0;                     // Track curvature at this point
        this.banking = 0;                       // Bank angle (radians)
        this.slope = 0;                         // Forward slope angle (radians)
    }

    clone() {
        const frame = new TrackFrame();
        frame.t = this.t;
        frame.position.copy(this.position);
        frame.tangent.copy(this.tangent);
        frame.normal.copy(this.normal);
        frame.binormal.copy(this.binormal);
        frame.curvature = this.curvature;
        frame.banking = this.banking;
        frame.slope = this.slope;
        return frame;
    }
}

export default TrackFrame;
