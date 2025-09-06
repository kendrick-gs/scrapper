# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Add new changes here (Added/Changed/Fixed/Deprecated) until the next version bump. Keep one placeholder bullet per section._

### Added
- Data Presets management page (Vendors, Product Types, Tags) with inline add/remove & multi-add for tags.
- Inline vendor/type selects & tag editor in List Edit Mode powered by Data Presets.
- Optional import of Vendors / Product Types / Tags from selected products into presets via Add To List dialog.
- Local IndexedDB caching of Data Presets (schema v3) for instant hydration & offline-friendly editing.
- Console Add To List: Progressive batch add with live progress bar for large product selections (chunked API posts) and error surface.
- Data Presets page: Modern tabbed interface with search, pagination, per-category counts, bulk clear, and responsive grid layout for large datasets.
- Lists: Dedicated Tags editor modal (Edit Tags button in edit mode) for uncluttered inline layout.
- User Prefs: JSON file-backed persistence layer ensuring Data Presets & column settings survive dev/server restarts.
- User Prefs: Per-user file storage with schema versioning, debounced writes & corruption auto-recovery (replaces single shared file).

### Changed
- Console Add To List dialog fieldset offering preset import checkboxes.
- Cache schema bumped to v3 (adds dataPresets) with automatic migration.

### Fixed
- Preset imports now write-through to local cache preventing stale options until next full console load.
- New list creation path in Add To List dialog now correctly imports selected presets (vendors/types/tags).
- Lists: Body HTML column now shows consistent right divider even though non-resizable.

### Deprecated
- (none)

## [1.9.7] - 2025-09-06
### Added
- Console: Select All progress indicator (chunked selection with visual progress bar for large filtered sets).
- Console: Multi-select filters for Stores, Vendors, and Product Types (replaces previous single-selects) with individual removable chips.
- UI: Reusable `MultiSelect` component (accessible keyboard navigation, badges, clear-all) for tag-style filter selection.
- MultiSelect: Sticky header with option count, Reset, and Done button for improved multi-selection UX.
- Lists Page: Multi-select filters (Stores, Vendors, Product Types) aligned with Console page behavior & styling.
- UI: Standardized wide dialog `panel` size variant (sticky header + scrollable body) added to dialog component.
- Lists Page: Option column visibility persistence (local + server) with automatic restore.
- Lists Page: Custom Option column header controls (collapse + sort) with internal spacer gutter.

### Changed
- Console "Add To List" dialog now uses new medium dialog size variant for balanced width (was nearly full viewport).
- Console Select All Products selects ALL filtered products across pages (not just current page) and disables itself once fully selected.
- Add To List button count now reflects unique products (variants collapsed) with tooltip showing row vs product counts when different.
- Console toolbar: "Clear" button renamed to "Clear Selection" for clarity.
- Console filter toolbar refactored: supports multiple values per filter, updated clear/reset logic, collection filter disabled until at least one store is selected.
- MultiSelect no longer auto-closes after each selection; user confirms via Done button or outside click.
- MultiSelect trigger now shows single selected value or 'N Selected' instead of inline pills (improves compactness).
- Console: removed duplicate inline "Clear Filters" button (single consolidated clear control retained below filters).
- Cache Panel: modern responsive redesign (constrained width, padded scroll region, sticky header, refined table sizing & spacing).
- Dialogs: Image viewer, All Images, Body HTML preview, Body HTML editor, Add To List now use unified panel layout (consistent max width, sticky header, internal padding) replacing ad-hoc max-w classes.
- Lists Page: Toolbar now displays 'Filtered of Total' product counts (parity with Console) plus selected count.
- Lists Page: Unified styling of Compare At, Cost, SEO Title, SEO Description columns; single Body HTML column now shows View/Edit button depending on mode.
- Lists Page: Additional column headers now use native table header styling (removed custom span styles) for perfect alignment with core columns.
- Lists Page: Drag-and-drop column reordering with persistence (localStorage), excluding selection & view columns.
- Lists Page: Column drag target now shows vivid green insertion bar for precise drop positioning.
- API: `/api/user/prefs` endpoint (temporary in-memory) for storing per-user preferences (column order groundwork).
- Lists Page: Column size persistence (local + server) with Reset Sizes control.
- Lists Page: Header min-width adjustments (Product Type, Updated At) & enforced single-line titles to prevent wrapping.
- Lists Page: Standardized header internal spacing to eliminate icon/divider crowding.

### Fixed
- Lists Page: Column resize no longer unintentionally initiates drag; drag restricted to dedicated grip handle.
- Console Select All Products logic now directly maps all filtered top-level products (tableData) ensuring count & disabled state stay accurate across pagination.
- Select All now also selects variant rows where applicable & dialog gains description to resolve accessibility warning.
- Force service worker version bump (v6) to ensure updated UI assets load for existing clients.
- Add To List now includes ALL filtered products after Select All (previously only first page subset).
- Console multi-select filters: resolved infinite render loop (Maximum update depth) by preventing redundant store filter normalization & deriving option lists from base dataset instead of already-filtered tableData.
- Console filter toolbar alignment: removed redundant labels inside multi-select components for consistent vertical centering with single collection select.
- Console multi-select: fixed duplicate key warnings by scoping collections to a single selected store; dropdown now closes on outside click & after each selection.
- Lists Page: Option column header divider overlap resolved using fixed-width transparent spacer.

### Deprecated
- (none)

