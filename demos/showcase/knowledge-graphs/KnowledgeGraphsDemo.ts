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
  EdgePathLabelModel,
  EdgeStyleIndicatorRenderer,
  ExteriorNodeLabelModel,
  ExteriorNodeLabelModelPosition,
  FilteredGraphWrapper,
  FreeNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  IEdge,
  INode,
  IPortCandidateProvider,
  LabelStyleIndicatorRenderer,
  License,
  MutablePoint,
  MutableSize,
  NodeStyleIndicatorRenderer,
  OrientedRectangle,
  ShapeNodeShape,
  ShapeNodeStyle,
  StretchNodeLabelModel,
  Stroke,
  WebGLGraphModelManager
} from '@yfiles/yfiles'

import licenseData from '../../../lib/license.json'
import data from './resources/data.json'
import { updateEdgePorts, updateGraphStructure } from './analysis/handle-problematic-data'
import { type EdgeData, getEdgeTag, getNodeTag, type LayoutStyle, type NodeData } from './types'
import {
  errorNodeLabelStyle,
  getEdgeStyle,
  getErrorLabel,
  getIconLabelStyle,
  getNodeIcon,
  getNodeStyle,
  getTextLabelStyle
} from './styles/graph-styles'
import { applyClustering, applyPageRankAlgorithm } from './analysis/clustering'

import { configureHighlighting } from './highlighting'
import { configureContentMenu } from './components/context-menu'
import { initializeDescriptionPanel } from './components/description-panel'
import { updateGraphInformation } from './filtering'
import { GraphSearch } from '@yfiles/demo-utils/GraphSearch'
import {
  initializeNeighborhoodComponent,
  showNeighborhood,
  toggleComponentPanel
} from './components/neighborhood-component'
import { resetBeaconAnimation } from './beacon-animation'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { showLoadingIndicator } from '@yfiles/demo-app/modern/element-utils'
import { runLayout } from './layout'
import {
  initializeOntologyComponent,
  resetOntologyGraphState
} from './components/ontology-component'
import { startTour } from '@yfiles/demo-app/modern/tour'
import { tour } from './tour/tour'
import { BrowserDetection } from '@yfiles/demo-utils/BrowserDetection'

let graphComponent: GraphComponent
let graphSearch: GraphSearch
let layoutRunning = false
const supportsWebGL2 = BrowserDetection.webGL2

const searchBox = document.querySelector<HTMLInputElement>('#searchBox')!
const spotlightErrorsElement = document.querySelector<HTMLInputElement>('#error-beacon-animation')!
const groupBySelect = document.querySelector<HTMLSelectElement>('#group-by')!
const errorDetailsInput = document.querySelector<HTMLInputElement>('#toggle-error-details')!
const errorPanel = document.querySelector<HTMLDivElement>('.error-panel')!
const toggleText = document.querySelector<HTMLSpanElement>('.toggle-text')!

async function run(): Promise<void> {
  License.value = licenseData

  // Initialize graph component and enable webgl mode if supported by the browser
  graphComponent = new GraphComponent('#graphComponent')
  if (supportsWebGL2) {
    graphComponent.graphModelManager = new WebGLGraphModelManager()
  }

  initializeInputMode()
  initializeGraph()
  configureHighlighting(graphComponent)
  configureContentMenu(graphComponent)
  initializeUI(graphComponent)

  setUIDisabled(true)

  setTimeout(async () => {
    await showLoadingIndicator(true)
    requestAnimationFrame(async () => {
      await initializeGraphData(graphComponent)
      initializeOntologyComponent(graphComponent, supportsWebGL2)
      initializeNeighborhoodComponent(graphComponent, supportsWebGL2)
      initializeDescriptionPanel(graphComponent, supportsWebGL2)
      // Calculate and apply automatic layout algorithm
      await applyLayout(graphComponent, 'clusters')
    })
    await showLoadingIndicator(false)
  }, 0)
}

/**
 * Loads, analyzes, and styles graph data.
 *
 * @param graphComponent - The graph component to populate
 */
