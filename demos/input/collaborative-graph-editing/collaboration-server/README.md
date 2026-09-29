<!--
 //////////////////////////////////////////////////////////////////////////////
 // @license
 // This file is part of yFiles for HTML.
 // Use is subject to license terms.
 //
 // Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 // 72070 Tuebingen, Germany. All rights reserved.
 //
 //////////////////////////////////////////////////////////////////////////////
-->
# Collaborative GEIM websocket server

This is a single-room, in-memory wrapper around `y-websocket`. It accepts the
`collaborative-geim` room and applies the public-demo guardrails:

- labels are replaced by preset words based on their input length, capped at 15 characters;
- the combined number of nodes and edges is limited;
- the room is cleared periodically.

First, install the dependencies:

```shell
npm install
```

Start it from this directory with:

```shell
npm run start:guarded-colab-server
```

or

```shell
npm run start:unguarded-colab-server
```

The defaults can be changed with environment variables:

```shell
HOST=0.0.0.0
PORT=3001
ROOM_NAME=collaborative-geim
MAX_GRAPH_ITEMS=200
CLEAR_INTERVAL_MS=3600000
```

The server intentionally has no persistence. Restarting the process loses the room contents, which is suitable for this demo. Run only one instance because the room is held in that process's memory.


## Connecting from another device on the same network

1. Find the server's local IP address:

  - **Windows:** Run `ipconfig`
  - **macOS:** Run `ipconfig getifaddr en0`
  - **Linux:** Run `hostname -I`

2. Allow the TCP port (e.g., `3001`) through the server's firewall if necessary:

  - **Windows:**

    ```powershell
    New-NetFirewallRule -DisplayName "Allow WebSocket TCP 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
    ```
    Remove it, when the test is complete.
   ```powershell
   Remove-NetFirewallRule -DisplayName "Allow WebSocket TCP 3001"`,
   ```

  - **macOS:** Allow the server application in **System Settings → Network → Firewall → Options**.

3. Open the demo

Both devices must be connected to the same network or VPN. Clients must use the server's actual IP address.
