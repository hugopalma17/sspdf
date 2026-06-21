# Changelog

## [1.3.2] - 21-06-26

### Security

- Clamp RGB color values to the 0-255 range before passing them to jsPDF.
- Centralize image path containment logic and enforce it consistently during both rendering and height estimation.
- Add a 50MB default size limit for image files to prevent memory exhaustion from malicious or accidental huge inputs.

### Fixed

- `drawRow` no longer skips empty strings or `0` values for `leftText`/`rightText`.
- Use a single `PT_TO_MM` constant shared between `core/shapes.js` and `core/units.js`.

### Tests

- Add tests for RGB clamping, image path traversal rejection, image size limits, and row edge cases.

## [1.3.1] - prior

- Introduced image path containment: `image` operations require relative paths inside the working directory.

## [1.3.0] and earlier

- See git history for earlier changes.
