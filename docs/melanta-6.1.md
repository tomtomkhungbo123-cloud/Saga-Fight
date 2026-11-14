# Melanta rendering repairs — 6.1

Checkpoint6343c26 / checkpoint-before-melanta-6.1.

Confirmed fixes: initial ground0 no longer overrides real preview/arena ground; E reads speedUntil rather than missing speed; W coil gets a single front pass after target silhouettes rather than being covered by them. Arena scopes Melanta drawing with save/restore, including front coil pass. Guest predicted normal now advances native pose time.

Performance: cache rope rest points once per weapon pass; pool10 pairs of afterimage canvases per actor, retain same blur/opacity; allocate finisher background/composite only at KO. No particle-density, resolution, path, combat or cooldown changes.

Validation: 53 Node test entries passed, including native Canvas regression,90frames/action, idle coordinateassertion, Wwrap existence, Eafterimages, normal solid silhouette pixels everyframe; fullscene2400simulation/rendersteps with movement/jumps/normal/E and finiteposition checks. Existingcombat/online regression retained. Browserpreview selectedMelanta, enteredSandbox, W/E/normalinputs causeddamage and bothactorsremainedvisible. Original intermittent total-disappearance screenshot was not reproduced in the old-build stress fixture; scope isolation and normal prediction synchronization added, but do not claim a proven single root cause for that symptom.

Equal-effect softwareCanvas benchmark360samples at1600x1120, both before/after include7Eafterimages: mean5.71→3.53ms,p9519.03→9.70ms inone run. Reproducewith scripts/benchmark-melanta.cjs against checkpointvisual. Softwarewarmup/hostcontention varies; no physicaliOS/AndroidFPSclaim. Graphicalassets and effectappearance retained.
