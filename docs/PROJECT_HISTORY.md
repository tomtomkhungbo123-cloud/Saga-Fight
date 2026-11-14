# Saga Fight — Đấu trường thời gian

1vs1 platform fighting game using the supplied Forgotten Cavern map and the two supplied character prototypes.

- PvE: three difficulty levels; player selects either fighter and opponent.
- PvP: two players on the same keyboard; no online networking.
- Best of three, 99-second rounds, HP tiebreak and replay for drawn rounds.
- P1 A/D, J double jump, Space attack, Q/W/E/R abilities, S drop through platform.
- P2 arrows, Up double jump, Enter attack, 1/2/3/4 abilities, Down drop through.
- Escape pauses. Focus loss pauses automatically. Sound toggle, fullscreen, touch controls for P1.
- 1000 HP each; character damage/cooldowns from supplied handoffs. Thunder basic 600; Soul basic 200; Soul Q 400 with independent charges; W delayed straight throw/recast; E 80% mitigation; R landing impact and delayed bleed.
- Arena traversal adds double jump with 900 launch speed; platforms use one-way top collisions. Character abilities retain their special jump/teleport motion.

Source art: provided arena image; Thunder pose images reused from Thunder Stance lab; Soulblade procedural renderer adapted from build 2.7 source. Existing character Sites are unchanged.

Simulation runs at a fixed 120 Hz with bounded catch-up, DPR capped at 1, cached background and reusable silhouette paths. Visuals are procedural / pose blends, not newly drawn frame-by-frame sprites. Damage uses gameplay range/height checks. Balance is a prototype.

Validation: Node syntax checks; deterministic VM simulation checks for independent Q charges, E mitigation, W throw/warp, R landing/bleed, projectile collision, platform landing/drop, match progression and AI combat. Browser preview checked for menu/start, HUD and PvE, with cloud browser FPS varying. Real hardware performance and cross-browser/mobile keyboard behavior require further playtesting.

Static HTML/CSS/JS, no build required. The canonical source and hosting manifest are versioned together.

## Build 1.1 — reference proportions and keyboard input

- PvE arrow keys now control P1 (left/right, up jump, down drop); PvP keeps arrows assigned to P2.
- Canvas receives focus on start/resume and click. Game input capture is independent of stale hidden select/button focus; physical key fallback is supported.
- Uniform canvas scaling preserves the supplied character silhouettes at every viewport size, including fullscreen. Pose-specific height, hover, cloth follow-through and the orb above the extended hand restore Thunder Stance's reference design.
- Keyboard regression checks cover both key maps, release/deceleration, arrows after select focus, jump, and held movement across countdown. Browser PvP verified movement of both fighters and reference proportions.

## Build 1.2 — Thiên phạt stun

Each successful Thunder Stance R lightning strike applies 1.5 seconds of stun. A second hit refreshes the remaining duration to 1.5 seconds; durations do not stack. Stun blocks movement, jump, drop-through, AI decisions and new casts, cancels queued/current actions, and displays orbiting stars and a countdown. Gravity and already released projectiles continue. Cancelled Soulblade E starts its normal cooldown. Other attacks retain their previous behavior.

Verified by simulation: 1.5-second expiry/control restoration, second-hit refresh, miss/other-attack exclusion, action/input blocking and AI blocking. Existing combat and keyboard regression checks pass.

## Build 1.3 — finishing slow motion

A lethal hit enters a finishing phase for 1 real second at 0.18x simulation speed before showing the round/match winner. The finishing phase animates the existing poses, particles and projectile motion, stops the round clock, and blocks new input, AI decisions and damage. Timeout outcomes are immediate. Pause/resume preserves the remaining finishing time.

Simulation checks verify the real duration, slowed simulation time, hidden victory overlay until expiry, single score increment, timeout behavior and pause/resume. All prior combat/input checks pass.

## Build 1.4 — Soulblade R reference impact

Soulblade R uses a dedicated vector impact renderer traced from the supplied Skill 4 reference: a broad pink-red mass, long asymmetric blade tips, dark red rear silhouettes, and thin lateral streaks. The prior evenly spaced spike crown and circular ground ring remain exclusive to Thunder's slam. The impact grows rapidly, holds its peak outline and then fades. R's range, landing trigger, damage, bleed and finishing slow motion are unchanged.

