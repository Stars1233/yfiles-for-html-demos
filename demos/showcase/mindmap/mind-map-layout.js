/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) by yWorks GmbH, Vor dem Kreuzberg 28,
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
  LabelPlacementPolicy,
  LayoutAnchoringPolicy,
  LayoutAnchoringStage,
  LayoutAnchoringStageData,
  LayoutExecutor,
  LevelAlignedSubtreePlacer,
  PlaceNodesAtBarycenterStage,
  PlaceNodesAtBarycenterStageData,
  Point,
  PortSides,
  SingleSplitSubtreePlacer,
  SubgraphLayoutStage,
  SubgraphLayoutStageData,
  SubtreeTransform,
  TreeLayout,
  TreeLayoutData,
  TreeLayoutPortAssigner,
  TreeLayoutPortAssignmentMode,
  TreeReductionStageData
} from '@yfiles/yfiles'
import { isCrossReference, isLeft, isRoot } from './data-types'

/** A flag indicating whether a layout animation is currently in progress. */
let inLayout = false

/**
 * Returns a configured tree layout.
 */
function createLayout() {
  const treeLayout = new TreeLayout({
    // use port candidates to keep the locations at the bottom of the node
    defaultPortAssigner: new TreeLayoutPortAssigner(TreeLayoutPortAssignmentMode.DISTRIBUTED)
  })

  treeLayout.layoutStages.prepend(new PlaceNodesAtBarycenterStage())
  // a layout stage that keeps a certain node in place during layout
  treeLayout.layoutStages.prepend(new LayoutAnchoringStage())

  return treeLayout
}

/**
 * Returns a layout data which specifies the different subtree placers,
 * port candidates, and edge comparators.
 */
function createLayoutData() {
  // create a subtree placer for a tree layout rotated to the left
  const placerLeft = new LevelAlignedSubtreePlacer(SubtreeTransform.ROTATE_RIGHT)
  placerLeft.transformation = SubtreeTransform.ROTATE_RIGHT
  placerLeft.edgeRoutingStyle = 'orthogonal'
  placerLeft.verticalAlignment = 0
  placerLeft.spacing = 10
  placerLeft.layerSpacing = 45

  // create a subtree placer for a tree layout rotated to the right
  const placerRight = new LevelAlignedSubtreePlacer(SubtreeTransform.ROTATE_LEFT)
  placerRight.transformation = SubtreeTransform.ROTATE_LEFT
  placerRight.edgeRoutingStyle = 'orthogonal'
  placerRight.verticalAlignment = 0
  placerRight.spacing = 10
  placerRight.layerSpacing = 45

  // create a subtree placer that delegates some subtrees to the left and others to the right
  const placerRoot = new SingleSplitSubtreePlacer(placerLeft, placerRight)

  const treeLayoutData = new TreeLayoutData({
    // tells the SingleSplitSubtreePlacer which side a node is on
    singleSplitSubtreePlacerPrimaryNodes: isLeft,
    // tells the layout which subtree placer to use for a node
    subtreePlacers: (node) => (isRoot(node) ? placerRoot : isLeft(node) ? placerLeft : placerRight),
    ports: {
      // tells the layout which side to place a source port on
      sourcePortCandidates: (edge) =>
        new EdgePortCandidates().addFixedCandidate(
          isLeft(edge.targetNode) ? PortSides.LEFT : PortSides.RIGHT
        ),
      // tells the layout which side to place a target port on
      targetPortCandidates: (edge) =>
        new EdgePortCandidates().addFixedCandidate(
          isLeft(edge.targetNode) ? PortSides.RIGHT : PortSides.LEFT
        )
    },
    childOrder: {
      // tells the layout how to sort the children of specific nodes
      outEdgeComparators: (_) => {
        return (edge1, edge2) => {
          if (edge1 === edge2) {
            return 0
          }
          const y1 = edge1.targetNode.layout.y
          const y2 = edge2.targetNode.layout.y

          if (isLeft(edge1.targetNode)) {
            return y1 - y2
          }
          return y2 - y1
        }
      }
    }
  })
  return treeLayoutData.combineWith(new TreeReductionStageData({ nonTreeEdges: isCrossReference }))
}

/**
 * Moves the source and target ports of the given edges to the bottom-left or
 * bottom-right corner of the node.
 */
