# Balance and combo expansion —6.4

Cylast: Qfreeze1s, W30/second for4ticks withradius200, Eshield1.2s. Rsuccessfuldamage contacts use300→240→180 (20percent oforiginal300 per prior successful contact, noncompound). Each zone tracks unique tickattempt IDs separately from successfulhit count so aninvulnerable/absorbedcontact cannot reuse an already-seen ID. Radius/lifetime/cooldown/healing caps otherwise retained. Rdamage still uses captured combo scaling andmitigation.

Whitelist additions: Cylast N1/N2→R alongsideQ/W; Melanta N1/N2→Q/W/E/R; confirmedQ at.73–1.32→normal/R, confirmedE at.55–.78→normal/R; W→R retained. MoxmeleeN1/N2→R, rangednormals remainWonly. Cancellations still needhitconfirmation/resources/legalusecounts and onlyremove remainingrecovery. Startup/travel/controlbudgets/scaling/one-slotbuffer unchanged.

MelantaR has a finite per-cast hit tally, max13 actualcontacts, sharedscaleduse. Cast tally displayed from5hits as CHIÊU R · HIT usingexistingpopup. It does not claim true combo after opponent recovers. Sharedtruecombo stillends at first defensiveopportunity. Cylastzonecontacts add to anexisting continuouscombo only ifvictim stilllocked bythatplayer; do notcreatehitstun/keepcomboalive. No artificial extraCC added. Per-use counters capped8 andreset withfighterstate. Misses, DOT withoutskillHit andduplicatehitIDs do notincrement.

MoxR captures/lifts/flips remain nondamaging. Exactly one scaled impacthit joins prior continuouschain; extensionpoints/deadline notreset.

Checks:56Nodeentriespass. New measuredroute tests: MelantaQ→R gives3continuoushits in chosen fixture (airborneentryplunge causes realtiminggap beforelatercontacts), plus13Rcastcontacts. MoxN1cancel→R gives2hits and455damage (75+400*.95). Cylastunscaled R300/240/180=720; W boundary201miss/199hit30; Eexpiry1.2. Existing no-infinite-control, freeze/shatter, grabcleanup, audio, nativeMelantarender, onlinehost/guest tests retained. Physicalmobile/two-device online notverified this turn.

Checkpoint3c179dd7 / checkpoint-before-combo-6.4.
