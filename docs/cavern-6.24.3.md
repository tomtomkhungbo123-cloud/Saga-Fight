# Hang đá lãng quên 6.24.3

Cavern camera scale is now 75% of 6.24.2, making fighters and effects smaller through a uniform world-space zoom. Simulation positions, collision geometry, damage and skill ranges remain unchanged.

The old screen-sized CSS background could expose its top edge during jump tracking. It is replaced by a cached world-sized scenery plane with side, ceiling and bottom overscan. Only outer scenery is extended; original ground/platform pixels retain their world alignment. Ceiling padding uses the upper scenery strip without duplicating floating platforms. Camera tracking is bounded within the padded view, including shake safety. Background and fighters share matching camera offsets, at any render resolution. The background plane is cached once and composited for panning; there is no full atlas repaint per frame.

Validation: 79 tests passed, 0 failed, including 2400 full render frames, opaque screen-edge pixels at multiple extreme jump heights and shake offsets, varied aspect ratios, preserved world geometry and no flat upper image band. Browser QA verified zoomed cavern framing. Physical mobile/LAN verification remains unperformed.
