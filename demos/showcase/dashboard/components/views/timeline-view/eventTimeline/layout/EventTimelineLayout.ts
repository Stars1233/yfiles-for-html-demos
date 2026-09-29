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
import {
  BaseClass,
  type IEdge,
  ILayoutAlgorithm,
  type INode,
  type LayoutEdge,
  type LayoutGraph,
  LayoutGraphAdapter,
  LayoutGraphHider,
  type LayoutNode,
  Point
} from '@yfiles/yfiles'
import type { CoordinateMapping } from '../components/CoordinateMapping'
import type { NodeGroups } from '../EventTimelineTypes'
import { ItemState } from '../EventTimelineTypes'

type LayoutNodeGroup = { nodes: LayoutNode[]; collapsed: boolean; id: string }

/**
 * The layout algorithm class which specifies the locations of nodes (entities) and edges (events)
 * of a dynamic graph as an event timeline, i.e., a layout style in which nodes are rendered as
 * (labeled) parallel horizontal line-segments and edges as (labeled) parallel vertical
 * line-segments connecting their source and target nodes' horizontal line-segments. The positions
 * of nodes is determined by their (groupings) ordering (the y-axis), whereas the positions of edges
 * is determined by their timestamp (the x-axis).
 */
export class EventTimelineLayout extends BaseClass(ILayoutAlgorithm) {
  private readonly xDomain: [min: Date, max: Date]
  private readonly coordinateMapping: CoordinateMapping
  private readonly getEdgeDate: (edge: IEdge) => Date
  private readonly nodeGroupAccessorFunction: (node: INode) => string
  viewNodeGroups: NodeGroups<INode> = {}
  private nodeGroups: Map<string, LayoutNodeGroup> = new Map()
  private xPadding: number = 100

  /**
   * Instantiates a new EventTimelineLayout object.
   * @param xDomain The x-domain of the drawing.
   * @param coordinateMapping The coordinate mapping used to convert between time and x-coordinates.
   * @param getEdgeDate An accessor function to extract an edge's timestamp.
   * @param nodeGroupAccessorFunction An accessor function to extract a node's group name.
   */
  constructor(
    xDomain: [min: Date, max: Date],
    coordinateMapping: CoordinateMapping,
    getEdgeDate: (edge: IEdge) => Date,
    nodeGroupAccessorFunction: (node: INode) => string
  ) {
    super()
    this.xDomain = xDomain
    this.coordinateMapping = coordinateMapping
    this.getEdgeDate = getEdgeDate
    this.nodeGroupAccessorFunction = nodeGroupAccessorFunction
  }

  /**
   * Creates the node group mapper and node group object, which stores each group's sorted nodes and collapsed state.
   * @private
   * @param graph The LayoutGraph instance containing the edges and nodes to visualize.
   */
  private createNodeGroups(graph: LayoutGraph): void {
    // Create Initial Node Group Object (Group ID -> Node Group type)
    const nodeMapper = graph.context.getItemData(LayoutGraphAdapter.ORIGINAL_NODE_DATA_KEY)!
    this.nodeGroups.clear()
    for (const node of graph.nodes) {
      // If a node maps to no group, create a dummy 'Ungrouped' group
      const nodeGroupName: string = this.nodeGroupAccessorFunction(nodeMapper.get(node)!)

      // Create a new keyed entry for the extracted group if it does not yet exist
      if (!this.nodeGroups.has(nodeGroupName)) {
        this.nodeGroups.set(nodeGroupName, {
          nodes: [],
          collapsed: this.viewNodeGroups[nodeGroupName]?.collapsed ?? false,
          id: nodeGroupName
        })
      }
      // Push the current node into the current group node
      this.nodeGroups.get(nodeGroupName)?.nodes.push(node)
    }

    // Recreate Node Groups Object, this time sorted
    this.nodeGroups = new Map(
      Array.from(this.nodeGroups.entries()).sort((nodeGroupA, nodeGroupB) => {
        return nodeGroupA[0].localeCompare(nodeGroupB[0])
      })
    )
  }

  /**
   * Positions the dynamic graph's edges in 2D space along the x-axis of the
   * event timeline visualization.
   * @param graph The IGraph object whose edges are to be laid out.
   * @private
   */
  private positionEdges(graph: LayoutGraph): void {
    const edgeMapper = graph.context.getItemData(LayoutGraphAdapter.ORIGINAL_EDGE_DATA_KEY)!
    graph.edges.forEach((edge: LayoutEdge): void => {
      const sourceY = edge.source.layout.centerY
      const targetY = edge.target.layout.centerY
      const x = this.coordinateMapping.timeToX(this.getEdgeDate(edgeMapper.get(edge)!))
      edge.sourcePortLocation = new Point(x, sourceY)
      edge.targetPortLocation = new Point(x, targetY)
    })
  }

  /**
   * Positions the dynamic graphs nodes in 2D space along the y-axis of the
   * event timeline visualization.
   * @param graph The IGraph object whose nodes are to be laid out.
   * @private
   */
  private positionNodes(graph: LayoutGraph): void {
    // Track "logical" unit steps, not world coordinates.
    let currentUnits = 0
    let previousGroupName: string
    const nodeMapper = graph.context.getItemData(LayoutGraphAdapter.ORIGINAL_NODE_DATA_KEY)!
    graph.nodes
      .toSorted((nodeA, nodeB): number => {
        const nameA = this.nodeGroupAccessorFunction(nodeMapper.get(nodeA)!)
        const nameB = this.nodeGroupAccessorFunction(nodeMapper.get(nodeB)!)
        if (!nameA || !nameB) return 0
        return nameA.localeCompare(nameB)
      })
      .forEach((node: LayoutNode, index: number): void => {
        const inode = nodeMapper.get(node)!
        const currentGroupName = this.nodeGroupAccessorFunction(inode)
        if (index === 0) {
          previousGroupName = currentGroupName
          currentUnits = 0
        } else {
          currentUnits +=
            this.nodeGroupAccessorFunction(inode) !== previousGroupName
              ? 2
              : this.nodeGroups.get(currentGroupName)?.collapsed
                ? 0
                : 1
        }

        const y = currentUnits * this.coordinateMapping.unitHeight * this.coordinateMapping.stretchY
        const x = this.coordinateMapping.timeToX(this.xDomain[0]) - this.xPadding
        const width = this.coordinateMapping.timeToX(this.xDomain[1]) + this.xPadding - x

        node.layout.y = y
        node.layout.x = x
        node.layout.width = width
        previousGroupName = currentGroupName
      })
  }

  /**
   * Lays out the provided LayoutGraph as an event timeline visualization.
   * @param graph The LayoutGraph to be laid out in 2D as an event timeline visualization.
   */
  applyLayout(graph: LayoutGraph): void {
    // Create a new graph hider to visualize only representative edges
    const graphHider = new LayoutGraphHider(graph)
    const edgeMapper = graph.context.getItemData(LayoutGraphAdapter.ORIGINAL_EDGE_DATA_KEY)!
    graphHider.hideEdges(
      graph.edges.filter((edge: LayoutEdge) => {
        const originalEdge = edgeMapper.get(edge)!
        return originalEdge.lookup(ItemState)?.representative === true
      })
    )

    // Create Node Groups
    this.createNodeGroups(graph)

    // Position Edges and Nodes
    this.positionNodes(graph)
    this.positionEdges(graph)

    // Unhide
    graphHider.unhideAll()
  }
}
