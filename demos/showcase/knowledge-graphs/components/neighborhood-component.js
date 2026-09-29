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
  CloneTypes,
  ExteriorNodeLabelModel,
  FilteredGraphWrapper,
  FreeNodeLabelModel,
  Graph,
  GraphComponent,
  GraphCopier,
  GraphViewerInputMode,
  ILabel,
  INode,
  NodeStyleIndicatorRenderer,
  Stroke,
  WebGLGraphModelManager,
  WebGLShapeNodeStyle
} from '@yfiles/yfiles'
import { getLabelTag, getNodeTag } from '../types'
import { runLayout } from '../layout'
import { getLabelStyle } from '../styles/graph-styles'
import { zoomToItem } from '../analysis/handle-problematic-data'
import '@yfiles/demo-app/util/NavigationComponent'

// Reference to the neighborhood graph component
let neighborhoodComponent = null
export let isNeighborhoodOpen = false

// Maps for tracking the relationship between original and cloned nodes
const original2clone = new Map()
const clone2original = new Map()

// Set of nodes to display in the neighborhood view
const neighborsSet = new Set()

// Navigation menu items tracking the path through explored nodes
const navigationMenuItems = []

// Reference to the navigation component UI element
const navigationComponent = document.querySelector('#navigation')

/**
 * Initializes the neighborhood component and sets up all event listeners.
 * Creates a filtered copy of the original graph for neighborhood visualization.
 *
 * @param originalGraphComponent - The main graph component to derive the neighborhood view from
 * @param supportsWebGL2 - Whether the browser supports WebGL2
 */
export function initializeNeighborhoodComponent(originalGraphComponent, supportsWebGL2) {
  // Create and configure the neighborhood graph component
  neighborhoodComponent = new GraphComponent('#neighborhood-graphComponent')
  if (supportsWebGL2) {
    neighborhoodComponent.graphModelManager = new WebGLGraphModelManager()
  }
  neighborhoodComponent.minimumZoom = 0.01
  neighborhoodComponent.maximumZoom = 4

  // Set up input mode for node selection
  const inputMode = new GraphViewerInputMode({ selectableItems: 'node' })
  inputMode.addEventListener('item-clicked', async (evt) => {
    const item = evt.item
    if (item instanceof INode) {
      updateNavigationMenu(item)
      await updateNeighborhood(item)
      // Zoom to the corresponding original node in the main graph
      await zoomToItem(originalGraphComponent, clone2original.get(item))
    }
  })

  neighborhoodComponent.inputMode = inputMode

  // Handle Escape key to close the panel
  document.addEventListener('keydown', (e) => {
    const component = document.querySelector('#neighborhood-graphComponent')
    if (e.key === 'Escape' && component.classList.contains('open')) {
      toggleComponentPanel(false)
    }
  })

  // Close button handler
  document.querySelector('#neighborhood-close')?.addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  // Close when toolbar is clicked
  document.querySelector('.toolbar').addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  // Close when backdrop is clicked
  document.querySelector('#neighborhood-backdrop').addEventListener('click', () => {
    toggleComponentPanel(false)
  })

  // Initialize the neighborhood graph with a copy of the original
  copyFullGraph(originalGraphComponent)
  createNavigationMenu()
}

/**
 * Creates a filtered copy of the entire original graph for the neighborhood view.
 * Applies appropriate styling and sets up node filtering based on visibility.
 *
 * @param originalGraphComponent - The source graph component to copy from
 */
function copyFullGraph(originalGraphComponent) {
  const srcGraph = originalGraphComponent.graph
  const tgtGraph = new Graph()

  // Copy all elements (nodes, edges, labels) from the original graph
  const graphCopier = new GraphCopier({ cloneTypes: CloneTypes.ALL })
  graphCopier.copy({
    sourceGraph: srcGraph,
    targetGraph: tgtGraph,
    itemCopiedCallback: (original, copy) => {
      // Apply label styles suitable for neighborhood view
      if (copy instanceof ILabel) {
        tgtGraph.setStyle(copy, getLabelStyle(original, true))
      }
      // Track node mappings for navigation between original and cloned graphs
      else if (copy instanceof INode) {
        original2clone.set(original, copy)
        clone2original.set(copy, original)
      }
    }
  })

  // Create a filtered graph that only shows visible nodes and their neighbors
  neighborhoodComponent.graph = new FilteredGraphWrapper(
    tgtGraph,
    (node) => !!getNodeTag(node).visible && (neighborsSet.size === 0 || neighborsSet.has(node)),
    () => true
  )

  // Fit the graph to the visible area
  void neighborhoodComponent.fitGraphBounds()

  // Add selection indicator renderer for selected nodes
  neighborhoodComponent.graph.decorator.nodes.selectionRenderer.addConstant(
    new NodeStyleIndicatorRenderer({
      nodeStyle: new WebGLShapeNodeStyle({
        stroke: new Stroke('#e56399', 4),
        fill: 'transparent',
        shape: 'ellipse',
        effect: 'ambient-stroke-color'
      }),
      zoomPolicy: 'mixed',
      margins: 5
    })
  )
}

