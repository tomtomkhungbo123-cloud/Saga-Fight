# Saga Fight 5.0: confirmed chains and cancels

Combat runs on the existing fixed120Hz host simulation. `COMBAT_CONFIG` near
`web/game.js` is the one balance table: normal startup/recovery/hitstun, chain
windows/roles/usage caps, whitelisted special cancels, per-use costs, 150ms input,
two extension points, 3s continuous-control budget and scaling100/95/85/75/65/50%.
Practice tuning is separate and never changes the competitive defaults.

## Verified routes (stationary ground target; actual adapter/projectile physics)

| Fighter | Route | Verified start distance | True hits |
| --- | --- | --- | --- |
| Soulblade basic | N1 → N2 → N3 |80|3|
| Soulblade recovery cancel | N1 → Q → N2 → Q → N3 |100|11|
| Soulblade full-spin/link | N1 → full Q → N2 → full Q → N3 |80–100|11|
| Thunder Stance / Thunderspam | R → N1 → N2 → Q → N3 |150|7|
| Mox melee | N1 → W → N2 → N3 |80|5|
| Cylast | Q → N1 → N2 → N3 |80|4|

These are measured local simulation routes, not promises at all distances or
network delays. Thunder N1→Q alone has a startup gap: the defensive dummy detects
it. Ranged normals retain real travel time. Mox W's two curved orbs can miss a
moving target or arrive too far apart; they do not magnetize/extend hitstun.
Cylast can cancel normals into Q/W, but Q's650ms cast is not automatically true.
Soul Q→Q is the only explicit offensive special-to-special cancel. Its4 quarter
turn contacts total95 base damage; the cancel window opens only after the final contact. Interrupting a cast closes its remaining contacts.
Each accepted Q consumes exactly one charge, recharging separately in5s.

## State and safeguards

- One150ms input slot per fighter. Expired input is discarded; it is consumed
  once. Native lab buffers and the legacy four-action queue do not drive combat.
- Each offensive use carries an ID and captured scale; each projectile/contact
  carries a hit ID. One skill's multiple hits share its scale and extension cost.
  Old projectiles/zones survive a cancel; the canceled melee action does not.
- True continuity ends on the first simulation tick the defender can act. Popup
  persistence never bridges a gap. DOT, bleed detonation and movement utilities
  do not add hits, stun, extensions, or keep a true chain alive.
- A defender's first confirmed lock fixes its continuous deadline; later hits
  cannot reset it. Long Thunder sequences use a short ending if they do not fit.
  Mox's full capture includes the grab animation plus post-impact control; if
  insufficient budget remains it uses a short400-damage finisher without capture.
- N3, Soul R and Mox R finish with knockback/fall and recovery protection. Existing
  hitboxes cannot immediately recapture. A committed finishing multihit use can
  finish its damage sequence without new control; the animation is not truncated.
- Current extenders do not relaunch. The configurable `relaunch` flag charges one
  extra point if a future extender adds a relaunch; the policy is tested.
- Root only restricts movement/jump. Freeze/hitstun/capture restrict actions.
  Cylast R remains anchored radius400,3s, no root,100 per tick. Healing is capped
  at20 per tick and20% of HP damage actually dealt after scaling/mitigation.
- Soul bleed stores its scaled60 base plus1% of later actual damage. Detonation
  is non-stunning DOT and cannot increment its own or another bleed accumulator.
- Mox Q retains2s cooldown /1s immunity to new CC; no cleanse, no combo reset.
  Thunder W retains115 damage, push100,0.2s stun. Thunder R retains3×100 damage.

## Verification and limits

`node --test tests/*.test.*` covers real character adapters, whiff/block cancel
gates, timing windows, one-shot buffers, charge recovery, scaling, hit IDs,
control limits, early/full Q contacts, DOT and bleed recursion, capture cleanup,
free-cooldown spam, bounded snapshots, keyboard/pointer equivalence and host/guest
synchronization. The real frame accumulator is exercised at30/60/120/144Hz with
the full-spin Soul route; damage/scaling and true-hit count agree.

The defensive sandbox dummy evades on its first free tick (jump +180ms simulated
evasion). It is a gap detector, not a new player block mechanic. Finisher recovery
is not reported as a combo gap. Current artwork/character contours are preserved;
Soul normal2 reverses the existing sword trajectory and uses that same path for
its trail. No new high-density VFX or per-frame sprite allocations were added.

Still requires playtesting on physical iOS devices and real-network latency:
150ms input tolerance, individual cancel windows, push distances and the overall
3s/2-point limits are initial balance values, not a claim of completed competitive
balance. Transport remains host-authoritative; the guest never confirms damage,
scaling or combo state locally.
