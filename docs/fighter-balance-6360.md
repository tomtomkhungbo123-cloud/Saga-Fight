# Fighter balance revision 6360-balance1

Mox and Cylast now use the common -900 vertical jump impulse and 1900 gravity for first, second and landing-buffered jumps. Their model size, movement speed and skills are unchanged.

Melanta normal attacks can choose facing from movement during startup (before 0.10s), lock their damage sweep direction during the active window, and turn freely in recovery after 0.34s. A new or chained normal samples the current movement direction. Starting a swing clears the previous target-motion sample so an old sweep cannot create a phantom hit. Damage, attack duration and combo restrictions remain unchanged.

Q locks a world-space point once at cast start within 565 units. The shared rendered tip and damage point now respect the current arena bounds instead of clamping forest targets to x=1520. Target elevation is stored with the point and used by the rope path, burst and damage radius. The skill does not chase after casting; moving/teleporting out of the 190-radius impact avoids it. It retains 100 damage, impact at 0.72s, 1s stun and 3s cooldown, and cannot lock an untargetable opponent.

R retains the initial airborne plunge, then allows shared movement/physics during its 4s dance at the existing 50% R speed multiplier (175 units/s before external movement buffs). The moving origin is shared by the rope, aura, spikes and damage. Roots and map edges still apply; jump remains unavailable during the skill. Damage (13×65), healing (10 per hit), cooldown (14s), mitigation and control immunity remain intact.

Online hello messages include simulation revision `6360-balance1`. Peers with a different or missing revision cannot Ready or apply rollback initialization. Both devices must reload the same updated frontend; no relay protocol/server change is required.

Validation covers equal jump trajectories/buffering, normal turns, Q on both sides of the forest and elevated targets, Q dodging, moving/rooted R, deterministic replay and a real WS-signaled DIRECT match with Melanta R against Cylast jump. Existing Melanta combat, status, animation, Mox/Cylast and reconnection regressions are included.
