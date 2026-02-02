/**
 * Kart Type Definitions
 *
 * Defines available kart types with their stats and visual properties.
 * Extracted from index.html during refuckulation.
 */

export const KART_TYPES = {
    speedster: {
        name: 'Speedster',
        color: 0xff3333,
        accentColor: 0xffff00,
        stats: { speed: 5, accel: 3, handling: 2 },
        modifiers: { maxSpeed: 1.15, acceleration: 0.85, turnRate: 0.85 },
        description: 'High top speed, slower acceleration'
    },
    tank: {
        name: 'Tank',
        color: 0x33cc33,
        accentColor: 0x88ff88,
        stats: { speed: 3, accel: 2, handling: 3 },
        modifiers: { maxSpeed: 0.9, acceleration: 0.8, turnRate: 1.0 },
        description: 'Slow but stable'
    },
    dart: {
        name: 'Dart',
        color: 0x3366ff,
        accentColor: 0x66ffff,
        stats: { speed: 4, accel: 4, handling: 4 },
        modifiers: { maxSpeed: 1.0, acceleration: 1.0, turnRate: 1.1 },
        description: 'Well balanced all-rounder'
    },
    buggy: {
        name: 'Buggy',
        color: 0xff66cc,
        accentColor: 0xffccff,
        stats: { speed: 4, accel: 5, handling: 5 },
        modifiers: { maxSpeed: 0.95, acceleration: 1.2, turnRate: 1.25 },
        description: 'Quick acceleration, nimble handling'
    }
};

export default KART_TYPES;
