# iOS touch control arc

The iPhone/iPad action cluster follows the supplied reference: four skills arc around the left/top of a larger central attack, with jump separated at the upper-right. Existing graphics, bindings, opacity, size settings and joystick behavior are retained.

The layout is scoped to iOS, including iPad desktop-style user agents. Safe-area padding and viewport width/height caps keep controls inside the screen; interactive targets remain at least 44 px.

Validation: geometry tests cover 13 phone/tablet viewports in portrait and landscape at 13 size settings (80–140%), plus device detection and existing iOS/touch regression tests. A browser fixture using the actual controls markup and styles was visually checked at 852×393 and 1024×768. The fixture forces touch visibility on desktop Chrome; this is viewport QA, not testing on physical Apple hardware. See qa/ios-controls-preview.jpg.
