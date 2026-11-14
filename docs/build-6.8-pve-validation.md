# Saga Fight6.8 — tactical PvE and HELLMODE

Checkpoint before work: checkpoint-before-pve-6.8,42bca433a9bda15bf7ef3ab58c780163e93bd937.

## Code

- web/game.js: replaced chase/random-cooldown AI with observe,approach,space,attack,defend,recover,retreat states. AI_CONFIG contains reaction/think/commit/recovery/defense/chain tuning; AI_STYLES contains per-character/per-Mox-form preferences. window.SagaAI exposes config,profiles,range adapter,debug toggle and inspection.
- Perception samples visible position,facing,animation and projectiles at up to20Hz. Delivery has randomized latency; a bounded24sample FIFO preserves order. Own confirmed hits can enter legal cancel windows without adding perception latency. No reads of player input,queued command or future decisions.
- Tactical evaluation80–160ms; held positioning decisions220–620ms with hysteresis. Physics/animation continue on the existing simulation loop. Own launch waypoint checks and confirmed combo windows run at simulation cadence. Three-platform reachability graph selects intermediate platforms,double jump timing and safe edge launches; compact-platform spacing prevents ranged bots walking off a ledge to seek impossible spacing.
- Requests use existing resource/cooldown/startup/recovery/cancel gates. One-use confirmation markers and difficulty burst limits stop blind strings. Bot buffers clear while stunned and failed tactical requests never remain queued. Damage,HP,hitstun,grab,cooldowns,resources and combo rules unchanged.
- Weighted choices account for current range,height,resources,observed recovery,repeat penalty and reserved tools. Mox selects form based on gap/HP with a separate decision cooldown. Defensive actions use native movement,jump,shield/evade skills; no privileged block/dodge. HELLMODE has limited bounded adaptation to repeated visible jumps/projectiles/approaches,never perfect defense.
- Shared existing geometry values are now exported for both AI and combat: Soul Q/W/R,Thunder W/E,Mox R,Melanta W/E/R. Existing values unchanged. Cylast and normal ranges are read directly from their existing configs. Conservative effective ranges are fractions of these values.
- web/index.html and web/style.css: HELLMODE selector,optional AI debug setting/overlay,BUILD/cache68. Debug DOM refresh <=10Hz,trace <=64entries. PvP/online controller untouched; AI is still called only through the pre-existing PvE/optional sandbox branch.

## Starting difficulty parameters

| Mode | New-situation reaction | Tactical interval | Post-action recovery pause | Max committed actions per burst |
|---|---|---|---|---|
| Easy |450–700ms|160ms|650–1050ms|2|
| Normal |250–450ms|120ms|380–670ms|3|
| Hard |150–300ms|100ms|250–480ms|4|
| HELLMODE |100–180ms|80ms|180–360ms|5|

These are perception latency targets and decision pauses,not alterations to move timing. Sampling/queue scheduling can add a small observation delay. Skills retain their actual hit counts.

## Verification

Final node --test tests/*.test.*:62passed,0failed (~10.82s). Existing combat/COMBO,HIT,DAMAGE,status,render,audio,network dedup and touch regression checks included.

New controller checks: reaction minimum and bounded observations at all4levels; no input accumulation/escape while stunned; missed normal stops followups; confirmed normal chains inside existing legal window; dynamic range adapter; Mox long-range transformation;debug/reset; HELLMODE next round/restart/character change; PvP never creates a bot controller. A genuinely AI-selected Soulblade normal was baited with a real player Thunder teleport: no damage,no phantom followup,normal recovery pause.

366 seeded8second simulation scenarios:
- all5characters and4levels × standing,fleeing,rushing,jumping,whiffing,corner pressure,projectile,repeated normal strings,platform target;
- Mox also begins in ranged form across all4levels/scenarios;
- all25ordered matchups at Hard andHELLMODE against repeated player attacks;
- additional30/60Hz stepping checks for every character; main runs120Hz;
- range gates,finite positions/HP/rotation,bounded state,stun buffer cleanup,corner escape/action checked. Hard/HELLMODE all characters/forms damaged the high-platform target in the tested8s scenario.

Paired comparison:5characters ×3player behaviors(still,projectile,repeated normals) ×3identical seeds,45scenarios per difficulty,matched positions and opponent:

| Measure |Hard|HELLMODE|
|---|---:|---:|
|Mean actual damage dealt in8s|502.74|513.31|
|Mean actual damage received|185.24|168.64|
|Confirmed legal followups,total|115|120|
|Defensive decisions,total|52|76|

HELLMODE remained hittable and both modes retained idle/recovery openings. This small deterministic comparison demonstrates different decisions,not a general win-rate/balance proof. No difficulty stat modifiers exist.

scripts/benchmark-ai.cjs:19117calls,mean3.264µs,p955.959µs,p9926.53µs in one headless run. Includes actual controller work during simulation,excludes Canvas/GPU/browser overhead; not a device FPS result.

Browser QA:local preview BUILD6.8,selectedHELLMODE,enableddebug,beganPvE Soulblade vs Thunder,used movement/normal/jump controls,observed bot actions/hits/round result,and returned to menu withHELLMODE retained. No game-script error observed in the inspected browser logs; extension metadata errors were present. Cloud browser delivered very low frame rates(~1–10FPS),so this session cannot establish smoothness or mobile FPS. No rendering quality changes introduced.

Build:Worker+90embeddedassets successful;git diff --check clean. Published to existing public Site without access changes.

## Limits and next playtest tuning

Not tested on physical iOS/Android devices or by human players across every matchup.8second scenario checks do not prove full99second round balance or that every pressure sequence is escapable under all inputs. Continue human playtesting reaction/rest/defense weights,platform launch margins and character spacing. No graphics,FPS,cooldown,damage or online latency claim inferred from AI CPU timings.
