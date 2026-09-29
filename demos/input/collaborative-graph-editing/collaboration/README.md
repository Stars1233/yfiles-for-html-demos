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
# Reusable collaboration primitives

This directory contains two independent layers:

- `core/`, `records/`, and the generic parts of `presence/` are browser/Yjs primitives.
- `yfiles/` projects shared records to and from a yFiles graph, while
  `presence/yfiles-presence.ts` provides the combined yFiles presence setup.

The implementation is organized by responsibility:

- `core/` contains transport, Yjs observation, history, identity, and ID primitives.
- `records/` contains field-level maps and shared graph record setup.
- `presence/` contains generic cursor/viewport presence and yFiles presence UI.
- `yfiles/` contains graph projection, adapters, reconciliation, and the yFiles collaboration session.

`index.ts` re-exports all four areas for consumers that want one stable import.

## How collaboration works

The shared Yjs document is the collaboration model. The yFiles graph is a local projection of that model, not the
network state itself.

```text
local yFiles edit
      |
      v
yfiles-graph-observer
      |
      v
yfiles-graph-publisher.publishNode/publishEdge
      |
      v
FieldLevelRecordMap --> Yjs document --> WebSocket provider / room
                                             |
                                             v
                                  FieldLevelRecordMap observer
                                             |
                                             v
                                      yfiles-sync.ts
                                             |
                                             v
                                  yfiles-graph-reconciler
                                             |
                                             v
                                      yFiles graph
```

There are two independent data paths:

1. **Document synchronization** uses Yjs maps. Node and edge records are synchronized through the WebSocket provider.
   Yjs handles connecting the documents, exchanging updates, and applying updates that arrive from other clients.
2. **Presence** uses the provider's awareness channel. Cursor positions and author names are temporary presence data;
   they are not stored in the graph records and do not participate in undo/redo.

Viewport following uses the same awareness channel. Each client publishes a temporary viewport containing its
world-space center and zoom. A client may follow one peer locally; following does not change the shared graph and is
stopped when the follower interacts with its own canvas or when the followed peer leaves the room. Incoming viewport
updates replace the current animated viewport transition; stopping follow cancels the active transition.

The yFiles synchronizer has two explicitly managed directions:

- `synchronizer.observeSharedRecords()` listens to shared record maps. It creates, updates, reconnects, folds, and
  removes items in the local graph when the shared model changes. `yfiles-sync.ts` coordinates this path and delegates
  graph updates to `yfiles-graph-reconciler.ts`.
- `synchronizer.observeGraphChanges()` listens to local yFiles graph events. It serializes graph changes back into the
  shared maps. The graph observer classifies events, and `yfiles-graph-publisher.ts` uses `publishNode` or
  `publishEdge` to write the corresponding records. The synchronizer guards both directions, so applying a remote record
  does not echo back as a new local edit.

### yFiles collaboration components

The yFiles-specific files have focused responsibilities:

- `yfiles-record-types.ts` contains the public record, callback, and synchronizer types. It has no runtime behavior.
- `yfiles-sync.ts` is the coordinator. It observes shared maps, tracks re-entrant updates, chooses full or incremental
  reconciliation, and wires the publisher and reconciler together.
- `yfiles-graph-observer.ts` subscribes to yFiles graph and folding events. It identifies the owning node or edge and
  forwards classified changes to the publisher.
- `yfiles-graph-publisher.ts` handles graph-to-record updates. Its
  `publishNode` and `publishEdge` methods serialize individual graph items;
  `publishGraph` publishes an entire initial graph. It also handles graph deletion, identity lookup, and local-history
  transactions.
- `yfiles-graph-reconciler.ts` handles record-to-graph updates. It creates or updates nodes before edges, restores
  parent relationships, reconnects or recreates edges when needed, removes stale items, and applies folding state.
  `reconcileAll` is used for full updates; `reconcileIncremental` limits work to changed records when possible.
- `yfiles-record-adapter.ts` is the baseline yFiles model adapter used by both directions. The publisher uses it to
  serialize graph items, while the reconciler uses it to create and update graph items.

Nomenclature: `publish...` means graph to shared records, while `reconcile...` means shared records to the local graph.

This separation is useful during startup. A host can build a local seed graph, start graph observation, and call
`publishGraph()` once if the shared document is empty. Existing shared records should be allowed to populate the graph
instead of being overwritten by a local seed.

For folding, synchronization uses the master graph because view items are temporary copies that can disappear when a
group is collapsed. The displayed folding view is still observed for collapsed-folder layout and expansion-state
changes, which are stored on the corresponding master group record.

### A local edit from start to finish

