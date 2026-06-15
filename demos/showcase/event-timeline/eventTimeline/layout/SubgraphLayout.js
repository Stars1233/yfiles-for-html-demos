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
import { BaseClass, ILayoutAlgorithm, Point } from '@yfiles/yfiles'

/**
 * The SubgraphLayout is a tabular layout, akin to a EventTimeline, intended specifically for a set of edges whose timestamps
 * are identical, i.e., perfectly overlapping edges. These edges are then (when clicked by the user) visualized in a new
 * window atop the existing event timeline visualization. Like a standard EventTimeline, this subgraph layout visualizes
 * each node in the subgraph as a (labeled) parallel, equidistant, horizontal line-segment, spanning the width of the
 * canvas. Each edge is visualized as a (labeled) parallel, equidistant, vertical line-segment, connecting its source
 * and target node's line-segments.
 */
export class SubgraphLayout extends BaseClass(ILayoutAlgorithm) {
  unitHeight = Infinity
  unitWidth = Infinity
  width
  height
  symmetricXPadding
  labelXPadding
  labelYPadding = 100
  nodeOrder
  sortedNodes = []
  sortedEdges = []
  nodeIdAccessor

  /**
   * Instantiates a new SubgraphLayout object.
   * @param width the width of the canvas within which to render the subgraph layout
   * @param height the height of the canvas within which to render the subgraph layout
   * @param nodeOrder the (pre-determined) node order, i.e., an array of INode objects which
   * determines the order of the nodes in the subgraph's drawing
   * @param symmetricXPadding the amount of the pixel padding on either side of the canvas, i.e.,
   * the amount of whitespace between the canvas bounds and the first/last edge
   * @param labelXPadding the amount of x space given to an edge label
   * @param labelYPadding the amount of y space given to a node label
   * @param nodeIdAccessor function to extract the unique identifier from a node tag
   */
  constructor(
    width,
    height,
    nodeOrder,
    symmetricXPadding = 100,
    labelXPadding = 50,
    labelYPadding = 100,
    nodeIdAccessor
  ) {
    super()
    this.height = height
    this.width = width
    this.nodeOrder = nodeOrder
    this.symmetricXPadding = symmetricXPadding
    this.labelXPadding = labelXPadding
    this.labelYPadding = labelYPadding
    this.nodeIdAccessor = nodeIdAccessor
  }

  /**
   * Calculates the unit height, i.e., the smallest distance (in height) between
   * two nodes placed atop one-another.
   * @param graph tne LayoutGraph object containing all nodes to be visualized
   */
  calculateUnitHeight(graph) {
    const nNodes = graph.nodes.size

    this.unitHeight = (this.height - 2 * this.height * 0.1 - this.labelYPadding) / (nNodes - 1)
  }

  /**
   * Calculates the unit width, i.e., the smallest distance (in width) between
   * two edges placed next to one-another.
   * @param graph tne LayoutGraph object containing all edges to be visualized
   */
  calculateUnitWidth(graph) {
    const nEdges = graph.edges.size
    this.unitWidth = (this.width - 2 * this.symmetricXPadding - this.labelXPadding) / (nEdges - 1)
  }

  /**
   * Sorts all the nodes in the provided graph according to the a-priori,
   * user-provided node-order.
   * @param graph The LayoutGraph Object containing all nodes to be sorted and subsequently
   * visualized.
   * @private
   */
  sortNodes(graph) {
    this.sortedNodes = graph.nodes
      .toSorted((nodeA, nodeB) => {
        const indexA = this.nodeOrder.findIndex((node) => {
          return this.nodeIdAccessor(node.tag) === this.nodeIdAccessor(nodeA.tag)
        })
        const indexB = this.nodeOrder.findIndex((node) => {
          return this.nodeIdAccessor(node.tag) === this.nodeIdAccessor(nodeB.tag)
        })
        return indexA - indexB
      })
      .toArray()
  }

  /**
   * Sorts (given some existing node ordering) all the edges in the provided
   * graph according to their length.
   * @private
   */
  sortEdges() {
    this.sortedNodes.forEach((node, nodeIndex) => {
      const edges = node.edges
        .toArray()
        .filter((edge) => !this.sortedEdges.includes(edge))
        .toSorted((edgeA, edgeB) => {
          const nodeA = node === edgeA.target ? edgeA.source : edgeA.target
          const nodeB = node === edgeB.target ? edgeB.source : edgeB.target
          const indexA = this.sortedNodes.indexOf(nodeA)
          const indexB = this.sortedNodes.indexOf(nodeB)
          return Math.abs(nodeIndex - indexA) - Math.abs(nodeIndex - indexB)
        })
      this.sortedEdges = this.sortedEdges.concat(edges)
    })
  }

  /**
   * Calculates all nodes' positions sequentially, as a function of the already
   * calculated unit height and the previous node's position.
   * @private
   */
  layoutNodes() {
    let previousNode
    this.sortedNodes.forEach((node, index) => {
      if (index === 0) {
        node.layout.x = 0
        node.layout.y = this.height * 0.1 + this.labelYPadding
        node.layout.width = this.width
        node.layout.height = 2
      } else {
        node.layout.x = 0
        node.layout.y = previousNode.layout.y + this.unitHeight
        node.layout.width = this.width
        node.layout.height = 2
      }
      previousNode = node
    })
  }

  /**
   * Calculates all edges' positions sequentially, as a function of the already
   * calculated unit width and the previous edge's position.
   * @private
   */
  layoutEdges() {
    let previousEdge
    this.sortedEdges.forEach((edge, index) => {
      let sourceX
      let targetX
      let sourceY
      let targetY
      if (index === 0) {
        sourceX = this.symmetricXPadding + this.labelXPadding
        targetX = this.symmetricXPadding + this.labelXPadding
        sourceY = edge.source.layout.centerY
        targetY = edge.target.layout.centerY
      } else {
        sourceX = previousEdge.sourcePortLocation.x + this.unitWidth
        targetX = previousEdge.targetPortLocation.x + this.unitWidth
        sourceY = edge.source.layout.centerY
        targetY = edge.target.layout.centerY
      }
      edge.sourcePortLocation = new Point(sourceX, sourceY)
      edge.targetPortLocation = new Point(targetX, targetY)
      previousEdge = edge
    })
  }

  /**
   * Lays out the provided graph as a EventTimeline-style visualization. The method first
   * calculates both the unit height and width, sorts the subgraph's nodes and edges, and
   * subsequently lays out both nodes (according a user-specified ordering) and edges (according
   * to edge length).
   * @param graph The LayoutGraph object to be laid out.
   */
  applyLayout(graph) {
    this.calculateUnitHeight(graph)
    this.calculateUnitWidth(graph)

    this.sortNodes(graph)
    this.sortEdges()

    this.layoutNodes()
    this.layoutEdges()
  }
}
