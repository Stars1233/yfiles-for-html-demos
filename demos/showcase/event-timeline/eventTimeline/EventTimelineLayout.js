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
import { BaseClass, ILayoutAlgorithm, LayoutGraphHider, Point } from '@yfiles/yfiles'

/**
 * The layout algorithm class which specifies the locations of nodes (entities) and edges (events)
 * of a dynamic graph as an event timeline, i.e., a layout style in which nodes are rendered as
 * (labeled) parallel horizontal line-segments and edges as (labeled) parallel vertical
 * line-segments connecting their source and target nodes' horizontal line-segments. The positions
 * of nodes is determined by their (groupings) ordering (the y-axis), whereas the positions of edges
 * is determined by their timestamp (the x-axis).
 */
export class EventTimelineLayout extends BaseClass(ILayoutAlgorithm) {
  xDomain
  coordinateMapping

  timeAccessorFunction
  xPadding = 50
  viewNodeGroups = {}
  nodeGroups = new Map()

  /**
   * Instantiates a new EventTimelineLayout algorithm object.
   * @param xDomain The minimum and maximum dates found in the edges' timestamps.
   * @param coordinateMapping The various hyperparameters that dictate how the layout algorithm
   * will lay out nodes and edges in 2D space.
   * @param timeAccessorFunction A function with which to access an edge's (event's) timestamp; must
   * return a Date object
   */
  constructor(xDomain, coordinateMapping, timeAccessorFunction) {
    super()
    this.xDomain = xDomain
    this.coordinateMapping = coordinateMapping
    this.timeAccessorFunction = timeAccessorFunction
  }

  /**
   * Creates the node group mapper and node group object, which stores each group's sorted nodes and collapsed state.
   * @private
   * @param graph The LayoutGraph instance containing the edges and nodes to visualize.
   */
  createNodeGroups(graph) {
    // Create Initial Node Group Object (Group ID -> Node Group type)
    this.nodeGroups.clear()
    for (const node of graph.nodes) {
      // If a node maps to no group, create a dummy 'Ungrouped' group
      const nodeGroupName = this.getNodeGroupName(node) ?? 'Ungrouped'

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
  positionEdges(graph) {
    graph.edges.forEach((edge) => {
      const sourceY = edge.source.layout.centerY
      const targetY = edge.target.layout.centerY
      const x = this.coordinateMapping.timeToX(this.timeAccessorFunction(edge))
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
  positionNodes(graph) {
    const height = this.coordinateMapping.unitHeight * 0.01

    // Track "logical" unit steps, not world coordinates.
    let currentUnits = 0
    let previousGroupName

    graph.nodes
      .toSorted((nodeA, nodeB) => {
        const nameA = this.getNodeGroupName(nodeA)
        const nameB = this.getNodeGroupName(nodeB)
        if (!nameA || !nameB) return 0
        return nameA.localeCompare(nameB)
      })
      .forEach((node, index) => {
        const currentGroupName = this.getNodeGroupName(node) ?? 'Ungrouped'
        if (index === 0) {
          previousGroupName = currentGroupName
          currentUnits = 0
        } else {
          currentUnits +=
            this.getNodeGroupName(node) !== previousGroupName
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
        node.layout.height = height
        previousGroupName = currentGroupName
      })
  }

  /**
   * Extracts the group (name) of a node from its tag.
   * @param node The LayoutNode whose group (name) is to be extracted.
   * @private
   * @returns A string describing the specified node's group (name).
   */
  getNodeGroupName(node) {
    const nodeTag = node.tag
    return String(nodeTag['group'])
  }

  /**
   * Lays out the provided LayoutGraph as an event timeline visualization.
   * @param graph The LayoutGraph to be laid out in 2D as an event timeline visualization.
   */
  applyLayout(graph) {
    // Create a new graph hider to visualize only representative edges
    const graphHider = new LayoutGraphHider(graph)
    graphHider.hideEdges(graph.edges.filter((edge) => edge.tag.representative))

    // Create Node Groups
    this.createNodeGroups(graph)

    // Position Edges and Nodes
    this.positionNodes(graph)
    this.positionEdges(graph)

    // Unhide
    graphHider.unhideAll()
  }
}
