# Online room layout and retry

Room mode uses explicit grid rows for tabs, mode note, maps and details. Hidden tabs collapse to a zero-height first row without shifting the remaining children. Room controls scroll only inside the details pane on short screens; document scrolling remains locked on touch. The room card uses intrinsic height, a 44px Ready button, and wrapped actions. Verified with iPhone 667×375, 844×390, 390×844 and iPad 1024×768 / 768×1024 browser layouts.

Connection interruptions now retain the room after the previous 15-second timeout. The player can retry or explicitly leave. Both the in-match curtain and failed lobby expose retry. DIRECT-only retries renegotiate ICE in the same room, initiated by the host; a guest asks the host through the existing authenticated fallback signal with reason `retry`. Attempt IDs and a 3-second retry cooldown reject stale/repeated requests. The relay whitelist and transport policy are unchanged: DIRECT-only never sends combat over WebSocket.

After route selection, the existing rollback checkpoint/epoch handshake restores the confirmed state. No fresh match or result is created by retry. A disconnected WebSocket can be reopened with the existing room credential; automatic WS recovery continues. A room that was explicitly closed by the opponent, expired or rejected as invalid still cannot be resumed. No TURN service or change to networking permissions is introduced.

Regression coverage includes host-initiated and guest-initiated DIRECT recovery, failed DIRECT lobby retry, repeated button clicks, retaining rooms through long stalls, explicit leave, manual WS recovery, world hashes after checkpoint restore, rematches and DIRECT/WS route fallback.