/**
 * Displays the neighborhood view for a given node.
 * Opens the neighborhood panel and populates it with the node's neighbors.
 *
 * @param node - The node whose neighborhood should be displayed
 * @returns Promise that resolves when the neighborhood view is fully rendered
 */
export async function showNeighborhood(node) {
  toggleComponentPanel(true)
  document.querySelector('#neighborhood-title-text').innerText = 'Interactive Neighborhood View'

  // Clear previous state
  neighborsSet.clear()
  navigationMenuItems.length = 0

  // Display the cloned version of the node and update the view
  const selectedNode = original2clone.get(node)
  updateNavigationMenu(selectedNode)
  await updateNeighborhood(selectedNode)
}

/**
 * Initializes the navigation component with event listeners.
 * Allows users to navigate through the exploration history via the breadcrumb menu.
 */
function createNavigationMenu() {
  navigationComponent.items = navigationMenuItems
  navigationComponent.selectedItem = ''
  navigationComponent.style.display = 'block'

  // Handle navigation menu selection
  navigationComponent.addEventListener('item-selected', async (evt) => {
    const label = evt.detail
    const node = neighborhoodComponent.graph.wrappedGraph.nodes.find(
      (n) => getNodeTag(n).label === label
    )
    updateNavigationMenu(node)
    await updateNeighborhood(node)
  })
}

/**
 * Updates the neighborhood view to show neighbors of the specified node.
 * Filters the graph to display only the selected node and its direct neighbors.
 *
 * @param node - The node to show neighbors for
 * @returns Promise that resolves when the layout is complete
 */
async function updateNeighborhood(node) {
  if (!node) {
    return
  }

  setTimeout(() => {
    neighborhoodComponent.selection.clear()
  }, 0)
  neighborsSet.clear()
  const filteredGraph = neighborhoodComponent.graph

  // Get all neighbors of the selected node
  const neighbors = filteredGraph.wrappedGraph.neighbors(node)

  // Add the selected node itself to the neighborhood set
  neighborsSet.add(node)

  // Adjust label positions based on node placement
  filteredGraph.labels.forEach((label) => {
    if (getLabelTag(label).type === 'text') {
      filteredGraph.setLabelLayoutParameter(
        label,
        label.owner === node ? ExteriorNodeLabelModel.TOP : FreeNodeLabelModel.CENTER
      )
    }
  })

  // Add all neighbors to the neighborhood set for display
  neighbors.forEach((neighbor) => {
    neighborsSet.add(neighbor)
  })

  // Refresh the filtered graph to show/hide nodes based on updated neighborhood
  filteredGraph.nodePredicateChanged()
  filteredGraph.edgePredicateChanged()

  // Apply layout to the neighborhood view

  await runLayout(neighborhoodComponent, 'neighborhood', [node])
  neighborhoodComponent.selection.add(node)
}

/**
 * Toggles the visibility of the neighborhood panel and applies visual effects.
 * Shows or hides the panel with a backdrop and blur effect on the main graph.
 *
 * @param visible - True to show the neighborhood panel, false to hide it
 */
export function toggleComponentPanel(visible) {
  const componentPanel = document.querySelector('#neighborhood-panel')
  const backdrop = document.querySelector('#neighborhood-backdrop')
  const graphComponent = document.querySelector('.yfiles-rendertreepanel')

  if (visible) {
    // Show the panel with backdrop and blur main graph
    componentPanel.classList.add('open')
    backdrop.style.display = 'block'
    graphComponent.classList.add('blur')
  } else {
    // Hide the panel and restore main graph clarity
    componentPanel.classList.remove('open')
    backdrop.style.display = 'none'
    graphComponent.classList.remove('blur')
  }
  isNeighborhoodOpen = visible
}

/**
 * Updates the navigation menu with the selected node.
 * Adds new nodes to the breadcrumb trail or truncates the trail if navigating back.
 *
 * @param item - The node to add to the navigation menu
 */
function updateNavigationMenu(item) {
  const selectedItem = getNodeTag(item).label
  const index = navigationComponent.items.indexOf(selectedItem)

  // If node not in menu, add it; otherwise truncate trail at this position
  if (index < 0) {
    navigationMenuItems.push(selectedItem)
    navigationComponent.items = navigationMenuItems
  } else {
    navigationMenuItems.splice(index + 1)
  }

  navigationComponent.selectedItem = selectedItem
  navigationComponent.showLabel = false
}
