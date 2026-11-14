# Build 5.4 — supplied SFX integration

The supplied README, manifest and all 48 WAVs are retained under `web/sfx/`.
The offline sound lab and generator are not served or executed. The old oscillator
beeps are replaced by the supplied buffers. Damage, cooldowns, ranges, scaling,
CC budgets, collision and animation timings are unchanged.

| Cue family | Actual trigger |
| --- | --- |
| UI hover / confirm / back | Mouse hover, accepted UI click; no confirm layered on combat buttons |
| Scene transition | Existing fade-out starts |
| Round start / KO / victory | Countdown reaches fight / lethal finisher begins / result appears |
| Jump / land | Successful jump / airborne-to-ground physics transition |
| hit_1..3 / block | Deduplicated direct HP damage / actual shield absorption; no generic DOT hit |
| Special cancel | Confirmed normal/special recovery cancelled into a permitted skill |
| COMBO 5 / 10 / 15 | Actual combo count first reaches that exact threshold |
| Soul normal 1..3 / Q | Normal swing animation begins / accepted spin begins |
| Soul W throw / blink | Sword is released at .18s / actual reactivation warp |
| Soul E / R cast | E transform at .5s / R animation starts |
| Bleed apply / explode | Mark is created once / actual expiry explosion effect |
| Thunder normal / Q | Normal bolt / Q projectile release at .5s |
| Thunder W orb / stomp / E | W lift starts / landing stomp / accepted teleport |
| Thunder R strike | Each real bolt at .5, .85 and 1.2s, including misses |
| Mox melee / shot | Normal punch contact animation / each actual normal or W projectile release |
| Mox bullet hit / transform | Direct projectile HP damage / accepted form change |
| Mox R grab / slam / barrage | Visual catch / actual slam / each of four projectile releases |
| Cylast normal / Q freeze | Normal projectile release / owned freeze actually applied |
| Cylast shatter | Owned freeze consumed once by valid normal |
| Cylast W cast / rain hit | Zone released / actual damaging tick, at most once per100ms per owner |
| Cylast E / R / lifesteal | Ward cast / storm zone released / actual HP healed |

## Playback and devices

The existing header toggle and the settings dialog both control the same local
preference. Volume0–100% and enabled state persist per device. Defaults remain
sound off, volume60%. Home and pause settings use the same dialog.

A trusted pointer or keyboard gesture creates/resumes AudioContext (including
the webkit fallback) and starts a silent one-sample buffer for iOS unlock. Four
concurrent loads decode each WAV once per page; subsequent events reuse buffers.
Sounds missed while locked/loading are dropped, never played late in a burst.

Master gain, compressor, spatial pan and a16-voice cap bound mixing. KO, ultimate
impacts and COMBO cues have priority; rain/lifesteal are quieter and throttled.
Pause/menu/reset fade active combat voices. Backgrounding stops playback and
suspends the context; a later gesture resumes it. UI cues remain centered.

## Online

The host emits monotonic sound events at real simulation events; the latest32
are carried with its snapshots. Guest rendering never generates speculative hit
audio. A guest consumes each sequence number once and drops events older than
400ms of snapshot simulation time. Settings are local and not network state.

## Validation

All36 test groups pass: all48 PCM files, unlock/fallback/resume, one-time loading,
volume persistence, mute/voice cleanup, priority under16-voice saturation,
actual hit/miss/duplicate/DOT behavior, Thunder bolt times, bleed/shatter,
Mox grab/slam/barrage, combo thresholds and two-client authoritative audio with
duplicate snapshot suppression. Existing combat, touch and frame-rate checks pass.

Browser preview decoded the complete WAV bank successfully and verified toggle,
volume change and persistence after reload. Physical iOS speakers/headphones,
Bluetooth delay, subjective mix balance and real-network listening are unverified.
