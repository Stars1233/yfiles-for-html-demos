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
  ArrowNodeStyle,
  FreeNodeLabelModel,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  HandlePositions,
  IGraph,
  INode,
  IReshapeHandler,
  License,
  NodeReshapeHandleProvider,
  Point,
  Rect,
  Size
} from '@yfiles/yfiles'
import { colorSets, createDemoNodeLabelStyle } from '@yfiles/demo-resources/demo-styles'
import { ArrowNodeStyleHandleProvider } from './ArrowNodeStyleHandleProvider'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
/**
 * Runs this demo.
 */
async function run() {
  License.value = await fetchLicense()
  const graphComponent = new GraphComponent('#graphComponent')
  initializeGraph(graphComponent.graph)
  initializeInteraction(graphComponent)
  void graphComponent.fitGraphBounds()
  graphComponent.selection.add(graphComponent.graph.nodes.first())
}
/**
 * Initializes defaults for the given graph with the ArrowNodeStyle and creates a node.
 * @param graph The graph to set the defaults and in which to create the sample.
 */
function initializeGraph(graph) {
  // create a ArrowNodeStyle instance with default angle and shaft ratio pointing to the right
  const arrowStyle = new ArrowNodeStyle({
    fill: colorSets['demo-palette-13'].fill,
    stroke: colorSets['demo-palette-13'].stroke
  })
  // initialize the graph defaults
  const defaultLayoutParameter = new FreeNodeLabelModel().createParameter({
    layoutRatio: new Point(0.5, 0),
    layoutOffset: new Point(0, -50),
    labelRatio: new Point(0.5, 1),
    labelOffset: new Point(0, 0)
  })
  const defaultLabelStyle = createDemoNodeLabelStyle('demo-palette-13')
  defaultLabelStyle.textSize = 16
  defaultLabelStyle.padding = [8, 10, 8, 10]
  graph.nodeDefaults.style = arrowStyle
  graph.nodeDefaults.size = new Size(200, 100)
  graph.nodeDefaults.shareStyleInstance = false
  graph.nodeDefaults.labels.layoutParameter = defaultLayoutParameter
  graph.nodeDefaults.labels.style = defaultLabelStyle
  // create a node with the default style
  const node = graph.createNode(new Rect(0, 0, 400, 200))
  // create a label that shows the current angle and shaft ratio
  graph.addLabel(node, styleToText(arrowStyle))
}
/**
 * Sets up an input mode for the GraphComponent, and adds custom handles to change the angle and
 * shaft ratio of the arrow.
 */
function initializeInteraction(graphComponent) {
  const inputMode = new GraphEditorInputMode({ selectableItems: GraphItemTypes.NODE })
  graphComponent.inputMode = inputMode
  // add a label to newly created node that shows the current style settings
  inputMode.addEventListener('node-created', (evt) => {
    const node = evt.item
    graphComponent.graph.addLabel(node, styleToText(node.style))
  })
  const graph = graphComponent.graph
  const nodeDecorator = graph.decorator.nodes
  // add handles that enable the user to change the angle and shaft ratio of an arrow node style
  nodeDecorator.handleProvider.addWrapperFactory(
    (n) => n.style instanceof ArrowNodeStyle,
    (node, delegateProvider) =>
      new ArrowNodeStyleHandleProvider(node, () => updateLabel(graph, node), delegateProvider)
  )
  // only provide reshape handles for the right, bottom and bottom-right sides, so they don't clash with
  // the custom handles
  nodeDecorator.reshapeHandleProvider.addFactory(
    (node) =>
      new NodeReshapeHandleProvider(
        node,
        node.lookup(IReshapeHandler),
        HandlePositions.RIGHT | HandlePositions.BOTTOM | HandlePositions.BOTTOM_RIGHT
      )
  )
  // don't show the selection decoration to make the above handles more visible
  graphComponent.graph.decorator.nodes.selectionRenderer.hide()
}
/**
 * Updates the label's text to show the current style settings.
 * @param graph The graph where the node lives.
 * @param node The node whose style setting should be shown.
 */
function updateLabel(graph, node) {
  const style = node.style
  if (style instanceof ArrowNodeStyle) {
    const label = node.labels.at(0)
    const text = styleToText(style)
    if (label) {
      graph.setLabelText(label, text)
    } else {
      graph.addLabel(node, text)
    }
  }
}
/**
 * Returns a text description of the style configuration.
 */
function styleToText(style) {
  const angle = String(toDegrees(style.angle).toFixed(0))
  const shaftRatio = String(style.shaftRatio.toFixed(2))
  return `Angle of the arrow: ${angle}°\n` + `Ratio of the shaft: ${shaftRatio}`
}
/**
 * Returns the given angle in degrees.
 */
function toDegrees(radians) {
  return (radians * 180) / Math.PI
}
run().then(finishLoading)