async function initializeGraphData(graphComponent: GraphComponent): Promise<void> {
  // Build graph from JSON data
  buildGraph()
  // Run the data analysis, detects data issues (dangling edges, isolated nodes, duplicates)
  // and update the graph with virtual elements if needed.
  updateGraphStructure(graphComponent.graph)

  // Wrap graph to support filtering by subject-predicate-object triplets
  graphComponent.graph = new FilteredGraphWrapper(
    graphComponent.graph,
    (node) => getNodeTag(node).visible ?? true,
    (edge) => getEdgeTag(edge).visible ?? true
  )
  // Add some padding to prevent overlaps with the demo toolbar
  graphComponent.contentMargins = [80, 10, 50, 10]

  // Show the number of nodes and edges in the UI
  updateGraphInformation(graphComponent.graph)

  // Calculate node importance using PageRank and scale node sizes accordingly
  applyPageRankAlgorithm(graphComponent)
  // Group nodes into clusters using Louvain modularity algorithm
  applyClustering(graphComponent)
  // Apply visual styling: colors by cluster, error styling for problematic items
  updateGraphStyles()
}

/**
 * Configures the interactions for this graphComponent.
 */
function initializeInputMode(): void {
  const inputMode = new GraphEditorInputMode({
    allowCreateNode: false,
    allowCreateEdge: false,
    allowCreateBend: false,
    allowAddLabel: false,
    allowEditLabel: false,
    allowEditLabelOnDoubleClick: false,
    allowClipboardOperations: false,
    allowGroupingOperations: false,
    allowReverseEdge: false,
    selectableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
    deletableItems: GraphItemTypes.NONE,
    showHandleItems: GraphItemTypes.EDGE,
    clickableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
    contextMenuItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
    movableSelectedItems: GraphItemTypes.NONE,
    movableUnselectedItems: GraphItemTypes.NONE,
    toolTipItems: GraphItemTypes.NODE | GraphItemTypes.EDGE
  })

  // Double-clicking on a node, opens the neighborhood view
  inputMode.addEventListener('item-double-clicked', async (evt) => {
    if (evt.item instanceof INode) {
      graphComponent.selection.clear()
      await resetOntologyGraphState()
      await showNeighborhood(evt.item as INode)
    }
    evt.handled = true
  })

  inputMode.addEventListener('canvas-clicked', async () => {
    await resetOntologyGraphState()
  })

  inputMode.addEventListener('query-item-tool-tip', (evt): void => {
    if (evt.handled) {
      // Tool tip content has already been assigned -> nothing to do.
      return
    }
    // Use a rich HTML element as tool tip content. Alternatively, a plain string would do as well.
    evt.toolTip = createToolTipContent(evt.item as INode | IEdge)
    // Indicate that the tool tip content has been set.
    evt.handled = true
  })

  graphComponent.inputMode = inputMode
}

/**
 * Configures graph decorator styles, selection interaction and event listeners.
 */