## [1.9.6] - 2025-09-05
### Added
- Global confirmation modal system (`ConfirmProvider` + `useConfirm`) replacing native `window.confirm` for destructive actions.
- Centralized promise-based confirm UX (title, description, variant styling) with consistent theming.
- Async confirmation support with loading spinner, custom processing text & inline error feedback (bulk list item removal, store & list deletion, cache purges).
- List Detail page: Preview Mode vs Edit Mode toggle.
- Inline editable product fields inside lists (Title, Vendor, Type, Price, Compare at Price, Cost per item, SEO Title, SEO Description, Body HTML).
- New exportable columns: Compare at Price, Cost per item, SEO Title (70 char max), SEO Description (160 char max).
- Body HTML / Liquid dual-pane modal with live preview.
- Dirty tracking & bulk save (PATCH) for list item edits.
- `PATCH /api/lists/:id` endpoint for partial item updates.
- Storage helper `updateListItems` with variant price/compare/cost merge logic.
- Reusable `Textarea` UI component and `components/ui` barrel export index.

### Changed
- Lists, List Detail, Stores & Cache maintenance actions now use themed confirmation dialog instead of browser dialogs.
- Destructive actions show in-dialog progress instead of blocking UI silently.
- Sortable product table headers invert styling on hover when unsorted for clearer affordance.
- Light theme accent & ring tokens unified to brand accent `#6BBB77` (parity with dark theme change in 1.9.5).
- List Detail table styling aligned with Console table density & surface tokens.

### Fixed
- Module resolution for new textarea via barrel index.

### Deprecated
- (none)

## [1.9.5] - 2025-09-05
- Central `ServiceWorkerManager` (global SW registration + update toast) replacing per-page logic.

- Service Worker strategy: network-first for build assets; reduced precache scope; consolidated update polling (5m interval).

- Stale asset issue requiring manual SW unregister (automatic reload on controllerchange now).

- Per-page SW registration/update code on Start page (removed).

## [1.9.4] - 2025-09-05
### Added
- Unified store management features: single & bulk add of Shopify stores, sequential batch refresh with aggregated log panel.
- Lists management enhancements: inline create, edit (rename), delete actions with new PUT & DELETE list API endpoints.
- Reusable `LogPanel` component shared by batch refresh and future streaming tasks.
- List rename & delete storage helpers (`renameList`, `deleteList`).
- Design System: Montserrat font integration, semantic surface tokens (light & dark), JS design tokens module (`lib/designSystem.ts`).
- Variant option analyzer: multi-option inference, variant image mapping, fallback image resolution via `image.variant_ids`.
- Variant count badge in Product Title column (excludes single `Default Title` variants).

### Changed
- Console table pagination: product-level pagination (variants no longer count toward page size).
- Console table pagination controls now use compact icon buttons.
- Images column truncates thumbnails to fit and always reserves a slot for the "+N" overflow indicator (prevents vertical expansion; recalculates on resize).
- Standardized sortable header sizing with enforced min widths (prevents icon/divider overlap & truncation).
- Auto-scroll refinement ensures last expanded product + deepest variant row stays in view.
- Stores page redesigned: consistent table styling, stats badges, integrated batch refresh logs, clearer action grouping.
- Lists page redesigned: consistent styling, inline editing UX and consolidated actions.
- Modernized Stores & Lists pages with brand green accent, filter inputs, skeleton loading states, compact icon actions & relative time badges.
- Console deep-link: opening from a store row now passes ?store=host param and auto-applies store filter.
- Stores page refinement: removed header icon, unified top border style, modern header layout, separated Products / Collections columns, consistent button styling, single multi-entry add field with automatic multi-URL parsing & dedupe.
- Lists page refinement: removed header icon avatar, unified header style, improved layout & filter placement, adjusted column widths for clarity.
- Unified Stores & Lists table header height with Console product table for consistent compact density.
- Legacy `ProductTable` component deprecated & stubbed; `/app/console` is the canonical product management view.
- Global theming overhaul: improved dark mode inversion (all surfaces), refined green brand palette, consistent header/backdrop surfaces, accessible focus ring & scrollbar styling (supersedes interim preference panel; theme & density auto-respect system + toggle).
- Cache panel redesign: metrics cards, responsive full-width modal, dark-mode consistent surfaces & accessible table layout.

### Fixed
- Select dropdown panels now respect viewport height (overflow clamp & scrolling).
- PWA manifest icon loading (added maskable icons & precache) eliminating 192px icon 404.
- Table header icon / divider overlap from earlier dynamic sizing attempts.
- Dark mode table cell inversion regression.
- Corrupted columns definition file fully reconstructed (stability restoration).

### Deprecated
- Legacy `ProductTable` (will be removed in a future release).

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

[Unreleased]: https://github.com/kendrick-gs/scrapper/compare/v1.9.7...HEAD
[1.9.7]: https://github.com/kendrick-gs/scrapper/compare/v1.9.6...v1.9.7
[1.9.6]: https://github.com/kendrick-gs/scrapper/compare/v1.9.5...v1.9.6
[1.9.5]: https://github.com/kendrick-gs/scrapper/compare/v1.9.4...v1.9.5
[1.9.4]: https://github.com/kendrick-gs/scrapper/compare/v1.9.3...v1.9.4
[1.9.3]: https://github.com/kendrick-gs/scrapper/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/kendrick-gs/scrapper/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/kendrick-gs/scrapper/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/kendrick-gs/scrapper/compare/v1.8.0...v1.9.0
[1.7.0]: https://github.com/kendrick-gs/scrapper/releases/tag/v1.7.0
