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
  GraphEditorInputMode,
  GraphItemTypes,
  HierarchicalLayout,
  HierarchicalLayoutData,
  IEdge,
  IncrementalNodeHint,
  INode,
  LayoutExecutor,
  License,
  Point,
  PolylineEdgeStyle,
  Size
} from '@yfiles/yfiles'
import { createDemoNodeStyle } from '@yfiles/demo-app/demo-styles'
import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { graphData } from './resources/GraphData'

let graphComponent

let incrementalNodeStyle
let incrementalEdgeStyle
let fixedNodeStyle
let fixedEdgeStyle

async function run() {
  License.value = licenseData
  // Initialize the GraphComponent
  graphComponent = new GraphComponent('graphComponent')
  // Initialize default styles
  initializeGraph()

  // Initialize interactive behavior
  initializeInputModes()

  // Bind toolbar buttons to actions
  initializeUI()

  // Load the graph
  await loadGraph()

  // Enable the undo engine
  graphComponent.graph.undoEngineEnabled = true
}

/**
 * Runs a hierarchical layout considering the incremental/fixed elements.
 */
async function runLayout() {
  setUIDisabled(true)

  // Configure the layout data to integrate the incremental nodes while the
  // remaining nodes should keep their coordinates as much as possible.
  const hierarchicalLayoutData = new HierarchicalLayoutData({
    incrementalNodeHints: (node) =>
      isFixed(node) ? IncrementalNodeHint.EXACT_COORDINATES : IncrementalNodeHint.INCREMENTAL
  })

  // Create a hierarchical layout with fromSketchMode enabled
  const hierarchicalLayout = new HierarchicalLayout({ fromSketchMode: true })

  // Ensure that the LayoutExecutor class is not removed by build optimizers
  // It is needed for the 'applyLayoutAnimated' method in this demo.
  LayoutExecutor.ensure()

  // Run layout algorithm
  try {
    await graphComponent.applyLayoutAnimated(hierarchicalLayout, '0.5s', hierarchicalLayoutData)
  } finally {
    setUIDisabled(false)
  }
}

/**
 * Sets the default styles for the new graph elements.
 */
function initializeGraph() {
  // Initialize styles
  incrementalNodeStyle = createNodeStyle(true)
  incrementalEdgeStyle = createEdgeStyle(true)
  fixedNodeStyle = createNodeStyle(false)
  fixedEdgeStyle = createEdgeStyle(false)

  const graph = graphComponent.graph
  graph.nodeDefaults.size = new Size(60, 30)
  graph.nodeDefaults.style = incrementalNodeStyle
  graph.edgeDefaults.style = incrementalEdgeStyle
}

/**
 * Creates a new style instance for nodes in this demo.
 * @param incremental Whether the node is incremental or fixed.
 */
function createNodeStyle(incremental) {
  return createDemoNodeStyle(incremental ? 'demo-orange' : 'demo-palette-58')
}

/**
 * Creates a new style instance for edges in this demo.
 * @param incremental Whether the edge is incremental or fixed.
 */
function createEdgeStyle(incremental) {
  const edgeColor = incremental ? '#ff6c00' : '#4d4d4d'
  return new PolylineEdgeStyle({
    stroke: `1.5px ${edgeColor}`,
    targetArrow: `${edgeColor} small triangle`
  })
}

/**
 * Configures input modes to interact with the graph structure.
 */
function initializeInputModes() {
  const inputMode = new GraphEditorInputMode({
    allowEditLabel: false,
    allowGroupingOperations: false,
    showHandleItems: GraphItemTypes.ALL & ~GraphItemTypes.NODE
  })
  inputMode.addEventListener('item-double-clicked', (evt) => {
    // A graph element was double-clicked => toggle its fixed/incremental state
    setFixed(evt.item, !isFixed(evt.item))
  })
  // Mark the node as non-fixed
  inputMode.addEventListener('node-created', (evt) => {
    setFixed(evt.item, false)
  })
  inputMode.createEdgeInputMode.addEventListener('edge-created', (evt) => {
    setFixed(evt.item, false)
  })
  graphComponent.inputMode = inputMode
}

/**
 * Sets the given item as fixed or movable and changes its color to indicate its new state.
 */
function setFixed(item, fixed) {
  item.tag = fixed ? 'fixed' : 'incremental'
  updateStyle(item)
}

/**
 * Returns if a given item is considered fixed or shall be rearranged by the layout algorithm.
 * Note that an edge always gets rerouted if any of its end nodes may be moved.
 */
function isFixed(item) {
  return item.tag === 'fixed'
}

/**
 * Updates the style of the given item when the incremental/fixed state has changed.
 */
function updateStyle(item) {
  const graph = graphComponent.graph
  if (item instanceof INode) {
    graph.setStyle(item, isFixed(item) ? fixedNodeStyle : incrementalNodeStyle)
  } else if (item instanceof IEdge) {
    graph.setStyle(item, isFixed(item) ? fixedEdgeStyle : incrementalEdgeStyle)
  }
}

/**
 * Updates the incremental/fixed state of all graph elements that are currently selected.
 */
function setSelectionFixed(fixed) {
  const selection = graphComponent.selection
  selection.nodes.forEach((node) => {
    setFixed(node, fixed)
  })
  selection.edges.forEach((edge) => {
    setFixed(edge, fixed)
  })
}

/**
 * Binds actions to the buttons in the toolbar.
 */
function initializeUI() {
  document.querySelector('#refresh').addEventListener('click', loadGraph)
  document.querySelector('#lock-selection').addEventListener('click', () => {
    setSelectionFixed(true)
  })
  document.querySelector('#unlock-selection').addEventListener('click', () => {
    setSelectionFixed(false)
  })
  document.querySelector('#layout').addEventListener('click', runLayout)
}

/**
 * Creates the sample graph for this demo.
 */
async function loadGraph() {
  const graph = graphComponent.graph
  graph.clear()
  const builder = new GraphBuilder(graph)
  builder.createNodesSource({
    data: graphData.nodes,
    id: 'id',
    layout: 'layout',
    tag: (dataItem) => dataItem.tag ?? 'fixed',
    style: (dataItem) => createNodeStyle(dataItem.tag === 'incremental')
  })
  builder.createEdgesSource({
    data: graphData.edges,
    sourceId: 'source',
    targetId: 'target',
    style: (dataItem) => createEdgeStyle(dataItem.tag === 'incremental'),
    bends: 'bends'
  })
  builder.buildGraph()

  // Set the edge ports
  graph.edges.forEach((edge) => {
    const tag = edge.tag
    if (tag.sourcePort) {
      graph.setPortLocation(edge.sourcePort, Point.from(tag.sourcePort))
    }
    if (tag.targetPort) {
      graph.setPortLocation(edge.targetPort, Point.from(tag.targetPort))
    }
    // Simplify the edge tags to hold only the incremental/fixed information
    edge.tag = tag.tag ?? 'fixed'
  })

  void graphComponent.fitGraphBounds()
}

/**
 * Enables/disables the buttons in the toolbar and the input mode. This is used for managing the toolbar during
 * layout calculation.
 */
function setUIDisabled(disabled) {
  document.querySelector(`#lock-selection`).disabled = disabled
  document.querySelector(`#unlock-selection`).disabled = disabled
  document.querySelector(`#refresh`).disabled = disabled
  document.querySelector(`#layout`).disabled = disabled
}

void run().then(finishLoading)
