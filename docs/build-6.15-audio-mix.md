# Build 6.15 — Separate effects/music volume

Settings now has two labelled 0–100% sliders: effects and match background music. Both use the same existing settings dialog from home/pause. The global sound toggle controls both buses.

SFX voices (including UI and skill loops) route through a dedicated effects gain into the master. Map BGM retains its separate music bus, with its authored .35 gain multiplied by music volume. Master applies mute and the unchanged .45 output gain/compressor. Volume changes smoothly target each bus and do not recreate buffers, music sources or loop instances.

Independent sfxVolume and musicVolume persist in the existing local setting. Legacy volume initializes both, preserving prior mix loudness; explicit zero is preserved. The volume compatibility field remains the effects value. No gameplay or combat changes.

Audio harness verifies effects zero leaves music unchanged, music zero leaves effects unchanged, music gain, no music restart on slider changes, independent persistence/reload and legacy .42 migration. Existing mute, iOS unlock, voices and looping lifecycle tests remain in place. Physical mobile listening remains unverified.
