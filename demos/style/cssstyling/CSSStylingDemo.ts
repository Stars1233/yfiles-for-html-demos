/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML 2.6.
 ** Copyright (c) 2000-2023 by yWorks GmbH, Vor dem Kreuzberg 28,
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
  DefaultLabelStyle,
  ExteriorLabelModel,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphOverviewCanvasVisualCreator,
  GraphOverviewComponent,
  GraphSnapContext,
  IEdge,
  ILabel,
  type IModelItem,
  INode,
  IPort,
  type IRenderContext,
  LabelSnapContext,
  License,
  Visualization
} from 'yfiles'
import { createDemoEdgeStyle, createDemoNodeStyle } from 'demo-resources/demo-styles'
import { fetchLicense } from 'demo-resources/fetch-license'
import { finishLoading } from 'demo-resources/demo-page'
import CSS3NodeStyleWrapper from './CSS3NodeStyleWrapper'

let graphComponent: GraphComponent

async function run(): Promise<void> {
  License.value = await fetchLicense()

  graphComponent = new GraphComponent('graphComponent')
  const overviewComponent = new GraphOverviewComponent('overviewComponent', graphComponent)

  // add a custom visualization for the elements in the overview
  overviewComponent.graphVisualCreator = new GraphOverviewVisualCreator(overviewComponent.graph!)

  configureInputMode()
  createSampleGraph()
}

/**
 * Configures an input mode to allow the operations which use the templates that were styled with CSS.
 */
function configureInputMode(): void {
  const graphEditorInputMode = new GraphEditorInputMode({
    // enable snapping
    snapContext: new GraphSnapContext({
      enabled: true,
      snapDistance: 10,
      visualizeSnapResults: true
    }),
    labelSnapContext: new LabelSnapContext(),
    // allow focusing all graph elements
    focusableItems: GraphItemTypes.ALL
  })

  // allow hovering of all graph elements
  graphEditorInputMode.itemHoverInputMode.hoverItems = GraphItemTypes.ALL

  // enable tooltips
  const mouseHoverInputMode = graphEditorInputMode.mouseHoverInputMode
  mouseHoverInputMode.toolTipLocationOffset = [15, 15]
  mouseHoverInputMode.delay = '500ms'
  mouseHoverInputMode.duration = '5s'

  // show an indicator for the current label position
  graphEditorInputMode.moveLabelInputMode.visualization = Visualization.GHOST

  // add a tooltip for hovered items
  graphEditorInputMode.addQueryItemToolTipListener((src, event) => {
    if (event.handled) {
      return
    }
    event.toolTip = createTooltipContent(event.item!)
    event.handled = true
  })

  // add a highlight for hovered items
  graphEditorInputMode.itemHoverInputMode.addHoveredItemChangedListener((sender, event) => {
    if (event.oldItem) {
      graphComponent.highlightIndicatorManager.removeHighlight(event.oldItem)
    }
    if (event.item) {
      graphComponent.highlightIndicatorManager.addHighlight(event.item)
    }
  })

  // whenever a node is created by the user, we set a created flag on its tag data object, which will then be used
  // by the custom node style to set the appropriate CSS classes
  graphEditorInputMode.addNodeCreatedListener((sender, args) => {
    const node = args.item
    node.tag = { created: true }
  })

  graphComponent.inputMode = graphEditorInputMode
}

/**
 * Creates a tooltip text depending on the class of the item.
 */
function createTooltipContent(item: IModelItem): string | null {
  if (item instanceof INode) {
    return 'Node Tooltip'
  } else if (item instanceof IEdge) {
    return 'Edge Tooltip'
  } else if (item instanceof IPort) {
    return 'Port Tooltip'
  } else if (item instanceof ILabel) {
    return 'Label Tooltip'
  }
  return null
}

/**
 * Creates a sample graph that contains all kinds of graph elements. These elements can be selected, focused,
 * highlighted and edited.
 */
