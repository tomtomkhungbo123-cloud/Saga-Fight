# Online transport changes — 5.8

Current architecture: host-authoritative 120Hz combat, unordered/unreliable WebRTC data channel at 20Hz; STUN Google/Cloudflare, no TURN. Cloudflare Worker + D1 room signalling and HTTP fallback. Host location is the host player's device; deployed D1 region cannot be inferred from source.

Found and fixed: active WebRTC still sent/consumed HTTP combat snapshots and inputs every 1.6s, mixing two transport paths. HTTP now only carries signalling/presence while RTC is open. WebRTC send buffer threshold reduced from 180KB to16KB to skip stale state sends. Pending discrete actions retain existing bounded resend/ack protocol.

Heartbeat once per second uses local performance timestamps and echoed ID (no clock synchronisation needed). RTT measured separately on each peer and exchanged in next heartbeat. Unknown measurements display ellipsis. Jitter is EWMA of absolute successive RTT differences. Warning at RTT>180ms or jitter>40ms. Existing FPS remains separate. HTTP fallback measurement is still request RTT, not peer RTT; no packet loss percentage is claimed.

Loss guard now pauses host after1.5s without peer activity (previously6.5s), and exits after20s. This does not implement state rollback or a secure authoritative server. Existing automatic host resume remains.

Validation:39 Node test groups, including separate host/guest VM clients against real SQLite API adapter, RTC heartbeat mock, backpressure, and absence of HTTP combat writes while RTC open. No real two-device WAN measurements, regional RTT benchmarks or50/100/150/200ms loss/jitter simulations were run. No before/after latency reduction is claimed.

Incomplete scope: HTTP combat fallback remains; full snapshots still sent at20Hz; event-based visual replication, input prediction/reconciliation and rollback are not implemented. Existing renderer/quality logic was not modified. A TURN service with short-lived authenticated credentials and measured Southeast Asia endpoints is needed for reliable peer connectivity across restrictive NATs. Alternatively a persistent WebSocket relay requires hosting support and authentication. Do not embed long-lived TURN credentials in the browser. These requirements are not yet configured or deployed.
