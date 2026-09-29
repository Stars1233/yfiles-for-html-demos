/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
import type { IEdge, IFoldingView, IGraph, INode } from '@yfiles/yfiles'
import type { FieldLevelRecordMap, SharedGraphRecords } from '../records'
import type {
  YFilesEdgeRecord,
  YFilesNodeRecord,
  YFilesRecordAdapter,
  YFilesRecordAdapterOptions
} from './yfiles-record-types'

/**
 * The graph events that can be projected back into shared records. The list
 * intentionally includes visual changes as well as structural changes: GEIM
 * uses both kinds of changes for normal editing gestures.
 */
export type YFilesGraphChange =
  | 'node-created'
  | 'node-removed'
  | 'node-layout-changed'
  | 'node-style-changed'
  | 'node-tag-changed'
  | 'parent-changed'
  | 'is-group-node-changed'
  | 'edge-created'
  | 'edge-removed'
  | 'edge-ports-changed'
  | 'edge-style-changed'
  | 'edge-tag-changed'
  | 'bend-added'
  | 'bend-removed'
  | 'bend-location-changed'
  | 'bend-tag-changed'
  | 'label-added'
  | 'label-removed'
  | 'label-text-changed'
  | 'label-layout-parameter-changed'
  | 'label-preferred-size-changed'
  | 'label-style-changed'
  | 'label-tag-changed'
  | 'port-added'
  | 'port-removed'
  | 'port-location-parameter-changed'
  | 'port-style-changed'
  | 'port-tag-changed'

/**
 * Adapts application records to graph changes made by GEIM.
 *
 * `nodeRecord` and `edgeRecord` are called after a graph item has changed. They
 * should return the complete record to publish, or `undefined` to ignore that
 * change. The callback is also called for creation, with no previous record.
 * This makes geometry, labels, bends, ports, styles, and grouping data an
 * application concern while the event coverage and feedback-loop handling stay
 * reusable.
 */
export type YFilesGraphPublisherConfig<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  /** Wraps graph-originated record writes in the host's local-history scope. */
  transact?: (action: () => void) => void
  /** Resolves the stable id of an already existing graph node. */
  getNodeId?: (node: INode) => string | undefined
  /** Resolves the stable id of an already existing graph edge. */
  getEdgeId?: (edge: IEdge) => string | undefined
  /** Serializes a changed graph node into its shared record. */
  nodeRecord?: (
    node: INode,
    previous: NodeRecord | undefined,
    change: YFilesGraphChange
  ) => NodeRecord | undefined
  /** Serializes a changed graph edge into its shared record. */
  edgeRecord?: (
    edge: IEdge,
    previous: EdgeRecord | undefined,
    change: YFilesGraphChange
  ) => EdgeRecord | undefined
}

export type YFilesSynchronizerOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  graph: IGraph
  /** Shared records created by `createSharedGraphRecords`. */
  records?: SharedGraphRecords<NodeRecord, EdgeRecord>
  /** Advanced override for the node record map. */
  nodeRecords?: FieldLevelRecordMap<NodeRecord>
  /** Advanced override for the edge record map. */
  edgeRecords?: FieldLevelRecordMap<EdgeRecord>
  /** Advanced override for the node identity map. */
  nodeById?: Map<string, INode>
  /** Advanced override for the edge identity map. */
  edgeById?: Map<string, IEdge>
  /** The view used to display the master graph, when folding is enabled. */
  foldingView?: IFoldingView

  /** Supplies baseline yFiles creation, update, and serialization behavior. */
  recordAdapter?: YFilesRecordAdapter<NodeRecord, EdgeRecord>
  /** Configures the default baseline adapter without replacing it. */
  recordAdapterOptions?: Omit<
    YFilesRecordAdapterOptions<NodeRecord, EdgeRecord>,
    'graph' | 'nodeById' | 'edgeById' | 'foldingView'
  >

  /**
   * Creates the graph item for a new shared node record.
   *
   * The callback must create a valid node. If `updateNode` is omitted, the
   * baseline adapter applies the record's layout, grouping, tag, and labels
   * after this callback, so the callback can focus on custom styles.
   */
  createNode?: (record: NodeRecord, parent: INode | null) => INode
  /**
   * Applies a changed shared node record to an existing graph item. Supplying
   * this callback replaces the baseline update behavior, including its tag,
   * layout, grouping, and label restoration.
   */
  updateNode?: (node: INode, record: NodeRecord) => void

  /**
   * Creates the graph item for a new shared edge record. If `updateEdge` is
   * omitted, the baseline adapter applies bends, ports, tags, and labels after
   * this callback.
   */
  createEdge?: (record: EdgeRecord, source: INode, target: INode) => IEdge
  /**
   * Applies a changed shared edge record to an existing graph item. Supplying
   * this callback replaces the baseline update behavior.
   */
  updateEdge?: (edge: IEdge, record: EdgeRecord) => void

  /**
   * Returns whether an existing edge can be updated in place. Returning false
   * recreates the edge, which is useful when a record changes its edge kind or
   * another property that is fixed at creation time.
   */
  canUpdateEdge?: (edge: IEdge, record: EdgeRecord, source: INode, target: INode) => boolean

  /** Runs after nodes and edges have been reconciled. */
  afterSynchronize?: () => void

  /**
   * Enables the optional graph-to-record projection used for local GEIM
   * gestures. Shared-record observation remains enabled independently.
   */
  graphPublisher?: YFilesGraphPublisherConfig<NodeRecord, EdgeRecord>
}

export type YFilesSynchronizer = {
  /** Identity maps used by the projection, useful for presence integrations. */
  readonly nodeById: Map<string, INode>
  readonly edgeById: Map<string, IEdge>
  /** Reconciles the current shared records into the local graph immediately. */
  synchronize(): void
  /** Starts shared-record observation and performs an initial reconciliation. */
  observeSharedRecords(): () => void
  /** Starts local graph observation; existing graph items are registered, not published. */
  observeGraphChanges(): () => void
  /** Starts both directions, replacing any observers previously started by `start`. */
  start(options?: { observeGraph?: boolean }): () => void
  /** Pauses shared-record reconciliation while keeping shared observers connected. */
  pause(): void
  /** Resumes reconciliation and applies all changes accumulated while paused. */
  resume(): void
  /** Stops observers started through `start`; records, graph, and history remain alive. */
  dispose(): void
  /** Publishes one node using the configured complete node serializer. */
  publishNode(node: INode, change?: YFilesGraphChange): void
  /** Publishes one edge using the configured complete edge serializer. */
  publishEdge(edge: IEdge, change?: YFilesGraphChange): void
  /** Publishes all current graph nodes and edges; it does not delete stale records. */
  publishGraph(): void
  /** Removes a local node and its incident edges by shared ID. */
  removeNodeById(id: string): void
  /** Removes a local edge by shared ID. */
  removeEdgeById(id: string): void
}
