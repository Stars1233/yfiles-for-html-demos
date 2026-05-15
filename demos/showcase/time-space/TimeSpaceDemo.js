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
  Command,
  EventRecognizers,
  FilteredGraphWrapper,
  GraphBuilder,
  GraphItemTypes,
  GraphViewerInputMode,
  IEdge,
  INode,
  Insets,
  License,
  MouseWheelBehaviors,
  NodeStyleIndicatorRenderer,
  ScrollBarVisibility,
  ShapeNodeStyle,
  Stroke,
  StyleIndicatorZoomPolicy
} from '@yfiles/yfiles'
import licenseData from '../../../lib/license.json'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import graphData from './resources/graph-data.json'
import { createMap, fitMapBounds, invalidateMapSize } from './map/map-helpers'
import { getNodeData } from './data-types'
import { applyMapStyles, getImageUrl, initializeDefaultStyles } from './graph/styling'
import { addHeatmap } from './heatmap'
import { enableToolTips } from './tooltips'
import { initializeTimeline } from './timeline/initialize-timeline'
import { getGraphMode, setGraphMode } from './graph/graph-mode'
import { updateLayout } from './graph/layout'
import { PropertiesView } from './PropertiesView'
import { startTour } from '@yfiles/demo-app/modern/tour'
import { tour } from './tour/tour'
import { BrowserDetection } from '@yfiles/demo-utils/BrowserDetection'

async function run() {
  License.value = licenseData

  // Create a Leaflet map that contains the graphComponent
  const { graphLayer, map } = createMap('graphComponent')

  // Obtain the graph component contained in the map
  const graphComponent = graphLayer.graphComponent

  // Initialize the default styles for the graph
  initializeDefaultStyles(graphComponent.graph)

  // Build the graph from the data
  buildGraph(graphComponent)

  // Initialize the UI controls
  initializeUI(graphComponent, graphLayer, map)

  // Initialize the timeline component
  const timeline = initializeTimeline(graphComponent, graphLayer, map)

  // Initialize the graph filtering based on the current time frame selected in the timeline
  initializeFiltering(graphComponent, timeline)

  // Initialize graph interaction
  initializeInteraction(graphComponent, graphLayer, map, timeline)

  // Start the demo with a fitted graph
  fitMapBounds(graphComponent, map)

  // Initialize the heatmap
  if (BrowserDetection.webGL2) {
    addHeatmap(graphComponent, getHeat)
  }
}

/**
 * Builds the initial graph from the given data.
 */
function buildGraph(graphComponent) {
  const graph = graphComponent.graph
  const graphBuilder = new GraphBuilder(graph)
  const entityNodesSource = graphBuilder.createNodesSource(graphData.events, 'id')

  entityNodesSource.nodeCreator.tagProvider = (node) => ({ ...node, date: new Date(node.date) })
  graphBuilder.createEdgesSource(graphData.connections, 'source', 'target')
  graphBuilder.buildGraph()
  applyMapStyles(graph)
}

/**
 * Initializes UI controls for the demo and registers event listeners.
 */
function initializeUI(graphComponent, graphLayer, map) {
  const zoomInButton = document.getElementById('zoom-in-button')
  const zoomOutButton = document.getElementById('zoom-out-button')
  const fitGraphButton = document.getElementById('fit-graph-button')
  const guidedTourTriggers = document.querySelectorAll('.guided-tour-trigger')
  const graphModeButtons = document.querySelectorAll('.graph-mode-button')
  const collapseButtons = document.querySelectorAll('.collapse.icon')
  const expandDescriptionButton = document.querySelector('.expand-description-panel.plain')
  const expandInteractionButton = document.querySelector('.expand-interaction-panel.plain')

  zoomInButton.addEventListener('click', () =>
    getGraphMode() === 'geospatial'
      ? map.zoomIn()
      : graphComponent.executeCommand(Command.INCREASE_ZOOM)
  )
  zoomOutButton.addEventListener('click', () =>
    getGraphMode() === 'geospatial'
      ? map.zoomOut()
      : graphComponent.executeCommand(Command.DECREASE_ZOOM)
  )
  fitGraphButton.addEventListener('click', () =>
    getGraphMode() === 'geospatial'
      ? fitMapBounds(graphComponent, map)
      : graphComponent.executeCommand(Command.FIT_GRAPH_BOUNDS)
  )

  // Helper to mark the selected mode button
  const markLastSelectedButton = (selectedButton) => {
    graphModeButtons.forEach((button) => {
      const isSelected = button.title === selectedButton?.title
      if (button instanceof HTMLInputElement) {
        button.checked = isSelected
      } else {
        if (isSelected) {
          button.classList.add('selected')
        } else {
          button.classList.remove('selected')
        }
      }
    })
  }
  // Mark the last selected mode button
  graphModeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      markLastSelectedButton(button)
      graphModeButtons.forEach((button) => (button.disabled = true))
      await setGraphMode(button.title, graphLayer, map)
      graphModeButtons.forEach((button) => (button.disabled = false))
    })
  })

  // Trigger the guided tour when clicked
  for (const guidedTourTrigger of guidedTourTriggers) {
    guidedTourTrigger.classList.remove('hidden')
    guidedTourTrigger.addEventListener('click', async () => {
      startTour(tour)
      await invalidateMapSize(map, graphLayer)
    })
  }

  // Update map size when visibility of side panels changes
  const sidePanelToggleButtons = [
    ...collapseButtons,
    expandDescriptionButton,
    expandInteractionButton
  ]
  sidePanelToggleButtons.forEach((toggle) => {
    toggle?.addEventListener('click', async () => {
      await invalidateMapSize(map, graphLayer)
    })
  })
}

