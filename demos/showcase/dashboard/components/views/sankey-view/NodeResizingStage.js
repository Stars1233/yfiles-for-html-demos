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
  EdgePortCandidates,
  HierarchicalLayout,
  LayoutOrientation,
  LayoutStageBase,
  Point,
  PortCandidateType
} from '@yfiles/yfiles'

/**
 * This layout stage ensures that the size of the nodes is large enough such that
 * all edges can be placed without overlaps.
 */
export class NodeResizingStage extends LayoutStageBase {
  #layoutOrientation
  #portBorderGapRatio
  #minimumPortDistance

  /**
   * Creates a new instance of NodeResizingStage.
   */
  constructor(layout) {
    super(layout)
    this.#layoutOrientation = LayoutOrientation.LEFT_TO_RIGHT
    this.#portBorderGapRatio = 0
    this.#minimumPortDistance = 0
  }

  /**
   * Gets the main orientation of the layout. Should be the same value as for the associated core layout
   * algorithm.
   * @returns The main orientation of the layout
   */
  get layoutOrientation() {
    return this.#layoutOrientation
  }

  /**
   * Gets the main orientation of the layout. Should be the same value as for the associated core layout
   * algorithm.
   * @param orientation One of the default layout orientations
   */
  set layoutOrientation(orientation) {
    this.#layoutOrientation = orientation
  }

  /**
   * Gets the port border gap ratio for the port distribution at the sides of the nodes.
   * Should be the same value as for the associated core layout algorithm.
   * @returns The port border gap ratio
   */
  get portBorderGapRatio() {
    return this.#portBorderGapRatio
  }

  /**
   * Sets the port border gap ratio for the port distribution at the sides of the nodes. Should be the same value
   * as for the associated core layout algorithm.
   * @param portBorderGapRatio The given ratio
   */
  set portBorderGapRatio(portBorderGapRatio) {
    this.#portBorderGapRatio = portBorderGapRatio
  }

  /**
   * Returns the minimum distance between two ports on the same node side.
   * @returns The minimum distance between two ports
   */
  get minimumPortDistance() {
    return this.#minimumPortDistance
  }

  /**
   * Gets the minimum distance between two ports on the same node side.
   * @param minimumPortDistance The minimum distance
   */
  set minimumPortDistance(minimumPortDistance) {
    this.#minimumPortDistance = minimumPortDistance
  }

  /**
   * Applies the layout to the given graph.
   * @param graph The given graph
   */
  applyLayoutImpl(graph) {
    if (!this.coreLayout) {
      return
    }

    graph.nodes.forEach((node) => {
      this.adjustNodeSize(node, graph)
    })

    // run the core layout
    this.coreLayout.applyLayout(graph)
  }

  /**
   * Adjusts the size of the given node.
   * @param node The given node
   * @param graph The given graph
   */
  adjustNodeSize(node, graph) {
    if (graph.isGroupNode(node)) {
      return
    }
    let width = node.layout.width
    let height = node.layout.height

    const leftEdgeSpace = node.inEdges.size > 0 ? this.calcRequiredSpace(node.inEdges, graph) : 0
    const rightEdgeSpace = node.outEdges.size > 0 ? this.calcRequiredSpace(node.outEdges, graph) : 0
    if (
      this.layoutOrientation === LayoutOrientation.TOP_TO_BOTTOM ||
      this.layoutOrientation === LayoutOrientation.BOTTOM_TO_TOP
    ) {
      // we have to enlarge the width such that the in-/out-edges can be placed side by side without overlaps
      width = Math.max(width, leftEdgeSpace)
      width = Math.max(width, rightEdgeSpace)
    } else {
      // we have to enlarge the height such that the in-/out-edges can be placed side by side without overlaps
      height = Math.max(height, leftEdgeSpace)
      height = Math.max(height, rightEdgeSpace)
    }

    // adjust size for edges with strong port candidates
    const edgeThicknessDP = graph.context.getItemData(HierarchicalLayout.EDGE_THICKNESS_DATA_KEY)
    if (edgeThicknessDP !== null) {
      node.edges.forEach((edge) => {
        const thickness = edgeThicknessDP.get(edge)

        const spc = this.getFirstPortCandidate(edge, true)
        if (edge.source === node && spc && spc.type !== PortCandidateType.FREE) {
          const sourcePoint = new Point(
            edge.source.layout.center.x - edge.sourcePortLocation.x,
            edge.source.layout.center.y - edge.sourcePortLocation.y
          )
          width = Math.max(width, Math.abs(sourcePoint.x) * 2 + thickness)
          height = Math.max(height, Math.abs(sourcePoint.y) * 2 + thickness)
        }

        const tpc = this.getFirstPortCandidate(edge, false)
        if (edge.target === node && tpc && tpc.type !== PortCandidateType.FREE) {
          const targetPoint = new Point(
            edge.target.layout.center.x - edge.targetPortLocation.x,
            edge.target.layout.center.y - edge.targetPortLocation.y
          )
          width = Math.max(width, Math.abs(targetPoint.x) * 2 + thickness)
          height = Math.max(height, Math.abs(targetPoint.y) * 2 + thickness)
        }
      })
    }
    node.layout.width = width
    node.layout.height = height
  }

  /**
   * Calculates the space required when placing the given edge side by side without overlaps and considering
   * the specified minimum port distance and edge thickness.
   * @param edges The edges to calculate the space for
   * @param graph The given graph
   */
  calcRequiredSpace(edges, graph) {
    const edgeThicknessDP = graph.context.getItemData(HierarchicalLayout.EDGE_THICKNESS_DATA_KEY)
    return (
      edges.reduce((acc, edge) => {
        return acc + (edgeThicknessDP === null ? 0 : edgeThicknessDP.get(edge))
      }, 0) +
      (edges.size - 1) * this.minimumPortDistance +
      2 * this.portBorderGapRatio * this.minimumPortDistance
    )
  }

  /**
   * Returns the first port candidate for the given edge, if exists.
   */
  getFirstPortCandidate(e, atSource) {
    const dp = e.graph.context.getItemData(
      atSource
        ? EdgePortCandidates.SOURCE_PORT_CANDIDATES_DATA_KEY
        : EdgePortCandidates.TARGET_PORT_CANDIDATES_DATA_KEY
    )
    return dp?.get(e)?.candidates.at(0) ?? null
  }
}
