# BUILD6.9 — aggressive PvE and projectile defense

Baseline:acb931e0ace86a78183956e0c25cc2dff3cccc38(BUILD6.8),checkpoint-before-pve-6.9.

Changes confined to the PvE AI region of game.js and build/cache marker in index.html; generated Worker rebuilt. Combat strength,animation,physics,cooldowns,hitstun,grab,cancel/scaling/control budgets,graphics/audio and online protocol unchanged.

## Why6.8 felt slow

- Artificial AI recovery pause was added after the actual move recovery,then positioning/observe holds added further waiting.
- Defense was explicitly disabled during that artificial pause.
- Generic defense often moved backward along a projectile's flight path,delaying rather than avoiding impact.
- Short-range fighters could close during a visible projectile cast and only start reacting once the bullet was already too close.
- Instant Mox transformation succeeded in combat but the AI acceptance detector expected a new action object and recorded it as rejected.

## Implemented

| Difficulty | Visible-situation latency target | Tactical evaluation | Extra AI pause after move recovery |
|---|---|---|---|
|Easy|90–140ms|32ms|130–210ms|
|Normal|50–90ms|24ms|76–134ms|
|Hard|30–60ms|20ms|50–96ms|
|HELLMODE|20–36ms|16ms|36–72ms|

These three timing controls are exactly1/5of6.8. There is no objective universal difficulty multiplier:damage output/win rate cannot be promised5xwith unchanged combat. Movement commitment holds remain longer to avoid direction jitter. Perception samples visible information at up to62.5Hz,with randomized delayed delivery,bounded24samples and up to6nearby projectile observations per sample.

- Much higher attack commitment,reduced missed-opportunity probability,small/rare feints,attack as soon as useful range opens rather than always walking to preferred center range.
- Conditional score with bounded noise replaces broad weighted randomness. Confirmed N1/N2 and charge/finisher choices carry stronger weights. After a move ends,confirmed-hit link opportunities are checked before optional AI rest; normal engine legality/cooldown/window gates still apply. Followup stats mean accepted legal attempts from a confirmed hit,not a guarantee of a true combo.
- Defense works during optional AI rest,while real startup/recovery/hitstun still prohibit unavailable actions.
- Threat evaluation uses observed animation age,facing,range and measured projectile position/velocity. Straight projectile warnings and visible Thunder Q windup inform time-to-intercept estimates. No player input/buffer/future decision is read.
- Bot times evasions instead of always dodging immediately. Native Mox dash can cross a projectile under its existing immunity; Thunder blink can cross a nearby bolt; other characters can jump across and use their legal second jump. Rechecks persistent projectile danger after a reposition. Guard moves retain their startup and are not treated as instant dodges.
- Instant Mox Q accepted once based on actual form change; cooldown still prevents a second activation.
- Attack commitments cannot be freely canceled for defense. Incorrect decisions,commitment windows and resource exhaustion remain punishable. No privileged escape from stun/root/grab added.

## Validation

node --test tests/*.test.*:64passed,0failed(~11.69s). Worker+90embeddedassets built;git diff --check clean.

Existing366simulation cases rerun:5characters,2Moxforms,4difficulties,9player behaviors,all25ordered matchups at Hard/HELLMODE,30/60/120Hz stepping. Original combat/HIT/COMBO/status/audio/render/touch/network regression checks pass. Short scenarios do not prove full-round matchup balance.

Matched6.8→6.9scenarios(8s,capped by KO;366cases per version,same scripted situations/seeds):

|Difficulty|Mean accepted actions,before→after|Mean idle fraction,before→after|
|---|---|---|
|Easy|3.80→11.63|.47→.18|
|Normal|5.33→11.91|.32→.14|
|Hard|6.94→12.81|.24→.16|
|HELLMODE|7.75→13.30|.19→.15|

Damage is not multiplied. In45paired Hard scenarios,mean actual damage502.74→698.60;HELLMODE513.31→722.66. More aggression also exposes the bot:HELLMODE took78.68meanHP in the new paired set,versus168.64before;this is not a win-rate guarantee.

Controlled native Thunder Q trials:20identical seeds×5defending characters×4levels=400per version. Offensive resources were disabled equally in both versions to isolate defense;native evasive resources/physics remained available. Counted actual authoritative HP/shield hit events,not attempted dodges.

|Difficulty|Hits received per100trials,6.8→6.9|
|---|---|
|Easy|97→49|
|Normal|92→14|
|Hard|81→13|
|HELLMODE|91→0|

A single clearly telegraphed bolt in this setup is predictable.0/100does not mean invulnerability or perfect defense against simultaneous attacks/close-range commitments. The live-pressure/matchup tests retain received damage and whiff/recovery openings. Unit tests specifically cover native defense during optional AI rest,5xtiming ratios,Mox form activation exactly once,receding/off-height projectile rejection,and stun input cleanup.

CPU benchmark:18511actual AI calls,mean7.321µs,p9512.609µs,p9986.972µs. Prior6.8runmean3.264µs. More threat evaluation has measurable CPU cost,but remains~.0073msmean in this headless environment. No renderer/quality reduction introduced;these are not physical-device FPS results.

Reproduce baseline simulations with SAGA_AI_SOURCE pointing to game.js from the baseline commit;tests/pve-defense.test.cjs supports SAGA_DEFENSE_OUTPUT. Latest controller thresholds and all shared combat tests run without that override.

Limits:this update was verified through actual headless game simulation and native regression tests,not human playtests on phones. Real iOS/Android FPS,input feel,long matches and broad player win rates remain unverified. Tune reaction/rest/defense/score weights after further player feedback;do not interpret nominal5xtiming as a measured5xdifficulty.
