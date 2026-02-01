# API Reference

This document describes the public interfaces for the Mario Kart Clone project.

## Logger Module

**Location:** `src/utils/logger.js`

The centralized logging system for all game modules.

### Import

```javascript
import { Logger, LOG_LEVELS, LOG_CATEGORIES } from './src/utils/logger.js';
// or
import Logger from './src/utils/logger.js';
```

### Getting a Module Logger

```javascript
const log = Logger.getLogger('ModuleName');
```

Returns a logger object with methods for each log level.

### Log Methods

```javascript
log.debug(message, data?)  // Verbose debugging info
log.info(message, data?)   // General information
log.warn(message, data?)   // Warnings
log.error(message, data?)  // Errors
```

**Parameters:**
- `message` (string) - The log message
- `data` (any, optional) - Additional data to include (will be JSON stringified)

**Log Format:**
```
[2024-01-31T12:00:00.000Z] [INFO] [Physics] Collision detected: kart_1 -> banana_3
```

### Configuration

```javascript
// Set minimum log level (DEBUG, INFO, WARN, ERROR)
Logger.setMinLevel('INFO');
Logger.setMinLevel(LOG_LEVELS.WARN);

// Enable/disable console output
Logger.setConsoleOutput(false); // Production
Logger.setConsoleOutput(true);  // Development
```

### Retrieving Logs

```javascript
// Get logs for a specific category
const gameLogs = Logger.getLogs('game');
const physicsLogs = Logger.getLogs('physics');
const errorLogs = Logger.getLogs('error');

// Get all logs sorted by timestamp
const allLogs = Logger.getAllLogs();

// Export as formatted text
const logText = Logger.exportLogs('physics');
const allLogText = Logger.exportLogs(); // All categories
```

### Downloading Logs

```javascript
// Download specific category
Logger.downloadLogs('game');    // Downloads game.log
Logger.downloadLogs('physics'); // Downloads physics.log
Logger.downloadLogs('error');   // Downloads error.log

// Download all logs
Logger.downloadLogs();          // Downloads game_all.log
```

### Log Statistics

```javascript
const stats = Logger.getStats();
// Returns: { game: 42, physics: 128, network: 0, error: 3 }
```

### Clear Logs

```javascript
Logger.clearLogs(); // Clears all logs from memory and localStorage
```

### Log Categories

| Category | Modules |
|----------|---------|
| `game` | Game, Menu, HUD, Checkpoint, Camera, Input |
| `physics` | Physics, Kart, Track, Collision |
| `network` | Network, Multiplayer |
| `error` | All errors (duplicated from source category) |

---

## Game Classes (in index.html)

> Note: These classes are currently embedded in index.html and not exported as modules. This section documents their interfaces for future modularization.

### Game

Main game orchestrator.

```javascript
const game = new Game();
```

**Methods:**
- `start()` - Initialize and start the game
- Internal methods handle state transitions and game loop

### InputManager

Keyboard input handling.

```javascript
const input = new InputManager();
```

**Properties:**
- `keys` - Object containing current key states

**Key mappings:**
- `w`, `ArrowUp` → forward
- `s`, `ArrowDown` → backward
- `a`, `ArrowLeft` → left
- `d`, `ArrowRight` → right
- `Space` → drift

### Kart

Player kart with physics.

```javascript
const kart = new Kart(kartType, startPosition, startRotation);
```

**Parameters:**
- `kartType` (string) - One of: 'speedster', 'tank', 'dart', 'buggy'
- `startPosition` (THREE.Vector3) - Initial position
- `startRotation` (number) - Initial Y rotation in radians

**Methods:**
- `update(deltaTime, input, trackData)` - Update physics each frame
- `dispose()` - Clean up Three.js resources

**Properties:**
- `mesh` - THREE.Group containing kart geometry
- `speed` - Current speed
- `isDrifting` - Whether currently drifting

### TrackGenerator

Procedural track generation.

```javascript
const trackGen = new TrackGenerator(scene);
const trackData = trackGen.generate(trackPreset);
```

**Methods:**
- `generate(preset)` - Generate track from preset, returns track data
- `clear()` - Remove current track from scene

**Returns (trackData):**
```javascript
{
    centerPoints: THREE.Vector3[],  // Track center line
    trackWidth: number,             // Width in units
    checkpoints: { position, direction }[]
}
```

### CheckpointManager

Lap and timing management.

```javascript
const checkpoints = new CheckpointManager(trackData, totalLaps);
```

**Methods:**
- `update(kartPosition)` - Check checkpoint crossings
- `reset()` - Reset for new race

**Properties:**
- `currentLap` - Current lap number (1-based)
- `raceTime` - Total race time in seconds
- `lapTimes` - Array of completed lap times
- `isFinished` - Whether race is complete

### CameraController

Third-person camera following.

```javascript
const camera = new CameraController(threeCamera, kart);
```

**Methods:**
- `update(deltaTime)` - Update camera position/rotation

### MenuManager

UI menu system.

```javascript
const menus = new MenuManager(onStateChange);
```

**Methods:**
- `showMenu(menuId)` - Show specific menu
- `hideAll()` - Hide all menus

### HUDController

In-game HUD display.

```javascript
const hud = new HUDController();
```

**Methods:**
- `update(speed, lap, totalLaps, time, isDrifting)` - Update HUD values
- `show()` / `hide()` - Toggle visibility

---

## Configuration Objects

### CONFIG

```javascript
CONFIG.physics = {
    maxSpeed: 80,
    reverseMaxSpeed: 25,
    acceleration: 45,
    reverseAcceleration: 30,
    brakeStrength: 80,
    baseTurnRate: 2.5,
    groundFriction: 0.98,
    driftFriction: 0.995,
    driftTurnBonus: 1.8,
    minDriftSpeed: 25,
    wallBounce: 0.5,
    wallSpeedLoss: 0.7,
    boostStrength: 30,
    boostDuration: 0.5
};

CONFIG.camera = {
    distance: 10,
    height: 4,
    lookAheadDistance: 5,
    positionDamping: 0.03,
    rotationDamping: 0.02,
    baseFov: 70,
    maxFov: 85,
    fovSpeedScale: 0.15
};

CONFIG.race = {
    totalLaps: 3,
    countdownTime: 4
};
```

### KART_TYPES

```javascript
KART_TYPES = {
    speedster: { name, color, accentColor, stats, modifiers },
    tank: { ... },
    dart: { ... },
    buggy: { ... }
};
```

### TRACK_PRESETS

```javascript
TRACK_PRESETS = {
    oval: { name, description, difficulty, generatePath() },
    figure8: { ... },
    grand: { ... }
};
```
