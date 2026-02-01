# Mario Kart Clone - Project Guidelines

## Architecture Principles

### Modularity
- Keep code modular with clear separation of concerns
- Each module should have a single responsibility
- Use ES modules for imports/exports
- Prefer composition over inheritance

### File Size Limits
- **Target**: Keep files under 300 lines
- **Warning threshold**: 500 lines
- **Action required**: If a file approaches 500 lines, refactor into smaller modules
- When splitting files, ensure clear naming that reflects the module's purpose

### Directory Structure
```
mario-kart-clone/
├── src/
│   ├── core/           # Engine, game loop, scene management
│   ├── entities/       # Karts, items, obstacles
│   ├── systems/        # Physics, collision, input handling
│   ├── tracks/         # Track definitions and geometry
│   ├── ui/             # HUD, menus, overlays
│   └── utils/          # Helpers, constants, math utilities
├── assets/             # Models, textures, audio
├── docs/               # Project documentation (keep updated!)
├── logs/               # Centralized logging output
├── index.html
├── style.css
└── CLAUDE.md
```

## Logging Guidelines

### Centralized Logging
All logs go to the `logs/` folder. Do not log to console in production code.

### Logger Module
Create/use a centralized logger (`src/utils/logger.js`) that:
- Writes to files in `logs/` directory
- Includes timestamps
- Includes source file/module name
- Supports log levels: DEBUG, INFO, WARN, ERROR
- Batches writes for performance

### Log File Convention
- `logs/game.log` - General game events
- `logs/physics.log` - Physics system debugging
- `logs/network.log` - Multiplayer/network events (if applicable)
- `logs/error.log` - All errors consolidated

### What to Log
- State changes (game start, pause, end)
- Entity lifecycle (spawn, destroy)
- Collision events
- Input events (for debugging)
- Performance metrics
- Errors with full stack traces

### Log Format
```
[TIMESTAMP] [LEVEL] [MODULE] Message
[2024-01-31T12:00:00.000Z] [INFO] [Physics] Collision detected: kart_1 -> banana_3
```

## Documentation Requirements

### Keep docs/ Updated
The `docs/` folder must stay current. Update docs when:
- Adding new features
- Changing APIs
- Modifying architecture
- Fixing significant bugs

### Required Documentation
- `docs/ARCHITECTURE.md` - System overview and module interactions
- `docs/API.md` - Public interfaces and how to use them
- `docs/CHANGELOG.md` - Track changes as we build

## Code Style

### Three.js Conventions
- Use Three.js r150+ ES module imports
- Dispose of geometries, materials, and textures properly
- Use object pooling for frequently created/destroyed objects
- Keep render loop lean - move logic to update functions

### Naming
- PascalCase for classes: `KartController`, `TrackLoader`
- camelCase for functions/variables: `updatePosition`, `playerKart`
- SCREAMING_SNAKE for constants: `MAX_SPEED`, `GRAVITY`
- Prefix private methods with underscore: `_internalUpdate()`

### Error Handling
- Always catch and log errors
- Provide meaningful error messages
- Include context (what was being attempted, relevant state)

## Performance Considerations
- Use instanced meshes for repeated objects
- Implement frustum culling
- LOD for distant objects
- Object pooling for items/effects
- Throttle non-critical updates
