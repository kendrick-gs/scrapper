# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Persistent browser image cache via IndexedDB (falls back to in-memory only if unavailable).
 - Progressive streaming hook (`useEventStream`) and enhanced loading/empty/error states for Console table.

### Changed
- Cache panel redesigned: removed limit & usage indicators, added persistent vs memory counts and long-duration auto-expire options (30d–360d).
- Cache trigger reverted to show total aggregated cache size (memory + persistent) and dialog widened for better visibility.

### Fixed
- (placeholder for upcoming fixes)

## [1.8.0] - 2025-09-04
### Added
- User preference persistence store (page size, density, theme) and Preferences panel in header.
- Table state persistence (column sizes, sorting, filters, global search) via localStorage.
- Progressive image loading with blur (LQIP) placeholder in `CachedImage` component.
- Dense (compact) mode styling toggle.

### Changed
- Integrated preference-driven page size and density into product table UI.

### Performance
- Virtualized product table rows for large data sets (previous release groundwork) with persistence improvements.

### Security
- (none)

## [1.7.0] - 2025-09-04
### Changed
- Reset repository history to commit `414284f` (former v1.5 baseline) and re-issued release as 1.7.0.

### Added
- `CONTRIBUTING.md` with Semantic Versioning & Conventional Commits guidelines.

### Security
- (none)

---

[Unreleased]: https://github.com/kendrick-gs/scrapper/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/kendrick-gs/scrapper/releases/tag/v1.7.0
