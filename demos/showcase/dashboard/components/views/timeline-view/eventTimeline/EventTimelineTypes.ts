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
import type { IEdge, INode, LayoutNode } from '@yfiles/yfiles'
import type { EventTimelineConfig } from './EventTimelineConfig'

export type SubgraphTag = { subgraph: boolean }
export type EventTimelineAccessors = {
  timeAccessorFunction: (edge: IEdge) => Date
  nodeLabelAccessor?: (node: INode) => string
  edgeLabelAccessor?: (edge: IEdge) => string
  nodeIdAccessor?: (nodeData: unknown) => string | number
  edgeIdAccessor?: (edgeData: unknown) => string | number
  edgeSourceIdAccessor?: (edgeData: unknown) => string | number
  edgeTargetIdAccessor?: (edgeData: unknown) => string | number
  nodeGroupAccessor?: (node: INode) => string
  edgeTypeAccessor?: (edge: IEdge) => string
}

export type EventTimelineCallbacks = {
  onHyperEdgeClicked?: (bundle: AggregatedEdgeGroup) => void | Promise<void>
}

/**
 * The configuration options for the {@link EventTimeline}.
 */
export interface EventTimelineOptions {
  /**
   * A CSS selector string to spawn the graph component in
   */
  selector: string
  /**
   * A function with which to access an edge's (event's) timestamp; must return a {@link Date} object.
   */
  accessors: EventTimelineAccessors
  startTimeFrame?: [Date, Date]
  config?: Partial<EventTimelineConfig>
  callbacks?: EventTimelineCallbacks
}

/**
 * The various edge color modes that exist, i.e., the different ways in which edges can be colored.
 * - 'NodeGroups': color edges according to each edge's source and target node's group association
 * - 'NodeGroupsInverted': color edges according to each edge's source and target node's group
 * association, but invert their colors to better highlight source and target groupings.
 * - 'EdgeGroups': color edge according to each edge's edge group membership.
 * - 'None': do no color edges at all.
 */
export type EdgeColorMode = 'NodeGroups' | 'NodeGroupsInverted' | 'EdgeGroups' | 'None'

/**
 * The NodeGroup type which describes a particular node group and its state, i.e.,
 * - nodes: the 'INode' objects that make up the group
 * - id: the string that uniquely describes and labels the node group
 * - collapsed: a boolean flag indicating whether a node group has been collapsed by the user, and
 * - highlighted: a boolean flag indicating whether a node group is being highlighted by the user.
 */
export interface NodeGroup<T extends INode | LayoutNode> {
  nodes: Array<T>
  id: string
  collapsed: boolean
}

/**
 * The NodeGroups type which maps a unique node group ID string to its corresponding NodeGroup
 * object.
 */
export type NodeGroups<T extends INode | LayoutNode> = Partial<Record<string, NodeGroup<T>>>

/**
 * The AggregatedEdgeGroup type, which contains all edges which have been aggregated as they
 * i) are too close to one-another in x-space to be individually differentiable, and ii) form a
 * larger connected component. The type is composed of
 * 1. the IEdges that make up the aggregated edge group, and
 * 2. the edgeRange which describes the start and end points of the aggregated edge.
 */
export type AggregatedEdgeGroup = { edges: Array<IEdge>; edgeRange: [start: IEdge, end: IEdge] }

/**
 * The tag shape used for event timeline edges.
 */
export type EventTimelineEdgeTag = { id: string | number }

/**
 * The ChangeDirection type describes the two direction in which a user can zoom into/out of the
 * event timeline visualization, i.e., horizontally or vertically.
 */
export type ChangeDirection = 'horizontal' | 'vertical'

/**
 * The ItemState class describes the transient visual state of a graph item.
 */
export class ItemState {
  visible?: boolean
  aggregated?: boolean
  hyper?: boolean
  representative?: boolean
  representedGroup?: AggregatedEdgeGroup
  highlightedAdjacent?: boolean
  highlighted?: boolean
  labelHidden?: boolean
  nodeColor?: string
  edgeColorA?: string
  edgeColorB?: string
  edgeKind?: 'simple' | 'aggregate' | 'hyper' | 'hidden'
}

/**
 * The Data type describes the data loaded into the event timeline.
 * Each entry in the `nodes` and `edges` arrays can be any object shape; the
 * accessor functions on {@link EventTimelineOptions} determine how fields are read.
 */
export type Data = { nodes: Array<unknown>; edges: Array<unknown> }

/**
 * Accessor functions used when building tooltip content.  All fields are required
 * by the time they reach {@link TooltipHelper} – defaults are resolved in
 * {@link EventTimeline}.
 */
export type TooltipAccessors = {
  nodeLabelAccessor: (node: INode) => string
  nodeGroupAccessor: (node: INode) => string
  edgeTypeAccessor: (edge: IEdge) => string
  timeAccessorFunction: (edge: IEdge) => Date
}
