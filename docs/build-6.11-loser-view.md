# BUILD6.11 — local loser-only monochrome

Checkpoint:checkpoint-before-ko-6.11,1bd302f798029e0af926ee33a736e413ee3d9580.

syncKOVisual now uses localId() and local fighter HP rather than any fighter's KO. Online host(P1) and guest(P2) independently derive the filter from the same authoritative snapshot:only the defeated player's device becomes monochrome. PvE filters only if P1 is defeated,not when the CPU loses. Shared-screen local PvP retains a colored world because there is no separate loser display. Sandbox follows its local P1 view if a KO occurs.

Defeated-character gray palette,3real-second finish timing,Melanta choreography,combat/AI/audio and rendering quality unchanged. Filter still clears on reset/menu and remains correct during paused finishing and results. Asset/build71(6.11) and online handshake71require refreshed peers.

Validation:66/66full-suite pass(~9.16s). Targeted palette/KO/online suite27/27pass. Two independent host/guest test clients verify guest loss→hostcolored/guestgray,thenhostloss→hostgray/guestcolored,pause retains correct views,new round clears both. Local tests cover PvE win/loss,eitheronlineperspective and sharedPvP policy. Worker+90assets builds;git diff --check passes. No physical two-device/iOS visual test was run.
