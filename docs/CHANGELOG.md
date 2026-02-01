# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Centralized logging system (`src/utils/logger.js`)
  - Support for log levels: DEBUG, INFO, WARN, ERROR
  - Log categories: game, physics, network, error
  - localStorage persistence with auto-restore
  - Log export and download functionality
  - Batched writes for performance
- API documentation (`docs/API.md`)
- Updated architecture documentation

### Changed
- Improved ARCHITECTURE.md to reflect actual implementation

## [0.2.0] - 2024-01-31

### Added
- 3D rotating kart previews in selection menu
- Kart meshes now display in menu before race

### Fixed
- Countdown visibility - now properly displays over game
- Track height collision detection improved

## [0.1.0] - 2024-01-31

### Added
- Complete single-player kart racing game
- Four playable karts: Speedster, Tank, Dart, Buggy
  - Each with unique stats and visual design
- Three procedurally generated tracks:
  - Oval Speedway (beginner)
  - Figure 8 with bridge (intermediate)
  - Grand Circuit with S-curves (advanced)
- Full physics system:
  - Acceleration, braking, reverse
  - Drift mechanics with boost reward
  - Wall collision with bounce
- Third-person camera with:
  - Look-ahead functionality
  - Dynamic FOV based on speed
  - Smooth damping
- Complete menu system:
  - Main menu
  - Kart selection with stat bars
  - Track selection with difficulty indicators
  - Pause menu
  - Finish screen with lap times
- HUD displaying:
  - Current speed
  - Lap counter
  - Race timer
  - Drift indicator
- Checkpoint and lap tracking system
- Procedural textures (road, grass, start line)
- Project guidelines (CLAUDE.md)
- Documentation structure (docs/)
- Logging infrastructure (logs/)

### Technical Details
- Built with Three.js r160 (ES modules via CDN)
- Pure HTML/CSS/JavaScript - no build step required
- Procedural geometry for all game objects
- Canvas-based texture generation
