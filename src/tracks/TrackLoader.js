/**
 * TrackLoader
 *
 * Loads track definitions from JSON files and builds Track objects.
 */

import { Track } from './Track.js';
import { buildTrackMesh } from './TrackMeshBuilder.js';
import { Logger } from '../utils/logger.js';

const log = Logger.getLogger('TrackLoader');

// Cache loaded track data
const trackCache = new Map();

/**
 * Load a track from a JSON file
 * @param {string} trackId - Track identifier (filename without extension)
 * @returns {Promise<Track>} - Built track ready for use
 */
export async function loadTrack(trackId) {
    log.info('Loading track', { trackId });

    // Check cache
    if (trackCache.has(trackId)) {
        log.debug('Using cached track data', { trackId });
        const data = trackCache.get(trackId);
        return buildTrackFromData(data);
    }

    // Load JSON file
    const url = `src/tracks/presets/${trackId}.json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load track: ${response.status}`);
        }

        const data = await response.json();

        // Validate track data
        validateTrackData(data);

        // Cache for reuse
        trackCache.set(trackId, data);

        return buildTrackFromData(data);

    } catch (error) {
        log.error('Failed to load track', { trackId, error: error.message });
        throw error;
    }
}

/**
 * Build a Track object from data
 */
function buildTrackFromData(data) {
    const track = new Track(data);
    buildTrackMesh(track);
    return track;
}

/**
 * Validate track data structure
 */
function validateTrackData(data) {
    if (!data.name) {
        throw new Error('Track missing required field: name');
    }

    if (!data.path || !data.path.waypoints) {
        throw new Error('Track missing required field: path.waypoints');
    }

    if (data.path.waypoints.length < 3) {
        throw new Error('Track must have at least 3 waypoints');
    }

    // Validate waypoint structure
    for (let i = 0; i < data.path.waypoints.length; i++) {
        const wp = data.path.waypoints[i];
        if (!wp.pos || !Array.isArray(wp.pos) || wp.pos.length !== 3) {
            throw new Error(`Waypoint ${i} has invalid pos field`);
        }
    }

    log.debug('Track data validated', { name: data.name });
}

/**
 * Get list of available tracks
 */
export function getAvailableTracks() {
    // For now, hardcoded list. Could be dynamic later.
    return [
        { id: 'ridge_circuit', name: 'Ridge Circuit', difficulty: 2 },
        { id: 'drift_canyon', name: 'Drift Canyon', difficulty: 3 }
    ];
}

/**
 * Clear track cache (useful for hot reloading)
 */
export function clearTrackCache() {
    trackCache.clear();
    log.info('Track cache cleared');
}

export default { loadTrack, getAvailableTracks, clearTrackCache };