function initializeGraph(): void {
  const graph = graphComponent.graph
  // Show port candidates only on actual nodes or nodes without problems
  graph.decorator.nodes.portCandidateProvider.addFactory((node) =>
    getNodeTag(node).virtual || getNodeTag(node).problem
      ? IPortCandidateProvider.NO_CANDIDATES
      : IPortCandidateProvider.fromNodeCenter(node)
  )

  // Configure the selection style for nodes and edges
  graph.decorator.nodes.selectionRenderer.addFactory((node) => {
    const hasProblem = getNodeTag(node).problem
    const stroke = hasProblem ? new Stroke('#ff4400', 4) : new Stroke('#ffffff', 4)
    const margins = hasProblem ? 10 : 0
    return new NodeStyleIndicatorRenderer({
      nodeStyle: new ShapeNodeStyle({ shape: 'ellipse', fill: 'none', stroke }),
      margins
    })
  })

  graph.decorator.edges.selectionRenderer.addFactory((edge) => {
    return new EdgeStyleIndicatorRenderer({ edgeStyle: getEdgeStyle(edge), zoomPolicy: 'mixed' })
  })

  graph.decorator.labels.selectionRenderer.addFactory((label) => {
    return new LabelStyleIndicatorRenderer({
      labelStyle: label.style,
      zoomPolicy: 'world-coordinates'
    })
  })

  // Hide edge reconnection handles for edges without problems
  graph.decorator.edges.portHandleProvider.hide((edge) => !getEdgeTag(edge).problem)

  // Hide focus renderers for nodes and edges
  graph.decorator.nodes.focusRenderer.hide()
  graph.decorator.edges.focusRenderer.hide()

  graphComponent.selection.addEventListener('item-added', (evt) => {
    const item = evt.item
    const graph = graphComponent.graph
    if (item instanceof INode) {
      const tag = getNodeTag(item)
      const problem = tag.problem
      graph.edgesAt(item).forEach((edge) => {
        graphComponent.selection.add(edge)
        edge.labels.forEach((label) => {
          graphComponent.selection.add(label)
        })
      })
      if (problem) {
        const type = problem.type
        if (type === 'duplicate') {
          // Select also all duplicated nodes
          graph.nodes
            .filter((node) => getNodeTag(node).problem?.id === problem.id!)
            .forEach((node) => {
              graphComponent.selection.add(node)
            })
        }
        highlightDataProblem(tag.id)
      }
    } else if (item instanceof IEdge) {
      item.labels.forEach((label) => {
        graphComponent.selection.add(label)
      })

      const tag = getEdgeTag(item)
      const problem = tag.problem
      if (problem) {
        const type = problem.type
        if (type === 'danglingEdge') {
          highlightDataProblem(tag.id)
        }
      }
    }

    function highlightDataProblem(itemId: string): void {
      const selector = `div.data-problem-container#${itemId}`
      const dataProblemContainer = document.querySelector<HTMLDivElement>(selector)
      dataProblemContainer?.classList.add('selected')
      dataProblemContainer?.addEventListener('animationend', () => {
        dataProblemContainer.classList.remove('selected')
      })
      dataProblemContainer?.addEventListener('animationcancel', () => {
        dataProblemContainer.classList.remove('selected')
      })
    }
  })

  graphComponent.selection.addEventListener('item-removed', (evt) => {
    const item = evt.item
    // Remove the selection from adjacent edges and hide their labels if needed
    const graph = graphComponent.graph
    if (graph.contains(item)) {
      if (item instanceof INode) {
        graph.edgesAt(item).forEach((edge) => {
          graphComponent.selection.remove(edge)
          edge.labels.forEach((label) => {
            graphComponent.selection.remove(label)
          })
        })
      } else if (item instanceof IEdge) {
        item.labels.forEach((label) => {
          graphComponent.selection.remove(label)
        })
      }
    }
  })

  // Update edge ports when edges change so that edges with problems get corrected when connected to actual nodes
  graph.addEventListener('edge-ports-changed', (event) => {
    updateEdgePorts(graphComponent, event)
  })

  // Fit the graph if the component has been resized
  graphComponent.addEventListener('size-changed', () => {
    void graphComponent.fitGraphBounds()
  })

  // Set some min/max zoom values for the graphComponent
  graphComponent.minimumZoom = 0.01
  graphComponent.maximumZoom = 4
}

/**
 * Creates the tooltip element for the clicked node or edge.
 * @param item - The item to create the tooltip for
 */
function createToolTipContent(item: INode | IEdge): HTMLDivElement {
  const tooltip = document.createElement('div')
  if (item instanceof INode) {
    tooltip.innerHTML = `<div class="node-tooltip">${getNodeTag(item).label}</div>`
  } else {
    const sourceNode = item.sourceNode
    const targetNode = item.targetNode
    tooltip.innerHTML = `<div class="edge-tooltip">
  <div>${getNodeTag(sourceNode).label}</div>
  <div>↓</div>
  <div>${getEdgeTag(item).type}</div>
  <div>↓</div>
  <div>${getNodeTag(targetNode).label}</div>
</div>`
  }

  return tooltip
}

/**
 * Builds graph structure from JSON data.
 */
function buildGraph(): void {
  const graph = graphComponent.graph
  graph.edgeDefaults.labels.layoutParameter = new EdgePathLabelModel({
    angle: 0,
    autoRotation: true
  }).createRatioParameter()

  const graphBuilder = new GraphBuilder(graph)
  const nodesSource = graphBuilder.createNodesSource<NodeData>({ data: data.nodes, id: 'id' })
  const nodeCreator = nodesSource.nodeCreator
  nodeCreator.tagProvider = (data: NodeData) => ({ ...data, visible: true })

  const edgesSource = graphBuilder.createEdgesSource({
    data: data.edges,
    sourceId: 'from',
    targetId: 'to'
  })
  edgesSource.edgeCreator.tagProvider = (data: EdgeData) => ({ ...data, visible: true })

  graphBuilder.buildGraph()
}

/**
 * Applies styles and labels to all graph items.
 *
 * For nodes: Adds text, icon, and optional error labels.
 * For edges: Adds text labels with adjusted positioning for problem edges.
 */