Validation: native Canvas renders at start, expansion, peak and fade; JS syntax and the complete existing combat/input/finishing simulation suite pass.

## Build 2.0 — iOS controls and online rooms

### Play

Choose **Online**. Select your fighter, create a room and share its six-character code or copied link. The other player chooses their fighter and joins. The host is P1, the guest P2; both can use the same A/D or arrow, jump, attack and Q/W/E/R controls on their own devices. Both click Ready to continue the next round or rematch. PvE and local keyboard PvP remain available.

The touch gamepad has independent left/right/down pointers, jump, attack and four skills with cooldowns/charges. Pointer capture and cancellation prevent stuck movement when fingers slide off a button; simultaneous movement and skill fingers are supported. Landscape uses the full viewport with safe-area padding; portrait has a compact control panel. Fullscreen falls back to a CSS immersive view where unavailable. Focus loss/backgrounding pauses a live match.

### Source/build

- `web/` is the browser source and artwork, replacing the old editable `dist/` layout.
- `worker/index.mjs` serves the embedded frontend and room API.
- `drizzle/0000_online_rooms.sql` and journal define the room schema; hosting binds D1 as `DB`.
- `node scripts/build.mjs` deterministically embeds all web assets into `dist/server/index.js`. `dist/` is generated.
- `npm run dev` is the preview server with a local SQLite D1-compatible adapter; `npm test` runs API and combat regression checks.

Room admission is atomic with at most two players. Independent random player tokens are hashed at rest and required for all sync/leave calls. Room links contain only the public invitation code. Same-origin checks, bounded payloads, short-lived rooms and bounded expiry cleanup are implemented.

Online uses host-authoritative snapshots with acknowledged, deduplicated guest action events and interpolated guest positions. WebRTC data channels are attempted for low latency; authenticated HTTP state exchange remains available when a network cannot establish the peer connection. Presence loss pauses the host and displays reconnect status. A room closes when either player leaves. Browser reload does not reclaim a room; create a fresh room after reloading.

Validation: API create/join/sync/authorization/expiry/full-room tests; complete prior combat/input suite; browser two-session join with remote skill observed on the host. Touch pointer independence and ready/rematch logic are covered by targeted tests. Actual Safari/iPhone hardware and real mobile-network performance have not been measured in this environment.

## Build 2.1 — prevent unwanted iOS zoom

The active play surface, HUD and gamepad now disable touch gestures, with non-passive Safari gesture and rapid-tap guards. Gamepad taps retain their pointer-driven actions; rapid taps on ordinary UI buttons preserve the click when Safari's synthesized click is cancelled. Help/menu interactions remain available, and mobile text inputs/selects use 16px text to avoid focus zoom. No global viewport zoom lock is required.

Regression checks cover rapid taps without duplicate attacks, multitouch/pinch cancellation, UI click preservation, noncancelable events, help/menu/form exclusions, existing multitouch controls and online combat.

## Build 2.2 — thumb layout and combo sweep

Movement has two larger left-thumb targets with a separate lower drop button. The right-thumb attack is larger, Q/W/E/R form a fan above and to its left, and jump sits alongside attack. Holding a movement finger can slide directly across to change direction. Holding an action finger can sweep through other action buttons to queue each crossed action once per gesture, without lifting or duplicating a cast when revisiting a button. Existing two-finger controls and zoom guards are retained.

Inputs up to 160ms before a cooldown/charge is ready now remain buffered until readiness. Longer cooldown presses are still discarded. Combat durations and cancel windows are unchanged.

The in-game home shortcut has been removed. Home is now the **Về trang chủ** button in the pause overlay; the gamepad hides while paused. The floating pause button is separated from movement.

Checks: movement slide/release, combo sweep order/deduplication while continuing to move, early cooldown buffering, pause/home placement, and the existing combat/network/touch regression suite. Fullscreen browser visual check confirmed the fan layout and spacing.


## Build 2.3 — Saga Fight

