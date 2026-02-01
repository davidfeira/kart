# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.4.0] - 2026-01-31

### Added
- **Drift Circuit track** - R4-inspired high-speed drift track
  - Smooth parametric curve (no discrete sections)
  - 2x scale for wide sweeping turns (~86-174 unit turn radii)
  - Gentle elevation changes (max ~6 units)
- **Floating track aesthetic** - removed ground plane
- **Stadium lights** - poles with emissive light fixtures around track perimeter
- **Spark particles** - visual feedback when charging drift boost
- **Track banking** - outer edge raises on curves
- **Clean skybox shader** - simple blue gradient (zenith to horizon)
  - Fixed black orb bug (skybox now follows camera)

### Changed
- Road width doubled from 18 to 36 units
- Oval track enlarged for high-speed racing (a=150, b=80)
- Fog color updated to match blue sky (0x8090a0)
- Camera far plane extended to 600

### Fixed
- Skybox clipping causing black circle artifact
- Inverted steering controls

## [0.3.0] - 2026-01-31

### Added
- Centralized logging system (embedded in index.html)
  - Support for log levels: DEBUG, INFO, WARN, ERROR
  - Log categories: game, physics, network, error
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
