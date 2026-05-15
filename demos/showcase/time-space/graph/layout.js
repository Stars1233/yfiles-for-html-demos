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
  HierarchicalLayout,
  LayoutExecutor,
  LayoutOrientation,
  LayoutStageBase,
  Point,
  RadialLayout,
  RadialLayoutData,
  TimeSpan
} from '@yfiles/yfiles'
import { getGraphMode } from './graph-mode'
import CircleVisual from './CircleVisual'

let currentCenterNode = null
let circleRenderTreeElement

/**
 * Adds a circle visual drawn around the nodes in the centric graph mode.
 */
function addCircleVisual(graphComponent) {
  const placementProvider = (node) => {
    const tag = node.tag
    return tag?.nodePlacementsResult ?? null
  }
  return graphComponent.renderTree.createElement(
    graphComponent.renderTree.backgroundGroup,
    new CircleVisual(placementProvider)
  )
}

export function removeCircleVisual() {
  circleRenderTreeElement?.renderTree.remove(circleRenderTreeElement)
  circleRenderTreeElement = null
}

/**
 * Updates the layout of the graph.
 * - 'geospatial': The graph is displayed in geospatial coordinates.
 * - 'centric': The graph is displayed in a radial layout.
 * - 'tree': The graph is displayed as a tree.
 * @param graphLayer The graph layer to update.
 * @param map The Leaflet map to update.
 * @param centerNode The center node of the 'centric' layout. Passing undefined re-uses the previous center node.
 */
export async function updateLayout(graphLayer, map, centerNode) {
  const graphMode = getGraphMode()
  const graphComponent = graphLayer.graphComponent

  removeCircleVisual()

  if (typeof centerNode !== 'undefined') {
    currentCenterNode = centerNode
  }

  switch (graphMode) {
    case 'geospatial':
      graphLayer.updateGraphDiv(map)
      break
    case 'centric':
      const center = await centricLayout(graphComponent, currentCenterNode)
      if (center) {
        placeHiddenNodesInGraphCenter(graphComponent, center)
      }
      // Add the circle visual after the layout is finished
      circleRenderTreeElement = addCircleVisual(graphComponent)
      break
    case 'tree':
      await treeLayout(graphComponent)
      placeHiddenNodesInGraphCenter(graphComponent, graphComponent.viewport.center)
      break
  }
}

/**
 * Radial layout with the given node at the center.
 * @returns the graph center
 */
export async function centricLayout(graphComponent, centerNode = null) {
  const highlightManager = graphComponent.highlightIndicatorManager
  highlightManager.items.clear()
  const radialLayout = new RadialLayout()

  const layoutData = new RadialLayoutData()
  if (centerNode) {
    layoutData.centerNodes.items.add(centerNode)
  }

  // center the graph inside the viewport to avoid nodes flying in from the sides when switched back to map mode
  const centerGraphStage = new CenterGraphStage(radialLayout, graphComponent.viewport.center)
  const layoutExecutor = new LayoutExecutor({
    graphComponent,
    layout: centerGraphStage,
    layoutData: layoutData,
    animationDuration: TimeSpan.fromMilliseconds(500),
    targetBoundsPadding: 50
  })
  await layoutExecutor.start()
  graphComponent.graph.nodes.forEach((node) => {
    node.tag.nodePlacementsResult = layoutData.nodePlacementsResult.get(node)
  })
  // calculate the radial graph center
  const node = graphComponent.graph.nodes.first()
  if (node) {
    const info = layoutData.nodePlacementsResult.get(node)
    if (info) {
      const centerOffset = info.centerOffset
      return new Point(node.layout.centerX - centerOffset.x, node.layout.centerY - centerOffset.y)
    }
  }
}

/**
 * Layouts the graph as a tree using a hierarchical layout with the left-to-right layout orientation.
 */
async function treeLayout(graphComponent) {
  const highlightManager = graphComponent.highlightIndicatorManager
  highlightManager.items.clear()

  const hierarchicLayout = new HierarchicalLayout()
  hierarchicLayout.layoutOrientation = LayoutOrientation.LEFT_TO_RIGHT
  hierarchicLayout.minimumLayerDistance = 100
  const centerGraphStage = new CenterGraphStage(hierarchicLayout, graphComponent.viewport.center)
  const layoutExecutor = new LayoutExecutor({
    graphComponent,
    layout: centerGraphStage,
    animationDuration: new TimeSpan(500),
    targetBoundsPadding: 50
  })
  await layoutExecutor.start()
}

/**
 * Places all currently hidden nodes in the graph center and removes the edge bends to ensure a nice animation when nodes appear.
 */
function placeHiddenNodesInGraphCenter(graphComponent, center) {
  const graph = graphComponent.graph
  const fullGraph = graph.wrappedGraph
  // filter the hidden nodes
  fullGraph.nodes
    .filter((node) => !graph.nodes.includes(node))
    .forEach((node) => {
      // place the node in the center
      fullGraph.setNodeCenter(node, center)
      // remove all bends
      fullGraph.inEdgesAt(node).forEach((edge) => {
        fullGraph.clearBends(edge)
      })
      fullGraph.outEdgesAt(node).forEach((edge) => {
        fullGraph.clearBends(edge)
      })
    })
}

/**
 * Layout stage that centers the graph around the given point.
 * A layout is applied after the centering.
 */
class CenterGraphStage extends LayoutStageBase {
  centerPoint

  constructor(coreLayout, centerPoint) {
    super(coreLayout)
    this.centerPoint = centerPoint
  }

  applyLayoutImpl(graph) {
    const bounds = graph.getBounds(graph.nodes)
    graph.nodes.forEach((node) => {
      node.layout.centerX = this.centerPoint.x - bounds.centerX
      node.layout.centerY = this.centerPoint.y - bounds.centerY
    })
    this.coreLayout?.applyLayout(graph)
  }
}