When a user moves a node, edits a label, creates an edge, or changes grouping:

1. yFiles raises a graph event.
2. `yfiles-graph-observer.ts` identifies the owning node or edge and classifies the change.
3. `yfiles-graph-publisher.ts` calls `publishNode` or `publishEdge`.
4. The record adapter reads the complete current graph state and preserves application-specific fields through its
   extension callbacks.
5. The synchronizer writes only the changed top-level fields when using
   `createFieldLevelRecordMap`.
6. The Yjs transaction is sent through the provider and is recorded in the local history when the host supplies
   `history.transact`.

Remote edits follow the reverse path: the record-map observer invokes
`yfiles-sync.ts`, which selects full or incremental reconciliation. The graph reconciler then uses the record adapter to
update the local graph while graph-to-record observation is temporarily suppressed.

### Conflict behavior

`createFieldLevelRecordMap` stores each record as a nested Yjs map. Its fields therefore merge independently: a
concurrent `layout` change and `labels`
change can both survive. A field is still last-writer-wins when two clients change that same field. The current
granularity is deliberately top-level;
`layout` is one field and `labels` is one array field. More granular merging would require stable IDs and patch
semantics for labels, bends, and geometry.

## Recommended shared record setup

Use `createSharedGraphRecords` for the usual setup. It creates one nested Yjs map per record, local history scoped to
the node and edge roots, and the field-level record wrappers. The wrapper merges changed top-level fields, so a layout
update does not replace an unrelated label or business field update. Nested values such as `layout` are still treated as
one field.

```ts
import {
  createSharedGraphRecords,
  createYFilesSynchronizer,
  type YFilesEdgeRecord,
  type YFilesNodeRecord
} from './index'

type NodeRecord = YFilesNodeRecord
type EdgeRecord = YFilesEdgeRecord

const records = createSharedGraphRecords<NodeRecord, EdgeRecord>(doc)

const synchronizer = createYFilesSynchronizer({ graph, records })

const stop = synchronizer.start()

// Use this once after creating a local seed graph.
synchronizer.publishGraph()

// Stop all observers when the view is destroyed.
stop()
```

`records.history` is already scoped to the node and edge roots. Use it for undo/redo bindings or one-shot operations:

```ts
records.history.run(() => replaceTheGraph())
```

For advanced integrations, `synchronizer.nodeById` and
`synchronizer.edgeById` expose the identity maps used by the projection. The lower-level `observeSharedRecords()` and
`observeGraphChanges()` methods are available when the two directions need separate lifecycles. `dispose()` stops
observers started with `start()`.

## Recommended yFiles session setup

When the websocket client, graph synchronizer, and shared records have the same lifecycle, `createYFilesCollaboration`
owns that composition:

```ts
const client = createWebsocketCollaborationClient({ serverUrl, roomName })
await client.whenSynced()

const session = createYFilesCollaboration({ client, graph, foldingView, recordAdapterOptions })

const stop = session.start()

// Dispose both the graph projection and websocket client when the view closes.
session.dispose()
```

For the standard client, graph synchronization, and presence lifecycle, use
`createCollaborationSession`. It waits for initial provider synchronization, starts the yFiles projection, and provides
one disposal method. The optional
`initialize` callback is called after sync and before observation starts, which allows an application to seed an empty
room without making that policy part of the collaboration primitives:

```ts
const collaboration = await createCollaborationSession({
  clientOptions: { serverUrl, roomName },
  graphComponent,
  recordAdapterOptions,
  layoutOptions: {
    calculateLayout: (graph) => {
      graph.applyLayout(new HierarchicalLayout())
    }
  },
  initialize: ({ synced, graph, collaboration }) => {
    const seeded = synced && initializeGraphData(collaboration.records, graph)
    return seeded
  }
})

// Use collaboration.collaboration for history, records, and synchronizer access.
collaboration.dispose()
```

### Applying a collaborative layout

The host application supplies the layout algorithm through `layoutOptions` and can trigger it from a button or command
with `layoutCoordinator.startLayout()`:

```ts
const collaboration = await createCollaborationSession({
  clientOptions: { serverUrl, roomName },
  graphComponent,
  layoutOptions: {
    calculateLayout: (graph) => {
      graph.applyLayout(new HierarchicalLayout())
    }
  }
})

layoutButton.addEventListener('click', () => {
  void collaboration.layoutCoordinator.startLayout()
})
```

The selected client calculates the layout and shares the resulting graph geometry. Other clients receive the same result
and animate to it, so the layout stays consistent across the room. The layout algorithm remains an application choice;
the collaboration session coordinates its execution and replay.