export function adjustPortLocations(graph, edges) {
  for (const edge of edges) {
    if (!isCrossReference(edge)) {
      const sourceNode = edge.sourceNode
      const targetNode = edge.targetNode

      if (!isRoot(sourceNode)) {
        const sourceLayout = sourceNode.layout
        const sourceBottomLeft = new Point(-sourceLayout.width * 0.5, sourceLayout.height * 0.5)
        const sourceBottomRight = new Point(+sourceLayout.width * 0.5, sourceLayout.height * 0.5)
        graph.setRelativePortLocation(
          edge.sourcePort,
          isLeft(sourceNode) ? sourceBottomLeft : sourceBottomRight
        )
      } else {
        // source is root node - set port to center
        graph.setRelativePortLocation(edge.sourcePort, Point.ORIGIN)
      }

      if (!isRoot(targetNode)) {
        const targetLayout = targetNode.layout
        const targetBottomLeft = new Point(-targetLayout.width * 0.5, targetLayout.height * 0.5)
        const targetBottomRight = new Point(+targetLayout.width * 0.5, targetLayout.height * 0.5)
        graph.setRelativePortLocation(
          edge.targetPort,
          isLeft(targetNode) ? targetBottomRight : targetBottomLeft
        )
      }
    }
  }
}

/**
 * Calculates a layout on a subtree that is specified by a given
 * root node.
 * @param graph The input graph.
 * @param subtreeNodes Pre-calculated nodes belonging to the subtree
 * @param subtreeEdges Pre-calculated edges belonging to the subtree
 */
export function layoutSubtree(graph, subtreeNodes, subtreeEdges) {
  const layout = createLayout()
  // fix node layout stage - mark subtree root node as fixed
  const subtreeNodesSet = new Set(subtreeNodes)
  const fixNodeLayoutData = new LayoutAnchoringStageData({
    nodeAnchoringPolicies: (node) =>
      subtreeNodesSet.has(node) ? LayoutAnchoringPolicy.CENTER : LayoutAnchoringPolicy.NONE
  })

  const layoutData = createLayoutData()
    .combineWith(fixNodeLayoutData)
    .combineWith(new SubgraphLayoutStageData({ subgraphNodes: subtreeNodes }))

  adjustPortLocations(graph, subtreeEdges)
  graph.applyLayout(new SubgraphLayoutStage(layout), layoutData)
}

/**
 * Calculates an animated layout on the graph.
 * @param graphComponent The given graphComponent.
 * @param incrementalNodes Nodes to add incrementally or null if the layout should be calculated from scratch
 * @param collapse Whether nodes are hidden (true) or added
 */
export async function layoutTree(graphComponent, incrementalNodes = [], collapse = false) {
  // check a layout is currently in progress
  if (inLayout) {
    return Promise.resolve()
  }
  const graph = graphComponent.graph
  adjustPortLocations(graph, graph.edges.toArray())
  inLayout = true

  const layout = createLayout()

  const fixNodeLayoutData = new LayoutAnchoringStageData({
    nodeAnchoringPolicies: (node) =>
      isRoot(node) ? LayoutAnchoringPolicy.CENTER : LayoutAnchoringPolicy.NONE
  })

  let layoutData = createLayoutData().combineWith(fixNodeLayoutData)
  if (incrementalNodes.length > 0) {
    if (!collapse) {
      // move the incremental nodes to the barycenter of their neighbors before layout to get a
      // smooth layout animation
      prepareSmoothExpandLayoutAnimation(graph, incrementalNodes)
    } else {
      // mark the incremental nodes, so they end up in the barycenter of their neighbors after
      // layout for a smooth layout animation
      layoutData = layoutData.combineWith(
        new PlaceNodesAtBarycenterStageData({ affectedNodes: incrementalNodes })
      )
    }
  }

  // execute an animated layout
  const layoutExecutor = new LayoutExecutor({
    graphComponent,
    layout: layout,
    layoutData,
    animationDuration: '0.2s',
    allowUserInteraction: false,
    labelPlacementPolicies: LabelPlacementPolicy.KEEP_PARAMETER
  })
  try {
    await layoutExecutor.start()
  } finally {
    inLayout = false
  }
}

/**
 * Moves incremental nodes between their neighbors before expanding for a smooth animation.
 */
function prepareSmoothExpandLayoutAnimation(graph, incrementalNodes) {
  // mark the new nodes and place them between their neighbors
  const layoutData = new PlaceNodesAtBarycenterStageData({ affectedNodes: incrementalNodes })
  const layout = new PlaceNodesAtBarycenterStage()
  graph.applyLayout(layout, layoutData)
}

/**
 * Determines whether a layout is currently running.
 */
export function isInLayout() {
  return inLayout
}
