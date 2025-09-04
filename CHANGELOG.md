# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (placeholder)

### Changed
- Console table pagination controls now use compact icon buttons.
- Images column now truncates thumbnails to fit and always reserves a slot for the "+N" overflow indicator (prevents vertical expansion; recalculates on resize).
- Standardized sortable header sizing: centralized constant min widths with runtime enforcement (replaced prior experimental dynamic / intrinsic sizing iterations to eliminate icon/divider overlap & truncation).

### Fixed
- (placeholder)

## [1.9.2] - 2025-09-05
### Changed
- Consolidated header sizing iteration notes into a single standardized implementation entry.

## [1.9.1] - 2025-09-04
### Fixed
- Moved deprecated metadata.themeColor to viewport export (Next.js warning resolved).

## [1.9.0] - 2025-09-04
### Added
- Service Worker + PWA manifest (offline shell, route & image caching with stale-while-revalidate for Shopify CDN images).
- Runtime update toast with version + refresh & dismiss actions.
- Real icon assets (`icon-192.png`, `icon-512.png`) replacing embedded base64.
- Console data persistent caching (IndexedDB w/ localStorage fallback) with immediate hydration.
- Lightweight product index (id + updated_at/hash) for fast diffing & object reference reuse.
- Per-user (email-scoped) cache versioning & schema version field.
- Loading state row in products table during initial fetch.

### Changed
- Table hydration path now prefers cached dataset for faster first paint.
- Image cache now prunes oldest entries beyond threshold.
- Precache list extended to include `/app/lists`.

### Fixed
- Avoid unnecessary re-renders by reusing cached product object references when unchanged.

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

[Unreleased]: https://github.com/kendrick-gs/scrapper/compare/v1.9.2...HEAD
[1.9.2]: https://github.com/kendrick-gs/scrapper/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/kendrick-gs/scrapper/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/kendrick-gs/scrapper/compare/v1.8.0...v1.9.0
[1.7.0]: https://github.com/kendrick-gs/scrapper/releases/tag/v1.7.0