Renamed the visible brand, header edition, browser title, pause branding and footer to Saga Fight. Main menu headline is ĐẤU TRƯỜNG THỜI GIAN. Existing URL and gameplay are preserved.

## Build 2.4 — character skills in pause

The pause overlay shows the selected fighter's normal attack and four abilities, with descriptions, damage/protection, range, cooldown and current cooldown/charge/recast status. PvE displays P1; online selects the local host/guest fighter; local PvP has P1/P2 tabs and player-specific key labels. The panel scrolls on smaller screens, while Continue and Home remain available below it. Pause uses a full viewport overlay and allows vertical touch scrolling while retaining the zoom guard.

Verified character selection, live charge display, PvP key labels, online guest ownership and exclusion from win screens in the simulation suite. Browser visual check confirmed both character guides and the pause actions.

### Build 4.4 — practice and mirror matches
- Sandbox is local practice: select both fighters, toggle normal/free cooldowns,
  switch between a standing target and normal AI, and reset positions/stats.
  Damage cannot end a practice session; HP refills after 1.8s without damage.
  Total P1 damage, hit count and elapsed-session DPS are shown in its panel.
- In a mirror match, P2 gets an alternate palette consistently on both online
  clients. Sprite recolors are cached once and vector colors are cached; the
  renderer's original contours/poses and arena colors remain unchanged.
- Damage that removes HP counts as a hit. Five consecutive hits show COMBO;
  1.5s without a hit or receiving damage ends the chain, then its popup fades
  for 0.8s. Shields/invulnerable misses add no hits. Each fighter's combo state
  travels in the existing authoritative online snapshot and resets per round.

### Build 5.0 — confirmed chains / links / special cancels
See [combat rules, verified routes and limits](docs/combat-5.0.md).
This replaces the former1.5s combo-gap timer: a true chain now ends as soon as
the defender regains an action. One150ms input slot, per-use scaling, two extension
points and a fixed3s continuous-control budget govern all four character adapters.
The sandbox now includes a defensive dummy, combat telemetry and isolated tuning.

### Build 5.2 — bleed, shatter and melee grab
See [status rules and validation](docs/combat-5.2.md). Soulblade bleed gains 3%
of base explosion damage per direct-hit stack (max ten); Cylast can shatter its
own Q freeze with one 110% normal; Mox melee R preserves common combo state
through capture and records just its slam. Status visuals use bounded cached FX.

### Build 5.3 — scene fades
Initial entry fades in; local match entry, replay/next round and returning home
use a 220ms fade out and 360ms fade in around the scene change. A single opacity
layer blocks repeated input and follows the fullscreen subtree. Reduced-motion
devices switch without animated fading. Online entry uses a presentation-only
reveal without delaying the authoritative combat clock or snapshots.
Browser preview verified start, pause/home and removal of the input-blocking
layer after both routes. All 32 existing regression groups pass. Physical iOS
visual smoothness remains to be checked on device.

### Build 5.4 — supplied SFX
All48 supplied cues now follow actual cast, projectile, hit and status events.
Header and settings controls share a saved toggle and0–100% volume slider.
Audio unlocks from a trusted gesture, decodes once and uses a bounded priority
mixer. Online combat cues come from the host with sequence deduplication.
See [cue mapping and verification](docs/audio-5.4.md).

### Build 5.5 — ultimate camera shake
Thunder R shakes on each of its three real strikes, with a stronger final beat.
Soulblade R shakes on landing; Mox melee R on slam (not capture), and ranged R
on actual projectile damage. Shake shares a capped18-unit camera envelope,
uses the existing decay clocks, and moves the cached background with the scene.
HUD remains still. No new particles, blur or background redraws are introduced;
the camera offset is reused rather than allocated each frame. Reduced-motion
preferences disable shake. Host snapshots now carry both existing shake channels.
All37 regression groups pass, including impact timing, cap/reset, reused offset
and equivalent decay at30/60/120/144Hz. Physical-device FPS remains unverified.

Build 5.6 merges the four character SFX V2 patches and adds lifecycle-managed Cylast loops plus Mox ranged ultimate hit audio. Combat parameters are unchanged. See `docs/audio-5.6.md` for timing, limits and verification scope.
