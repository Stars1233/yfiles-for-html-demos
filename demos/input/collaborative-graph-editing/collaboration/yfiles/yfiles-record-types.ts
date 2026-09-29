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
import type {
  IEdge,
  IEdgeStyle,
  IFoldingView,
  IGraph,
  ILabelModelParameter,
  INode,
  INodeStyle
} from '@yfiles/yfiles'

export type YFilesPointRecord = { x: number; y: number }

export type YFilesRectangleRecord = YFilesPointRecord & { width: number; height: number }

export type YFilesLabelRecord<LayoutParameter = unknown> = {
  text: string
  layoutParameter?: LayoutParameter
}

export type LabelLayoutParameter<T extends YFilesNodeRecord | YFilesEdgeRecord> = T extends {
  labels: readonly YFilesLabelRecord<infer Parameter>[]
}
  ? Exclude<Parameter, undefined>
  : never

type SharedLabelLayoutParameter<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = LabelLayoutParameter<NodeRecord> & LabelLayoutParameter<EdgeRecord>

/**
 * The graph state that is common to ordinary and group nodes.
 * Applications can extend this record with their own fields.
 */
export type YFilesNodeRecord<LayoutParameter = unknown, NodeStyle = unknown> = {
  id: string
  parentId: string | null
  isGroup: boolean
  layout: YFilesRectangleRecord
  labels: YFilesLabelRecord<LayoutParameter>[]
  /** An optional application-specific serialized node style. */
  nodeStyle?: NodeStyle
  /** The folding-view state of a group node, when folding is configured. */
  isExpanded?: boolean
  /** The view-local layout of a collapsed folder node, when available. */
  foldingLayout?: YFilesRectangleRecord
}

/**
 * The graph state that is common to edges.
 * Port coordinates are relative to their endpoint node when
 * `portLocationsRelative` is true.
 */
export type YFilesEdgeRecord<LayoutParameter = unknown, EdgeStyle = unknown> = {
  id: string
  sourceId: string
  targetId: string
  bends: YFilesPointRecord[]
  sourcePort: YFilesPointRecord
  targetPort: YFilesPointRecord
  portLocationsRelative?: boolean
  labels: YFilesLabelRecord<LayoutParameter>[]
  /** An optional application-specific serialized edge style. */
  edgeStyle?: EdgeStyle
}

export type YFilesRecordAdapterOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  graph: IGraph
  nodeById: Map<string, INode>
  /** Existing graph edges, used to distinguish copied edges from updates. */
  edgeById?: Map<string, IEdge>
  /** The folding view that displays the graph when the graph is its master graph. */
  foldingView?: IFoldingView

  /** Resolves the stable id of a graph node for serialization and lookup. */
  getNodeId?: (node: INode) => string | undefined
  /** Resolves the stable id of a graph edge for serialization and lookup. */
  getEdgeId?: (edge: IEdge) => string | undefined

  /** Creates a node when an application needs a custom style or tag setup. */
  createNode?: (record: NodeRecord, parent: INode | null) => INode
  /** Creates an edge when an application needs a custom style or tag setup. */
  createEdge?: (record: EdgeRecord, source: INode, target: INode) => IEdge

  /** Serializes a label model parameter into the shared record format. */
  serializeLabelLayoutParameter?: (
    parameter: ILabelModelParameter
  ) => SharedLabelLayoutParameter<NodeRecord, EdgeRecord> | undefined
  /** Restores a label model parameter from the shared record format. */
  deserializeLabelLayoutParameter?: (
    value: LabelLayoutParameter<NodeRecord> | LabelLayoutParameter<EdgeRecord>
  ) => ILabelModelParameter | undefined
  /** Serializes an application-supported node style into the shared record format. */
  serializeNodeStyle?: (style: INodeStyle) => NodeRecord['nodeStyle']
  /** Restores an application-supported node style from the shared record format. */
  deserializeNodeStyle?: (value: NodeRecord['nodeStyle']) => INodeStyle | undefined
  /** Serializes an application-supported edge style into the shared record format. */
  serializeEdgeStyle?: (style: IEdgeStyle) => EdgeRecord['edgeStyle']
  /** Restores an application-supported edge style from the shared record format. */
  deserializeEdgeStyle?: (value: EdgeRecord['edgeStyle']) => IEdgeStyle | undefined
  /** Adds application-specific fields to the baseline node record. */
  extendNodeRecord?: (
    record: NodeRecord,
    node: INode,
    previous: NodeRecord | undefined
  ) => NodeRecord
  /** Adds application-specific fields to the baseline edge-record. */
  extendEdgeRecord?: (
    record: EdgeRecord,
    edge: IEdge,
    previous: EdgeRecord | undefined
  ) => EdgeRecord
}

export type YFilesRecordAdapter<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  /** Creates a graph node from a complete shared record. */
  createNode: (record: NodeRecord) => INode
  /** Applies all baseline-synchronized node states to an existing node. */
  updateNode: (node: INode, record: NodeRecord) => void
  /** Creates a graph edge from a complete shared record and its endpoints. */
  createEdge: (record: EdgeRecord, source: INode, target: INode) => IEdge
  /** Applies all baseline-synchronized edge states to an existing edge. */
  updateEdge: (edge: IEdge, record: EdgeRecord) => void
  /** Resolves the stable ID used by the shared node map. */
  getNodeId: (node: INode) => string | undefined
  /** Resolves the stable ID used by the shared edge map. */
  getEdgeId: (edge: IEdge) => string | undefined
  /** Serializes the complete current node state, preserving prior fields. */
  nodeRecord: (node: INode, previous: NodeRecord | undefined) => NodeRecord
  /** Serializes the complete current edge state, preserving prior fields. */
  edgeRecord: (edge: IEdge, previous: EdgeRecord | undefined) => EdgeRecord
}