Presence is enabled by default. Pass `presence: false` to disable it, or pass presence overrides such as `author` and
`colorForClient`. The graph, folding view, and navigation input mode are inferred from `graphComponent`; pass them
explicitly when an application uses a non-standard graph or input mode. The high-level session invalidates the graph
component after synchronization and uses `User <clientId>` when no fallback author is supplied. A custom
`afterSynchronize` or `fallbackAuthor` can still be provided as an override.

Pass an existing `client` instead of `clientOptions` when the transport needs an independently configured lifecycle. Use
the lower-level factories when the client, graph projection, or presence must outlive one another.

The session exposes `records`, `history`, `synchronizer`, `nodeById`, and
`edgeById` directly. Use the lower-level factories when the transport or graph projection must outlive the other.

For the standard yFiles cursor and viewport behavior, use
`createYFilesPresence`. It returns one `dispose()` function while still exposing the underlying cursor and viewport
controllers for application UI:

```ts
const presence = createYFilesPresence({
  component: graphComponent,
  awareness: client.awareness,
  nodeById: session.synchronizer.nodeById,
  foldingView,
  navigationInputMode
})

presence.dispose()
```

## yFiles projection

`YFilesNodeRecord` covers stable IDs, layouts, hierarchy, group state, labels, and optional folding state.
`YFilesEdgeRecord` covers stable IDs, endpoints, bends, relative port locations, and labels. Both records also accept
optional style type parameters for applications that want baseline style syncing:

```ts
type NodeStyle = { kind: 'shape'; color: string; shape: string }
type EdgeStyle = { kind: 'polyline'; color: string; thickness: number }

type NodeRecord = YFilesNodeRecord<unknown, NodeStyle>
type EdgeRecord = YFilesEdgeRecord<unknown, EdgeStyle>
```

The style parameters and their fields are optional. Applications that do not want to synchronize styles can omit the
style parameters and the style callbacks. When style syncing is enabled, the baseline record adapter calls
`serializeNodeStyle`/`deserializeNodeStyle` and
`serializeEdgeStyle`/`deserializeEdgeStyle` while publishing and applying records:

```ts
const synchronizer = createYFilesSynchronizer({
  graph,
  records,
  recordAdapterOptions: {
    serializeNodeStyle,
    deserializeNodeStyle,
    serializeEdgeStyle,
    deserializeEdgeStyle
  }
})
```

The callbacks are intentionally application-defined: this demo serializes a small subset of `ShapeNodeStyle` and
`PolylineEdgeStyle`, while another host can support different style classes and properties. Extend these records for
business fields, custom ports, or other application data as needed.

Label model parameters require paired `serializeLabelLayoutParameter` and
`deserializeLabelLayoutParameter` callbacks when they must survive a round trip. The baseline adapter observes style and
tag events. Use the style callbacks above for supported style types and provide
`extendNodeRecord`/`extendEdgeRecord` or a custom record adapter when an application needs additional fields, ports,
tags, or more extensive style handling.

For folding, pass the master graph as `graph` and the displayed view as
`foldingView`. Keep identity maps on the master graph. The synchronizer stores group expansion state and the view-local
rectangle of collapsed folders.

## Custom graph item creation

`createNode(record, parent)` and `createEdge(record, source, target)` are creation hooks. When the corresponding update
hook is omitted, the baseline adapter applies the record's layout, grouping, tag, labels, bends, and ports after the
hook. When style deserializers are configured, it also applies the deserialized node or edge style. This lets a host
focus its hook on custom creation behavior.

Supplying `updateNode` or `updateEdge` replaces the baseline update behavior, so the custom callback must apply all
state that the host wants to synchronize. For more extensive customization, create and wrap a
`YFilesRecordAdapter` instead.

## Cursor presence

Create a cursor controller with `createCursorPresence`. The host supplies coordinate conversion functions because the
primitive is not tied to yFiles. The controller adds the required positioning styles itself. Hosts may style
`.remote-cursor`, `.remote-cursor__arrow`, and `.remote-cursor__name`.

Call `refresh()` after panning or zooming. Keep and call `dispose()` when the host view is destroyed; disposal removes
listeners, remote cursor elements, and the local cursor awareness field.

## Lifecycle and history

Keep the cleanup function returned by `start()` or call `dispose()` when the view is destroyed. Use `history.run` for
one-shot local edits and
`history.transact` for edits that should participate in a current gesture. Call
`history.clear` when an operation establishes a new local-history boundary, such as replacing the entire document.
Remote Yjs transactions are excluded from the local undo history.

Record IDs must be globally unique. Applications supplying their own IDs must provide the same guarantee.
