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
  GraphBuilder,
  GraphComponent,
  GraphItemTypes,
  GraphViewerInputMode,
  IEdge,
  ImageNodeStyle,
  INode,
  License,
  Point,
  PolylineEdgeStyle,
  PopoverDescriptor,
  PopoverBehavior
} from '@yfiles/yfiles'
import licenseData from '../../../lib/license.json'
import graphData from './resources/graph-data.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'

/**
 * Runs the demo.
 */
async function run() {
  License.value = licenseData

  const graphComponent = new GraphComponent('graphComponent')
  // add some padding to prevent overlaps with the demo toolbar
  graphComponent.contentMargins = [80, 10, 10, 10]

  initializeInputMode(graphComponent)

  initializePopups(graphComponent)

  buildGraph(graphComponent)
}

/**
 * Opens a node/edge popup on click. The {@link PopoverManager} in combination with popovers
 * configured with {@link PopoverBehavior.AUTO} ensures that there is only one popup opened at a time.
 *
 * This demo watches the {@link GraphComponent.currentItem} so that clicks on items but also
 * keyboard navigation opens the popup for the currently focused item.
 */
function initializePopups(graphComponent) {
  const inputMode = graphComponent.inputMode

  // The pop-up is shown for the currentItem thus nodes and edges should be focusable
  inputMode.focusableItems = GraphItemTypes.NODE | GraphItemTypes.EDGE

  // Register a listener that shows the pop-up for the currentItem
  graphComponent.addEventListener('current-item-changed', () => {
    const item = graphComponent.currentItem
    if (item instanceof INode) {
      const layout = item.layout
      void inputMode.popoverManager.open(
        new PopoverDescriptor({
          behavior: PopoverBehavior.AUTO,
          // display the popup above the node
          ratios: new Point(0.5, 1),
          offset: new Point(0, -20),
          anchor: new Point(layout.center.x, layout.y),
          content: createNodePopup(item)
        })
      )
    } else if (item instanceof IEdge) {
      const bounds = item.style.renderer
        .getBoundsProvider(item, item.style)
        .getBounds(graphComponent.canvasContext)
      void inputMode.popoverManager.open(
        new PopoverDescriptor({
          behavior: PopoverBehavior.AUTO,
          // display the popup in the center of the edge's bounds
          ratios: new Point(0.5, 0.5),
          anchor: bounds.center,
          content: createEdgePopup(item)
        })
      )
    }
  })
}

/**
 * Creates a popup element that shows the business data of the given node.
 * @param node The node for which to create the popup
 */
function createNodePopup(node) {
  const data = node.tag
  const popup = document.createElement('div')
  popup.className = 'popupContent'
  popup.innerHTML = `
    <div class="popupContentLeft">
      <img style="position: relative" src="resources/${data.icon}.svg" />
    </div>
    <div class="popupContentRight">
      <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px">${data.name}</div>
      <div style="margin-bottom: 4px">${data.position}</div>
      <div>${data.email}</div>
      <div>${data.phone}</div>
    </div>
  `
  return popup
}

/**
 * Creates a popup element that shows the business data of the given edge.
 * @param edge The edge for which to create the popup
 */
function createEdgePopup(edge) {
  // get business data from node tags
  const { name: sourceName } = edge.sourcePort.owner.tag
  const { name: targetName } = edge.targetPort.owner.tag
  const popup = document.createElement('div')
  popup.className = 'popupContent'
  popup.innerHTML = `
    <div style="display: inline-block">
      <div style="font-weight: bold; float: left">${sourceName}</div>
      <div style="float: left; margin-left: 5px; margin-right: 5px">&#x2192;</div>
      <div style="font-weight: bold; float: left">${targetName}</div>
    </div>
  `
  return popup
}

/**
 * Iterates through the given data set and creates nodes and edges according to the given data.
 */
function buildGraph(graphComponent) {
  const graphBuilder = new GraphBuilder(graphComponent.graph)

  const nodesSource = graphBuilder.createNodesSource({
    data: graphData.nodeList,
    id: (item) => item.id,
    layout: (item) => item.layout,
    tag: (item) => item.tag
  })
  nodesSource.nodeCreator.styleProvider = (item) =>
    new ImageNodeStyle(`./resources/${item.tag.icon}.svg`)

  const edgeSource = graphBuilder.createEdgesSource({
    data: graphData.edgeList,
    sourceId: (item) => item.source,
    targetId: (item) => item.target
  })
  edgeSource.edgeCreator.defaults.style = new PolylineEdgeStyle({ targetArrow: 'none' })

  graphBuilder.buildGraph()

  void graphComponent.fitGraphBounds()
}

/**
 * Creates a viewer input mode for the graphComponent of this demo.
 */
function initializeInputMode(graphComponent) {
  const mode = new GraphViewerInputMode({
    toolTipItems: GraphItemTypes.NODE,
    selectableItems: GraphItemTypes.NONE,
    marqueeSelectableItems: GraphItemTypes.NONE
  })

  // As the selection is deactivated, the focused item is highlighted instead
  graphComponent.focusIndicatorManager.showFocusPolicy = 'when-focused'

  mode.toolTipInputMode.toolTipLocationOffset = new Point(10, 10)
  mode.addEventListener('query-item-tool-tip', (evt) => {
    if (evt.item instanceof INode && !evt.handled) {
      const nodeName = evt.item.tag.name
      if (nodeName) {
        evt.toolTip = nodeName
        evt.handled = true
      }
    }
  })

  graphComponent.inputMode = mode
}

run().then(finishLoading)
