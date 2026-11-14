# Build 6.14 — Forgotten Cavern BGM

Integrated supplied Dư Âm Dưới Đá for the existing map 01 asset `assets/arena.png` (the current single arena). README and manifest were read before integration. Runtime manifest retains supplied loop points 0–80 seconds, gain .35 and file checksums; uses the supplied OGG, with supplied MP3 decoder fallback, to avoid adding the 15 MB PCM master to every Worker build. Both compressed files decode to exactly 80 seconds using ffmpeg and match original SHA-256 checksums. Audio MIME types added to packager.

The existing audio manager owns a music bus feeding the existing master volume/mute/compressor. Buffer loads/decodes once after a user gesture with sound enabled and the arena active. One AudioBufferSource loops independently of SFX voices and authoritative combat packets. Fade in 1.5 seconds, fade out 1.2 seconds on exit. Round changes and respawns retain the same instance. Pause/background stores loop offset and stops playback; resume starts from that offset. Exit resets it; rapid re-entry stops the previous fading tail. Existing iOS unlock path retained.

Tests extend existing audio harness to cover >three simulated 80-second loops without restart, one decode, pause at 85 seconds/resume at 5 seconds, round cleanup, mute/unmute, tab suspend/unlock, exit/re-entry and loop points. Full suite results are recorded in the delivery message. No combat, SFX cue, visual or network rule changed.

Limitations: simulated audio nodes validate scheduling/lifetime, not audible output; ffmpeg duration is not a Safari decoder test. No physical iOS device or two-device listening test available. Seam/mix still needs listening on target devices.
