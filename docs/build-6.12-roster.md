# Build 6.12 — Compact fighter picker

The menu now displays one compact selected-fighter summary for each player. Opening a summary shows the five original fighter cards in a native modal dialog. Desktop uses five equal columns; narrower screens use three or two columns, with the fifth card centered on portrait phones. Short landscape screens retain five compact columns. The dialog scrolls internally and locks background scrolling.

Selection updates the original hidden select and dispatches its existing change event, preserving game and online selection integration. Escape, close, outside click and selection close the dialog and return focus to the original trigger. Arrow keys and Home/End navigate the cards. Online room locking and opponent visibility remain respected.

The preview draw function is byte-for-byte unchanged from build 6.11. Existing fighter renderers, palettes, silhouettes, animation, combat and network logic are unchanged. Only visible summaries animate when closed; selected/focused/hovered options animate when open, at the existing 30 Hz limit. Reduced-motion preferences remain supported.

## Validation

- Standard suite: 66/66 tests passed; zero failures (17.62 seconds).
- JavaScript syntax and git whitespace checks passed.
- Desktop browser: five equal 172.39 px cards in a 960 x 445.4 px dialog, within a 1363 x 936 viewport.
- Responsive iframe viewport 390 x 844: dialog 370 x 822.77, two columns; all five choices accessible, no horizontal overflow. Selected Melanta successfully.
- Responsive iframe viewport 844 x 390: dialog 812 x 349.59, five columns, within viewport.
- Keyboard End + Enter selected the opponent's Melanta; original select updated and focus returned to the trigger.
- Escape synchronously cleared expanded state. Online mode hid the opponent selector and updated the player label.
- Selected Mox through the new picker, started PvE and confirmed MOX / close-combat on the in-game HUD.
- Build produced Worker and 90 embedded assets; temporary viewport fixture excluded.

Physical iOS/Android devices and touch input were not available. Responsive viewport checks are not device tests. No FPS improvement claim is made from the cloud browser.
