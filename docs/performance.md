# Rendering optimization · build 3.3

Scenery is drawn once on a separate canvas, invalidated on resize or map readiness. Canvas layout reads are cached behind ResizeObserver. Combat remains fixed at 120 updates/second while drawing is capped at 60 frames/second. Frozen screens stop repainting. HUD text/HP writes occur only on change. Thunder bolt bloom has a 96-entry / 4-million-pixel LRU bound. The framebuffer is capped near 1.3 megapixels and scales between 65–100% based on measured rendering cost, recovering gradually. All hitboxes, timings, controls and character drawings are retained.

Native Canvas benchmark, same 1200×838 viewport, 90 frames per scene. This measures renderer CPU cost rather than browser/device FPS. Run `node scripts/benchmark-render.cjs` with the runtime Canvas dependency available via CODEX_PRIMARY_RUNTIME_NODE_MODULES.

| Scene | Before mean / p95 ms | After mean / p95 ms |
| --- | --- | --- |
| Idle | 1.56 / 1.82 | 0.42 / 0.54 |
| Soulblade Q | 2.05 / 2.73 | 1.00 / 1.38 |
| Thunder R | 2.27 / 3.63 | 0.59 / 1.68 |
| Cylast R | 4.86 / 6.06 | 1.99 / 2.48 |

Regression coverage includes 120Hz rendering vs simulation, paused redraw suppression, resize invalidation, pixel/memory bounds, adaptive recovery, existing combat/touch/online suites, and preserved Cylast silhouettes/VFX. Device-specific sustained FPS still depends on browser, GPU, thermals, and other active applications.