/**
 * Setup graph filtering based on the nodes that are in the region currently selected in the timeline.
 */
function initializeFiltering(graphComponent, timeline) {
  const fullGraph = graphComponent.graph
  graphComponent.graph = new FilteredGraphWrapper(fullGraph, (node) => {
    return timeline.filter(getNodeData(node))
  })
}

/**
 * Initializes graph interaction.
 */
function initializeInteraction(graphComponent, graphLayer, map, timeline) {
  const propertyPanel = document.querySelector('.interaction-panel')
  let propertiesView
  if (propertyPanel) {
    propertiesView = new PropertiesView(propertyPanel, graphComponent.graph)
    propertiesView.updateGraphStatistics()
  }

  graphComponent.zoom = 1
  graphComponent.maximumZoom = 3
  graphComponent.minimumZoom = 0.4
  graphComponent.hitTestRadius = 12
  graphComponent.autoScrollOnBounds = false
  graphComponent.horizontalScrollBarPolicy = ScrollBarVisibility.HIDDEN
  graphComponent.verticalScrollBarPolicy = ScrollBarVisibility.HIDDEN
  graphComponent.mouseWheelBehavior = MouseWheelBehaviors.NONE

  const inputMode = new GraphViewerInputMode()
  graphComponent.inputMode = inputMode
  inputMode.addEventListener('item-clicked', (evt) => {
    if (evt.item instanceof INode && !graphComponent.graph.isGroupNode(evt.item)) {
      propertiesView?.showNodeProperties(evt.item)
    } else {
      propertiesView?.clearNodeProperties()
    }
  })
  inputMode.addEventListener('canvas-clicked', () => {
    propertiesView?.clearNodeProperties()
  })
  inputMode.addEventListener('item-double-clicked', async (args) => {
    if (args.item instanceof INode && getGraphMode() === 'centric') {
      await updateLayout(graphLayer, map, args.item)
    }
  })
  inputMode.moveViewportInputMode.enabled = false
  inputMode.multiSelectionRecognizer = EventRecognizers.NEVER

  enableToolTips(inputMode, getImageUrl)

  // Configure the keyboard navigation for the map integration
  graphLayer.configureKeyboardNavigation(graphComponent, map)

  timeline.setFilterChangedListener(() => {
    graphComponent.graph.nodePredicateChanged()
    propertiesView?.updateGraphStatistics()
  })

  // Highlight nodes on hover
  graphComponent.graph.decorator.nodes.highlightRenderer.addConstant(
    new NodeStyleIndicatorRenderer({
      margins: new Insets(8),
      zoomPolicy: StyleIndicatorZoomPolicy.MIXED,
      nodeStyle: new ShapeNodeStyle({
        shape: 'ellipse',
        fill: null,
        stroke: new Stroke({ dashStyle: 'dash', lineCap: 'round', thickness: 4, fill: '#FFFAFF' })
      })
    })
  )
  const graphItemHoverInputMode = inputMode.itemHoverInputMode
  graphItemHoverInputMode.hoverItems = GraphItemTypes.NODE
  graphItemHoverInputMode.addEventListener('hovered-item-changed', (event) => {
    graphComponent.highlights.clear()
    if (event.item) {
      graphComponent.highlights.add(event.item)
    }
  })

  // Style for selected nodes
  graphComponent.graph.decorator.nodes.selectionRenderer.addConstant(
    new NodeStyleIndicatorRenderer({
      nodeStyle: new ShapeNodeStyle({ fill: null, stroke: '4px #FFFAFF', shape: 'ellipse' }),
      margins: 8
    })
  )
  graphComponent.graph.decorator.nodes.focusRenderer.hide()
}

/**
 * Heatmap function that calculates the heat value for each node based on contamination level.
 */
function getHeat(item) {
  if (item instanceof INode) {
    const factor = item.tag.level
    return 0.8 * factor
  } else if (item instanceof IEdge) {
    return (getHeat(item.sourceNode) + getHeat(item.targetNode)) * 0.5
  } else {
    return 0.5
  }
}

void run().then(finishLoading)