function createSampleGraph(): void {
  const demoNodeStyle = createDemoNodeStyle()
  demoNodeStyle.stroke = '1.5px #3c4253'
  demoNodeStyle.fill = 'white'

  const demoEdgeStyle = createDemoEdgeStyle({ showTargetArrow: false })
  demoEdgeStyle.stroke = '1.5px white'

  const demoLabelStyle = new DefaultLabelStyle({
    textFill: 'white',
    insets: [3, 5, 3, 5],
    backgroundFill: 'rgba(60, 66, 83, 0.5)'
  })

  const graph = graphComponent.graph
  graph.nodeDefaults.style = new CSS3NodeStyleWrapper(demoNodeStyle)
  graph.edgeDefaults.style = demoEdgeStyle
  graph.nodeDefaults.labels.style = demoLabelStyle
  graph.edgeDefaults.labels.style = demoLabelStyle
  graph.nodeDefaults.labels.layoutParameter = ExteriorLabelModel.SOUTH

  const node0 = graph.createNodeAt([291, 433])
  const node1 = graph.createNodeAt([396, 398])
  const node2 = graph.createNodeAt([462, 308])
  const node3 = graph.createNodeAt([462, 197])
  const node4 = graph.createNodeAt([396, 107])
  const node5 = graph.createNodeAt([291, 73])
  const node6 = graph.createNodeAt([185, 107])
  const node7 = graph.createNodeAt([119, 197])
  const node8 = graph.createNodeAt([119, 308])
  const node9 = graph.createNodeAt([185, 398])

  graph.addLabel(node0, 'Node 0', ExteriorLabelModel.SOUTH)
  graph.addLabel(node1, 'Node 1', ExteriorLabelModel.SOUTH_EAST)
  graph.addLabel(node2, 'Node 2', ExteriorLabelModel.EAST)
  graph.addLabel(node3, 'Node 3', ExteriorLabelModel.EAST)
  graph.addLabel(node4, 'Node 4', ExteriorLabelModel.NORTH_EAST)
  graph.addLabel(node5, 'Node 5', ExteriorLabelModel.NORTH)
  graph.addLabel(node6, 'Node 6', ExteriorLabelModel.NORTH_WEST)
  graph.addLabel(node7, 'Node 7', ExteriorLabelModel.WEST)
  graph.addLabel(node8, 'Node 8', ExteriorLabelModel.WEST)
  graph.addLabel(node9, 'Node 9', ExteriorLabelModel.SOUTH_WEST)

  graph.createEdge(node0, node4)
  graph.createEdge(node6, node0)
  graph.createEdge(node6, node5)
  graph.createEdge(node5, node2)
  graph.createEdge(node3, node7)
  graph.createEdge(node9, node4)

  graphComponent.fitGraphBounds()
}

class GraphOverviewVisualCreator extends GraphOverviewCanvasVisualCreator {
  /**
   * Paints the path of the edge in a very light gray.
   */
  paintEdge(renderContext: IRenderContext, ctx: CanvasRenderingContext2D, edge: IEdge): void {
    ctx.strokeStyle = '#f7f7f7'
    ctx.beginPath()
    ctx.moveTo(edge.sourcePort!.location.x, edge.sourcePort!.location.y)
    edge.bends.forEach(bend => ctx.lineTo(bend.location.x, bend.location.y))
    ctx.lineTo(edge.targetPort!.location.x, edge.targetPort!.location.y)
    ctx.stroke()
  }

  /**
   * Paints the outline of the group node in a very light gray.
   */
  paintGroupNode(renderContext: IRenderContext, ctx: CanvasRenderingContext2D, node: INode): void {
    ctx.strokeStyle = '#f7f7f7'
    ctx.strokeRect(node.layout.x, node.layout.y, node.layout.width, node.layout.height)
  }

  /**
   * Paints the rectangle of the node in a very light gray
   */
  paintNode(renderContext: IRenderContext, ctx: CanvasRenderingContext2D, node: INode): void {
    ctx.fillStyle = '#f7f7f7'
    ctx.fillRect(node.layout.x, node.layout.y, node.layout.width, node.layout.height)
  }
}

void run().then(finishLoading)
