# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Unified store management features: single & bulk add of Shopify stores, sequential batch refresh with aggregated log panel.
- Lists management enhancements: inline create, edit (rename), delete actions with new PUT & DELETE list API endpoints.
- Reusable `LogPanel` component shared by batch refresh and future streaming tasks.
- List rename & delete storage helpers (`renameList`, `deleteList`).
- Design System: Montserrat font integration, semantic surface tokens (light & dark), JS design tokens module (`lib/designSystem.ts`).

### Changed
- Console table pagination controls now use compact icon buttons.
- Images column now truncates thumbnails to fit and always reserves a slot for the "+N" overflow indicator (prevents vertical expansion; recalculates on resize).
- Standardized sortable header sizing: centralized constant min widths with runtime enforcement (replaced prior experimental dynamic / intrinsic sizing iterations to eliminate icon/divider overlap & truncation).
- Service worker version bumped to v4 to invalidate stale cached route shell so new table UI (images column, headers, pagination icons) is guaranteed to load.
- Stores page redesigned: consistent table styling, stats badges, integrated batch refresh logs, clearer action grouping.
 - Lists page redesigned: consistent styling, inline editing UX and consolidated actions.
 - Modernized Stores & Lists pages with brand green accent, filter inputs, skeleton loading states, compact icon actions & relative time badges.
- Console deep-link: opening from a store row now passes ?store=host param and auto-applies store filter.
- Stores page refinement: removed header icon, unified top border style, modern header layout, separated Products / Collections columns, consistent button styling, single multi-entry add field with automatic multi-URL parsing & dedupe.
- Lists page refinement: removed header icon avatar, unified header style, improved layout & filter placement, adjusted column widths for clarity.
- Unified Stores & Lists table header height with Console product table for consistent compact density.
- Legacy `ProductTable` component deprecated & stubbed; `/app/console` is the canonical product management view.
*- Global theming overhaul: improved dark mode inversion (all surfaces), refined green brand palette, consistent header/backdrop surfaces, accessible focus ring & scrollbar styling.*
*- Global theming overhaul: improved dark mode inversion (all surfaces), refined green brand palette, consistent header/backdrop surfaces, accessible focus ring & scrollbar styling. Removed interim User Preference panel (theme & density now auto-respect system + existing toggle).* 
*- Cache panel redesigned: metric cards, search & bulk remove actions, dark-mode consistent surfaces & accessible table layout.*
* - Cache panel redesigned: metric cards, responsive full-width modal, simplified (search removed), dark-mode consistent surfaces & accessible table layout.*

## [1.9.3] - 2025-09-05
### Added
- Design System (Montserrat font, semantic surface tokens, JS tokens module).
- Redesigned cache panel with metrics, search, bulk operations.

### Changed
- Global theming overhaul with full dark-mode inversion & surface consistency.
- Removed interim preference panel (system + toggle driven now).
- Dark mode table cell background inversion fix.

### Fixed
- Select dropdown panels now respect viewport height (previous overflow due to invalid Tailwind var syntax); long lists scroll inside the panel.
### Changed
- Export button returned to page header; counts now live only in table toolbar for clearer separation of global vs contextual actions.
- Table dark mode cells not inverting previously.

### Deprecated
- Legacy `ProductTable` (retained only as a stub for backwards navigation; will be removed in a future release).

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

[Unreleased]: https://github.com/kendrick-gs/scrapper/compare/v1.9.3...HEAD
[1.9.3]: https://github.com/kendrick-gs/scrapper/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/kendrick-gs/scrapper/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/kendrick-gs/scrapper/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/kendrick-gs/scrapper/compare/v1.8.0...v1.9.0
[1.7.0]: https://github.com/kendrick-gs/scrapper/releases/tag/v1.7.0
