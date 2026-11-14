# Mox integration · Saga Fight 4.0

Canonical handoff: Mox BUILD1.4, source 91090354a4c8fcba7dddc18f08517306bcd02377. All five supplied snapshot hashes were verified. The original character, limb/punch drawing, fire ribbons, sparks, softFlare and debris functions remain verbatim in web/mox/visual.js; tests retain their hashes. 72 native Canvas comparisons across forms, directions and poses matched pixel-for-pixel. The separate Mox lab is untouched.

Arena conventions: Mox uses the shared 1000 HP pool rather than the lab's experimental1500. All damage/range/cooldown values follow the handoff, including exactly87.5×4 ranged R (350 total), W500, and melee R400 on one target. Arena Y/collision/platforms replace lab floor/AI/respawn. A one-slot native buffer and exact punch spring are reused. Ranged basic keeps a fixed release origin for aerial range tests. Very close melee grabs retain their real grip distance.

Host owns forms, immunity, invulnerability, grabs, burn and hits. Captured entities are owned by fighter ID and released on interruption, death, recovery or round reset. Mox projectiles/effects and pose state are serializable; guests animate and interpolate rotation without applying damage. Original melee impact shake uses amplitude17/decay8 and is synchronized. The world camera shifts only when a high grab would leave the frame.

Checks: supplied16-check lab suite, shared combat/touch/performance/room suites, native renderer parity, Mox deterministic arena mechanics, mirror immunity, platforms, source/target death cleanup, sustained AI combat and independent host/guest synchronization. Browser QA covers roster selection and entry into the arena. Physical iPhone performance has not been measured.
