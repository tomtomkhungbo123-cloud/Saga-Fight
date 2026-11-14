# Melanta integration — Saga Fight 6.0

Source: supplied Melanta Build 4.9 integration pack; native renderer/rig/weapon paths, VFX and composite finisher isolated in MelantaVisual. Arena adapter owns skill instances and reports real hits to existing damage/scaling/COMBO engine. No lab UI, autonomous lab AI, lab damage or lab victory loop runs in the arena. Lab HP1500/target5000 retained as reference only; arena HP1000.

Added roster cards/animated previews, both player selects, server character allowlist, mirror palette, pause skill guide, PvE/PvP/Sandbox and host snapshot fields. Existing keyboard/touch routes handle inputs. Online protocol60 requires both peers reload.

Normals use native swept blade polygons and committed facing. Q100/stun1, W80/root-only and W→R buffer, E50/330/speed35percent2s, R13x25 over4s after plunge, healing6 per successful hit, damage reduction20percent. Cooldowns follow handoff. Root cleanup preserves unrelated preexisting root. Shared scaling/control budgets apply. Melanta KO starts native2s cinematic and freezes combat; serializes killer and existing finishing time. R ticks do not independently force hitstun, so 13 separated hits are not falsely labeled one true combo.

Checks: 51 Node test entries passed, including original regression tests plus Melanta assertions: swept normal, Q hit/stun, root-only W→R, R13hits/heal78, plunge without early damage, KO freezes cooldown until one result, E air physics/speed, R mitigation and JSON state. Renderer native Canvas smoke: idle,250Rframes,230finisherframes. Browser preview: select Melanta, enter Sandbox, keyboard R produced successive25damage, native rope/weapon/borders visible. No page-code errors observed. Preview FPS varied in cloud browser; no physical-device FPS claim.

Limits: no Melanta SFX supplied, so no invented character audio. Existing generic combat sounds remain. No physical iOS/Android or two-device WebRTC session verified. Prediction/authoritative snapshot framework reused, but full Melanta online cinematic synchronization still needs real-device acceptance. Finisher camera remains native2.5D composition.

Checkpoint: checkpoint-before-melanta-6.0 at19a58dd3cbc8518f4bc012cd6a80ae32141f2e73.