function updateGraphStyles(): void {
  const graph = graphComponent.graph

  graph.nodes.forEach((node) => {
    const tag = getNodeTag(node)
    graph.setStyle(node, getNodeStyle(node))

    // Skip labels for virtual nodes
    if (tag.virtual) {
      return
    }

    // Add text label
    graph.addLabel({
      owner: node,
      text: getNodeTag(node).label,
      layoutParameter: new ExteriorNodeLabelModel({ margins: 10 }).createParameter(
        ExteriorNodeLabelModelPosition.BOTTOM
      ),
      style: getTextLabelStyle(node),
      tag: { type: 'text', visible: true }
    })

    // Add icon label based on node type
    graph.addLabel({
      owner: node,
      text: getNodeIcon(tag.type),
      layoutParameter: StretchNodeLabelModel.CENTER,
      style: getIconLabelStyle(node),
      tag: { type: 'icon', visible: true }
    })

    // Add error label if the node has problems based on the problem type
    if (tag.problem) {
      const errorIcon = graph.addLabel({
        owner: node,
        text: getErrorLabel(tag.problem),
        style: errorNodeLabelStyle,
        tag: { type: 'error', visible: true }
      })

      const parameter = new FreeNodeLabelModel().findBestParameter(
        errorIcon,
        new OrientedRectangle(
          new MutablePoint(node.layout.x + node.layout.width - 15, node.layout.y + 15),
          new MutableSize(35, 35)
        )
      )
      graph.setLabelLayoutParameter(errorIcon, parameter)
    }
  })

  graph.edges.forEach((edge) => {
    graph.setStyle(edge, getEdgeStyle(edge))
  })
}

/**
 * Applies layout algorithm to the graph.
 *
 * @param graphComponent - The graph component
 * @param style - The desired layout style
 */
async function applyLayout(
  graphComponent: GraphComponent,
  style: LayoutStyle = 'clusters'
): Promise<void> {
  if (layoutRunning) {
    return Promise.resolve()
  }
  layoutRunning = true
  setUIDisabled(true)
  await runLayout(graphComponent, style)
  setUIDisabled(false)
  layoutRunning = false
}

/**
 * Initializes UI controls and event handlers.
 *
 * @param graphComponent - The graph component
 */
function initializeUI(graphComponent: GraphComponent): void {
  groupBySelect.addEventListener('change', async () => {
    resetUI()
    await showLoadingIndicator(true)
    await applyLayout(graphComponent, groupBySelect.value as LayoutStyle)
    await showLoadingIndicator(false)
  })
  graphSearch = new GraphSearch(graphComponent)
  graphSearch.highlightRenderer = new NodeStyleIndicatorRenderer({
    nodeStyle: new ShapeNodeStyle({
      shape: ShapeNodeShape.ELLIPSE,
      stroke: '3px solid #ff3399',
      fill: null
    }),
    margins: 3
  })
  GraphSearch.registerEventListener(searchBox, graphSearch)

  errorDetailsInput.addEventListener('change', () => {
    const checked = errorDetailsInput.checked
    if (!checked) {
      errorPanel.classList.remove('visible')
      toggleText.textContent = 'Click here to see details'
    } else {
      errorPanel.classList.add('visible')
      toggleText.textContent = 'Click here to hide details'
    }
  })

  const guidedTourTriggers = document.querySelectorAll<HTMLElement>('.guided-tour-trigger')
  for (const guidedTourTrigger of guidedTourTriggers) {
    guidedTourTrigger.classList.remove('hidden')
    guidedTourTrigger.addEventListener('click', async () => {
      startTour(tour)
    })
  }

  window.addEventListener('start-layout', async () => {
    await applyLayout(graphComponent, groupBySelect.value as LayoutStyle)
  })
}

/**
 * Enables or disables UI controls.
 *
 * @param disabled - Whether to disable UI controls
 */
function setUIDisabled(disabled: boolean): void {
  spotlightErrorsElement.disabled = !(supportsWebGL2 && !disabled)
  groupBySelect.disabled = disabled
  searchBox.disabled = disabled
  ;(graphComponent.inputMode as GraphEditorInputMode).waitInputMode.enabled = !disabled
}

/**
 * Resets UI elements related to filtering, animations, and search to their default state.
 */
function resetUI(): void {
  toggleComponentPanel(false)
  searchBox.value = ''
  graphSearch.updateSearch('')
  void resetBeaconAnimation()
}

void run().then(finishLoading)
