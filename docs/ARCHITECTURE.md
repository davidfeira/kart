# Architecture Overview

## Current Implementation Status

The game is currently implemented as a **single-file application** in `index.html` (~1650 lines). This document describes both the current architecture and the planned modular structure outlined in [CLAUDE.md](../CLAUDE.md).

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

## Current Classes (in index.html)

### Configuration
- **CONFIG** - Physics, camera, and race settings
- **KART_TYPES** - Speedster, Tank, Dart, Buggy definitions
- **TRACK_PRESETS** - Oval, Figure 8, Grand Circuit definitions

### Core Classes

| Class | Lines | Responsibility |
|-------|-------|----------------|
| `InputManager` | ~65 | Keyboard input capture and state |
| `Kart` | ~245 | Kart mesh, physics, drift mechanics |
| `TrackGenerator` | ~355 | Procedural track geometry and textures |
| `CheckpointManager` | ~65 | Lap counting and race timing |
| `CameraController` | ~60 | Third-person camera with look-ahead |
| `MenuManager` | ~325 | All menu screens and navigation |
| `HUDController` | ~40 | Speed, lap, timer display |
| `Game` | ~240 | Main orchestrator, game loop |

### Static Utilities
- `KartFactory.createMesh()` - Procedural kart geometry builder
- `KartFactory.createPreview()` - Menu preview kart creator

## Game State Flow

```
MENU → KART_SELECT → TRACK_SELECT → LOADING → COUNTDOWN → RACING → FINISHED
  ↑                                                                    │
  └────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Input** - `InputManager` captures keyboard events, stores in `keys` object
2. **Update** - `Kart.update()` reads input state, calculates physics
3. **Physics** - Speed, rotation, drift, collision with track boundaries
4. **Camera** - `CameraController` follows kart with damping
5. **Render** - Three.js renders scene at 60fps

## Planned Modular Structure

Per [CLAUDE.md](../CLAUDE.md) guidelines, the codebase should be refactored to:

```
src/
├── core/           # Game.js, SceneManager.js, GameLoop.js
├── entities/       # Kart.js, PlayerKart.js, AIKart.js
├── systems/        # PhysicsSystem.js, InputSystem.js, CollisionSystem.js
├── tracks/         # Track.js, TrackGenerator.js, TrackLoader.js
├── ui/             # MenuManager.js, HUDController.js
└── utils/          # logger.js, constants.js, math.js
```

**Target**: Each file should be under 300 lines.

## Dependencies

- **Three.js r160** - 3D rendering (via CDN)
- **ES Modules** - Modern JavaScript module system

## Logging System

The project uses a centralized logging system defined in `src/utils/logger.js`:

```javascript
import { Logger } from './src/utils/logger.js';
const log = Logger.getLogger('ModuleName');

log.debug('Debug message');
log.info('Info message');
log.warn('Warning message');
log.error('Error message', { context: data });
```

Logs are stored in memory, persisted to localStorage, and can be exported/downloaded. See [API.md](./API.md) for full logger API.

## Performance Considerations

Current implementation includes:
- Procedural geometry (no external model loading)
- Canvas-based procedural textures
- Basic frustum culling (Three.js default)
- Single active kart (no AI opponents yet)

Future optimizations needed:
- Object pooling for items/effects
- Instanced meshes for repeated objects
- LOD for distant objects
- Web Workers for physics (if needed)
