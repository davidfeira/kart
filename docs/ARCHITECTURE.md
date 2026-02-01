# Architecture Overview

## Current Implementation Status

The game is now **fully modularized** across 14 ES module files in `src/`. The entry point `index.html` is a thin shell (141 lines) that just bootstraps the `Game` class.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Loop                                │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │  Input   │→ │  Update  │→ │ Physics  │→ │  Render  │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Managers                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Menu     │ │   Camera   │ │ Checkpoint │ │    HUD     │   │
│  │  Manager   │ │ Controller │ │  Manager   │ │ Controller │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Entities                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │    Kart    │ │   Track    │ │   Input    │                   │
│  │  (Player)  │ │ Generator  │ │  Manager   │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
mario-kart-clone/
├── index.html              (141 lines) - Entry point, HTML structure
├── style.css               (961 lines) - All styles including mobile
├── server.js               (130 lines) - Dev server for logging
├── devmode.bat             - Launches dev server + browser
├── src/
│   ├── core/
│   │   ├── Game.js         (295 lines) - Main orchestrator, render loop
│   │   ├── CameraController.js (91 lines) - Third-person camera
│   │   └── TrackFrame.js   (35 lines) - TNB coordinate frame
│   ├── entities/
│   │   ├── Kart.js         (1200 lines) - Full kart physics + visuals
│   │   ├── KartFactory.js  (95 lines) - Procedural kart geometry
│   │   └── kartTypes.js    (40 lines) - Kart stat definitions
│   ├── systems/
│   │   ├── InputManager.js (146 lines) - Keyboard + touch input
│   │   └── CheckpointManager.js (86 lines) - Lap tracking, timing
│   ├── tracks/
│   │   ├── TrackGenerator.js (530 lines) - Track mesh, barriers, lights
│   │   └── trackPresets.js (90 lines) - Track path generators
│   ├── ui/
│   │   ├── MenuManager.js  (310 lines) - All menu screens
│   │   └── HUDController.js (70 lines) - Speed, lap, timer display
│   └── utils/
│       ├── logger.js       (298 lines) - Centralized logging system
│       └── config.js       (80 lines) - Physics, camera, race config
├── docs/
│   ├── ARCHITECTURE.md     - This file
│   ├── API.md              - Public interfaces
│   └── CHANGELOG.md        - Version history
└── logs/                   - Dev mode log output
```

## Module Descriptions

### Core (`src/core/`)

| Module | Purpose |
|--------|---------|
| `Game.js` | Main game class, scene setup, lighting, sky shader, game loop, state management |
| `CameraController.js` | Third-person camera with look-ahead, speed-based FOV, boost shake |
| `TrackFrame.js` | Tangent-Normal-Binormal coordinate frame for track-relative physics |

### Entities (`src/entities/`)

| Module | Purpose |
|--------|---------|
| `Kart.js` | Complete kart: mesh, physics, drift mechanics, particles, boost |
| `KartFactory.js` | Procedural geometry builder for kart meshes |
| `kartTypes.js` | Speedster, Tank, Dart, Buggy definitions with stats |

### Systems (`src/systems/`)

| Module | Purpose |
|--------|---------|
| `InputManager.js` | Keyboard events + touch button handling |
| `CheckpointManager.js` | Checkpoint crossing detection, lap counting, timing |

### Tracks (`src/tracks/`)

| Module | Purpose |
|--------|---------|
| `TrackGenerator.js` | Road mesh, barriers, stadium lights, track banking, collision |
| `trackPresets.js` | Oval, Figure8, GrandCircuit, DriftCircuit path generators |

### UI (`src/ui/`)

| Module | Purpose |
|--------|---------|
| `MenuManager.js` | Main menu, kart/track selection, pause, finish screens |
| `HUDController.js` | Speed display, lap counter, race timer, drift indicator |

### Utils (`src/utils/`)

| Module | Purpose |
|--------|---------|
| `logger.js` | Multi-level logging with dev server file output |
| `config.js` | CONFIG object with physics, camera, race constants |

## Game State Flow

```
MENU → KART_SELECT → TRACK_SELECT → LOADING → COUNTDOWN → RACING → FINISHED
  ↑         ↑              ↑                                           │
  │         │              │                                           │
  │         └──────────────┴────────── PAUSED ←────────────────────────┤
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Input** - `InputManager` captures keyboard/touch events → `keys` object
2. **Update** - `Game.update()` passes input to `Kart.update()`
3. **Physics** - Kart calculates speed, rotation, drift, track-relative movement
4. **Collision** - `TrackGenerator.getTrackBoundaryCollision()` checks barriers
5. **Camera** - `CameraController` follows kart with damping and effects
6. **Checkpoints** - `CheckpointManager` detects lap completion
7. **Render** - Three.js renders scene at 60fps

## Track-Relative Physics (R4 Style)

The `TrackFrame` class implements TNB (Tangent-Normal-Binormal) coordinates:
- **T** (tangent) - Points along track direction
- **N** (normal) - Points toward track center
- **B** (binormal) - Points up from track surface

This allows physics calculations in track-relative space, giving R4/Ridge Racer style handling where the car follows the track naturally.

## Logging System

```javascript
import { Logger } from './src/utils/logger.js';
const log = Logger.getLogger('ModuleName');

log.debug('Debug message');
log.info('Info message', { data: value });
log.warn('Warning message');
log.error('Error message', error);
```

In dev mode (`devmode.bat`), logs POST to the server and write to `logs/` folder.

## Dependencies

- **Three.js r160** - 3D rendering (via CDN importmap)
- **ES Modules** - Modern JavaScript module system
- **Node.js** - Dev server for logging (optional)

## Performance Notes

- Procedural geometry (no external model loading)
- Canvas-based procedural textures
- Single active kart (no AI yet)
- Basic Three.js frustum culling

## File Size Compliance

Per CLAUDE.md guidelines:
- **Target**: < 300 lines ✓ (most modules)
- **Warning**: > 500 lines ⚠ (Kart.js, TrackGenerator.js)
- Kart.js at 1200 lines could be split into KartPhysics.js + KartVisuals.js
- TrackGenerator.js at 530 lines could be split into TrackGeometry.js + TrackCollision.js
