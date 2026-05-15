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
import { GraphBuilder, GraphComponent, License, ViewportLimitingPolicy } from '@yfiles/yfiles'
import licenseData from '../../../lib/license.json'
import dataDescriptions from './resources/data-descriptions.json'
import companyNetworkData from './resources/company-network.json'
import logisticsNetworkData from './resources/logistics-network.json'
import tradingNetworkData from './resources/trading-network.json'
import exampleNetworkData from './resources/example-biofabric.json'
import { Biofabric } from './Biofabric/Biofabric'
import { CircularNodeLink } from './CircularNodeLink/CircularNodeLink'
import { configureBidirectionalInteraction } from './configureBidirectionalInteraction'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'

/**
 * All datasets in this demo
 */
const dataSets = {
  CompanyNetwork: companyNetworkData,
  LogisticsNetwork: logisticsNetworkData,
  TradingGraph: tradingNetworkData
}

/**
 * Wrapper function to load the data, initialize the UI, set up the biofabric and node-link diagrams,
 * and configure the bidirectional interaction between the two graphs.
 */
async function run() {
  // Register the license
  License.value = licenseData

  // Render the small example biofabric visualization in the sidebar
  void renderExampleBiofabric()

  // Get the selected dataset and load the data
  const datasetName = document.querySelector('#datasetPicker').value
  const dataset = dataSets[datasetName]

  // Apply all defaults stored in the dataDescription object
  applyDefaults(datasetName)

  // Update the description of the loaded dataset in the sidebar
  updateDescriptionText(datasetName)

  // Setup biofabric and nodelink
  const biofabric = setupBiofabric(dataset, dataDescriptions[datasetName].biofabric_parameters)
  const nodeLink = setupNodeLink(dataset, dataDescriptions[datasetName].circular_parameters)

  // limit Viewport to reasonable margins
  configureViewport(biofabric.graphComponent, nodeLink.graphComponent)

  // Configure the bidirectional interactivity between biofabric and node-link diagram
  configureBidirectionalInteraction(biofabric, nodeLink)

  // Layout Biofabric
  biofabric.updateLayoutProperties(true)

  setUIDisabled(true)
  await biofabric.runLayout()
  await nodeLink.applyLayout()

  // Fit Graph Bounds of Layouts
  await biofabric.graphComponent.fitGraphBounds()
  await nodeLink.graphComponent.fitGraphBounds()
  setUIDisabled(false)

  // Initialize the UI
  await initializeUI(biofabric, nodeLink)
}

/**
 * Set up the biofabric visualization given some input data and configuration. More specifically,
 * the function i) collects all UI values, ii) creates a new graph component, iii) builds a new
 * graph, and, finally, iv) returns a new Biofabric object.
 * @param dataset the dataset to be used for the biofabric
 * @param dataset.nodes the nodes of the dataset
 * @param dataset.links the edges of the dataset
 * @param biofabricOptions the options for configuring the biofabric visualization
 * @returns a new Biofabric object
 */
function setupBiofabric(dataset, biofabricOptions) {
  // Collect all current UI control values
  const {
    edgeColorMode,
    nodeWidthMode,
    edgeSorting,
    nodeSorting,
    nodeGrouping,
    nodeGroupSorting,
    edgeGrouping,
    edgeGroupSorting
  } = getUIValues()

  // Create a new graph component for the biofabric
  const biofabricGraphComponent = new GraphComponent('#graphComponent-biofabric')

  // Build and attach a new graph to the biofabric's graph component
  buildGraph(biofabricGraphComponent.graph, dataset, true, true)

  // Create New Biofabric Object for the selected dataset
  return new Biofabric(biofabricGraphComponent, 'label', 'label', {
    edgeGroupDataKey: edgeGrouping ? 'group' : undefined,
    nodeGroupDataKey: nodeGrouping ? 'group' : undefined,
    edgeGroupOrderingKey: edgeGroupSorting,
    nodeGroupOrderingKey: nodeGroupSorting,
    edgeColorMode: edgeColorMode,
    nodeWidthMode: nodeWidthMode,
    edgeOrderingKey: edgeSorting,
    nodeOrderingKey: nodeSorting,
    biofabricWidth: 3000,
    biofabricHeight: 1200,
    horizontalPadding: 50,
    edgeSpacing: biofabricOptions.edgeSpacing,
    cssVarPrefix: 'yfiles-biofabric-demo'
  })
}

/**
 * Set up the circular node-link visualization given some input data and configuration. More specifically,
 * the function i) collects all UI values, ii) creates a new graph component, iii) builds a new
 * graph, and, finally, iv) returns a new Circular Node-Link object.
 * @param dataset the dataset to be used for the circular node-link diagram
 * @param dataset.nodes the nodes of the dataset
 * @param dataset.links the edges of the dataset
 * @param nodelinkOptions the options for configuring the circular node-link visualization
 * @returns a new Circular node-link object
 */
function setupNodeLink(dataset, nodelinkOptions) {
  // Collect all current UI control values
  const { edgeColorMode, nodeGrouping, nodeGroupSorting, edgeGrouping, edgeGroupSorting } =
    getUIValues()

  // Initialize a graph component for the reference circular node-Link diagram
  const nodeLinkGraphComponent = new GraphComponent('#graphComponent-circular')

  // Build and attach a new graph to the biofabric's graph component
  buildGraph(nodeLinkGraphComponent.graph, dataset, true, false)

  // Load the default parameters for the circular node-diagram and dataset combination

  // Create a new circular node-link diagram for the selected dataset
  return new CircularNodeLink(nodeLinkGraphComponent, 'label', 'label', {
    edgeGroupDataKey: edgeGrouping ? 'group' : undefined,
    nodeGroupDataKey: nodeGrouping ? 'group' : undefined,
    edgeGroupOrderingKey: edgeGroupSorting,
    nodeGroupOrderingKey: nodeGroupSorting,
    edgeColorMode: edgeColorMode,
    edgeThickness: nodelinkOptions.edgeThickness,
    cssVarPrefix: 'yfiles-biofabric-demo'
  })
}

/**
 * Configures the viewport of the specified graph components to have reasonable margins.
 * @param biofabricGraphComponent - The graph component to configure the viewport for.
 * @param nodeLinkGraphComponent - The graph component to configure the viewport for.
 */
function configureViewport(biofabricGraphComponent, nodeLinkGraphComponent) {
  biofabricGraphComponent.viewportLimiter.viewportContentMargins = [450, 150, 450, 150]
  biofabricGraphComponent.viewportLimiter.policy = ViewportLimitingPolicy.TOWARDS_LIMIT
  biofabricGraphComponent.viewportLimiter.minimumViewportContentRatio = [0.5, 0.5]
  biofabricGraphComponent.maximumZoom = 1.5
  nodeLinkGraphComponent.viewportLimiter.viewportContentMargins = 150
  nodeLinkGraphComponent.maximumZoom = 1.5
  nodeLinkGraphComponent.viewportLimiter.minimumViewportContentRatio = [0.5, 0.5]
  nodeLinkGraphComponent.viewportLimiter.policy = ViewportLimitingPolicy.TOWARDS_LIMIT
}

/**
 * Initializes the user interface components and event listeners for the Biofabric and the accompanying circular layout.
 * @param biofabric - The Biofabric layout instance.
 * @param nodeLink - The CircularNodeLink diagram instance.
 */
async function initializeUI(biofabric, nodeLink) {
  /**
   * A function which runs a callback function and updates the biofabric's and node-link diagram's contents
   * and (re-)runs their layout algorithms.
   * @param action a callback function to be executed
   * @param animationDuration the optional animation duration; if none is given, the layout is not animated
   * @param fitGraphBounds whether to run fitGraphBounds on the biofabric and node-link diagram
   * @param resort whether to resort the edges
   */
  const runAndUpdateGraphComponents = async (
    action,
    animationDuration,
    fitGraphBounds = true,
    resort = false
  ) => {
    await action()
    setUIDisabled(true)

    biofabric.updateBiofabric()
    biofabric.determineUnitHeightAndWidth(biofabric.fromTargetDimensions)

    biofabric.updateLayoutProperties(resort)
    await Promise.all([
      biofabric.runLayout(animationDuration),
      nodeLink.applyLayout(animationDuration)
    ])
    biofabric.updateVisualization()
    nodeLink.updateVisualization()
    if (fitGraphBounds) {
      void biofabric.graphComponent.fitGraphBounds()
      void nodeLink.graphComponent.fitGraphBounds()
    }
    setUIDisabled(false)
  }

  /**
   * A function which, given an HTML Element's ID string and an event to listen, executes a given
   * callback function and runAndUpdateGraphComponents().
   * @param id the HTMLElement's ID
   * @param event the event type to listen for
   * @param callback the callback function to be executed
   * @param animationDuration the optional animation duration; if none is given, the layout is not animated
   * @param fitGraphBounds a boolean flag indicating whether to fit the graph bounds
   * @param resort a boolean flag indicating whether to resort the graph
   */
  const setupListener = (
    id,
    event,
    callback,
    animationDuration,
    fitGraphBounds = true,
    resort = false
  ) => {
    document
      .querySelector(id)
      .addEventListener(event, (ev) =>
        runAndUpdateGraphComponents(
          async () => callback(document.querySelector(id), ev),
          animationDuration,
          fitGraphBounds,
          resort
        )
      )
  }

  // Dataset selection
  setupListener('#datasetPicker', 'change', (el) => {
    // Get the current dataset name and its parameters
    const dataSetName = el.value
    const dataSet = dataDescriptions[dataSetName]
    const biofabricParameters = dataSet.biofabric_parameters
    const circularParameters = dataSet.circular_parameters

    // Clear any previous highlights
    biofabric.clearHighlights()
    nodeLink.clearHighlights()

    // Load the new data
    buildGraph(biofabric.graphComponent.graph, dataSets[dataSetName], true, true)
    buildGraph(nodeLink.graphComponent.graph, dataSets[dataSetName], true, false)
    biofabric.setPortLocationModel()
    // Update the data description
    updateDescriptionText(el.value)

    // Update the layout's data-specific default parameters
    biofabric.edgeSpacing = biofabricParameters.edgeSpacing
    nodeLink.edgeThickness = circularParameters.edgeThickness

    // Apply the defaults specific to the current dataset
    applyDefaults(el.value)

    // Get Settings
    const {
      edgeColorMode,
      nodeWidthMode,
      edgeSorting,
      nodeSorting,
      nodeGrouping,
      nodeGroupSorting,
      edgeGrouping,
      edgeGroupSorting
    } = getUIValues()

    // Feed the biofabric the new parameter values from the UI
    biofabric.edgeColorMode = nodeLink.edgeColorMode = edgeColorMode
    biofabric.nodeWidthMode = nodeWidthMode
    biofabric.edgeOrderingKey = edgeSorting
    biofabric.nodeOrderingKey = nodeLink.nodeOrderingKey = nodeSorting
    biofabric.nodeGroupDataKey = nodeLink.nodeGroupDataKey = nodeGrouping ? 'group' : undefined
    biofabric.edgeGroupDataKey = nodeLink.edgeGroupDataKey = edgeGrouping ? 'group' : undefined
    biofabric.nodeGroupOrderingKey = nodeLink.nodeGroupOrderingKey = nodeGroupSorting
    biofabric.edgeGroupOrderingKey = nodeLink.edgeGroupOrderingKey = edgeGroupSorting

    // Update
    biofabric.updateVisualization()
    nodeLink.updateVisualization()
  })

  // Select the Edge Color Mode
  setupListener('#edgeColorModePicker', 'change', (el) => {
    biofabric.edgeColorMode = nodeLink.edgeColorMode = el.value
  })

  // Select the Node Width Mode
  setupListener(
    '#nodeWidthPicker',
    'change',
    (el) => {
      biofabric.nodeWidthMode = el.value
    },
    '1s',
    false
  )

  // Select the Node Sorting Mode
  setupListener(
    '#nodeSortingPicker',
    'change',
    (el) => {
      biofabric.nodeOrderingKey = nodeLink.nodeOrderingKey = el.value
    },
    '1s',
    false,
    true
  )

  // Select the Edge Sorting Mode
  setupListener(
    '#edgeSortingPicker',
    'change',
    (el) => {
      biofabric.edgeOrderingKey = el.value
    },
    '1s',
    false,
    true
  )

  // Check / Turn-on/off edge grouping
  setupListener(
    '#edgeGroupingPicker',
    'change',
    (el) => {
      document.getElementById('edgeGroupSortingPicker').disabled = !el.checked
      const key = el.checked ? 'group' : undefined
      biofabric.edgeGroupDataKey = nodeLink.edgeGroupDataKey = key
    },
    '1s',
    false,
    true
  )

  // Check / Turn-on/off node grouping
  setupListener(
    '#nodeGroupingPicker',
    'change',
    (el) => {
      document.getElementById('nodeGroupSortingPicker').disabled = !el.checked
      const key = el.checked ? 'group' : undefined
      biofabric.nodeGroupDataKey = nodeLink.nodeGroupDataKey = key
    },
    '1s',
    false,
    true
  )

  // Select the Edge Group Sorting Mode
  setupListener(
    '#edgeGroupSortingPicker',
    'change',
    (el) => {
      biofabric.edgeGroupOrderingKey = el.value
    },
    '1s',
    false,
    true
  )

  // Select the Node Group Sorting Mode
  setupListener(
    '#nodeGroupSortingPicker',
    'change',
    (el) => {
      biofabric.nodeGroupOrderingKey = nodeLink.nodeGroupOrderingKey = el.value
    },
    '1s',
    false,
    true
  )
}

/**
 * Retrieves the current UI values for various layout and visualization settings.
 * @returns An object containing the current UI values
 */
function getUIValues() {
  // Edge Color Mode Picker
  const edgeColorModerPickerValue = document.querySelector('#edgeColorModePicker').value

  // Node Width Mode Picker
  const nodeWidthPickerValue = document.querySelector('#nodeWidthPicker').value

  // Edge Sorting Mode Picker
  const edgeSortingPickerValue = document.querySelector('#edgeSortingPicker').value

  // Node Sorting Mode Picker
  const nodeSortingPickerValue = document.querySelector('#nodeSortingPicker').value

  // Node Grouping Checkbox
  const nodeGroupingPickerValue = document.querySelector('#nodeGroupingPicker').checked

  // Node Group Sorting Picker
  const nodeGroupSortingPickerValue = document.querySelector('#nodeGroupSortingPicker').value

  // Edge Grouping Checkbox
  const edgeGroupingPickerValue = document.querySelector('#edgeGroupingPicker').checked

  // Edge Group Sorting Picker
  const edgeGroupSortingPickerValue = document.querySelector('#edgeGroupSortingPicker').value

  // Return all collected UI values
  return {
    edgeColorMode: edgeColorModerPickerValue,
    nodeWidthMode: nodeWidthPickerValue,
    edgeSorting: edgeSortingPickerValue,
    nodeSorting: nodeSortingPickerValue,
    nodeGrouping: nodeGroupingPickerValue,
    nodeGroupSorting: nodeGroupSortingPickerValue,
    edgeGrouping: edgeGroupingPickerValue,
    edgeGroupSorting: edgeGroupSortingPickerValue
  }
}

/**
 * Applies default settings for the Biofabric layout based on the selected dataset.
 * @param dataSetName - The name of the dataset to apply defaults for.
 */
function applyDefaults(dataSetName) {
  // Get the Defaults of the particular dataset
  const data = dataDescriptions[dataSetName]
  const defaults = data.defaults

  // Collect and set the edge color mode
  const edgeColorMode = document.getElementById('edgeColorModePicker')
  edgeColorMode.value = defaults.edgeColorModePicker

  // Collect and set the node width mode
  const nodeWidthMode = document.getElementById('nodeWidthPicker')
  nodeWidthMode.value = defaults.nodeWidthPicker

  // Collect and set the node sorting option
  const nodeSortingMode = document.getElementById('nodeSortingPicker')
  nodeSortingMode.value = defaults.nodeSortingPicker

  // Collect and set the edge sorting option
  const edgeSortingMode = document.getElementById('edgeSortingPicker')
  edgeSortingMode.value = defaults.edgeSortingPicker

  // Collect and set the binary edge grouping option
  const groupEdges = document.getElementById('edgeGroupingPicker')
  groupEdges.checked = defaults.edgeGroupingPicker

  // Collect and set the edge group sorting option
  const edgeGrouping = document.getElementById('edgeGroupSortingPicker')
  edgeGrouping.disabled = !groupEdges.checked
  edgeGrouping.value = defaults.edgeGroupSortingPicker

  // Collect ann set the binary node grouping option
  const groupNodes = document.getElementById('nodeGroupingPicker')
  groupNodes.checked = defaults.nodeGroupingPicker

  // Collect and set the node group sorting option
  const nodeGrouping = document.getElementById('nodeGroupSortingPicker')
  nodeGrouping.disabled = !groupNodes.checked
  nodeGrouping.value = defaults.nodeGroupSortingPicker
}

/**
 * Updates the description text of the selected dataset.
 * @param chosenDataset - The name of the dataset to update the description for.
 */
function updateDescriptionText(chosenDataset) {
  const dataDescriptionContainer = document.querySelector(`#graph-description-container`)

  // Load the data description and title from the data-descriptions object
  const layoutDescription = document.querySelector(`#data-description`)
  const layoutTitle = document.querySelector(`#data-title`)

  dataDescriptionContainer.classList.remove('highlight-description')
  while (layoutDescription.lastChild) {
    layoutDescription.removeChild(layoutDescription.lastChild)
  }
  layoutTitle.innerHTML = ''

  if (chosenDataset in dataDescriptions) {
    const dataset = dataDescriptions[chosenDataset]

    layoutDescription.innerHTML = dataset.content
    layoutTitle.innerHTML = dataset.title

    // highlight the description once
    setTimeout(() => {
      dataDescriptionContainer.classList.add('highlight-description')
    }, 0)
  }
}

/**
 * Builds a graph using the provided graph data and adds it to the specified graph instance.
 * @param graph - The graph instance to which the graph will be added.
 * @param graphData - The graph data to use for building the graph.
 * @param graphData.links The edges of the graph to be loaded
 * @param graphData.nodes the nodes of the graph to be loaded
 * @param addNodeLabel a boolean flag indicating whether to load node labels from the data
 * @param addEdgeLabel a boolean flag indicating whether to load edge labels from the data
 */
function buildGraph(graph, graphData, addNodeLabel = false, addEdgeLabel = false) {
  // Initialize the graph and create a new graph builder
  graph.clear()
  const graphBuilder = new GraphBuilder(graph)

  // Add nodes
  const nodeSource = graphBuilder.createNodesSource({
    data: graphData.nodes,
    id: (node) => node.id,
    tag: ({ label, group }) => ({ label, group })
  })

  // Add Node Labels
  if (addNodeLabel) {
    nodeSource.nodeCreator.createLabelBinding((graphItem) => String(graphItem.label))
  }

  // Add Edges
  const edgeSource = graphBuilder.createEdgesSource({
    data: graphData.links,
    sourceId: (dataItem) => dataItem.source,
    targetId: (dataItem) => dataItem.target,
    tag: ({ label, group, source, target }) => ({ label, group, source, target })
  })

  // Add Edge Labels
  if (addEdgeLabel) {
    edgeSource.edgeCreator.createLabelBinding((graphItem) =>
      graphItem.label ? String(graphItem.label) : undefined
    )
  }

  // Build the graph from the specific data source
  graphBuilder.buildGraph()
}

/**
 * Render the small example biofabric in the left sidebar.
 * This provides a visual reference for what a biofabric diagram looks like.
 */
async function renderExampleBiofabric() {
  const exampleBiofabricGraphComponent = new GraphComponent('#example-biofabric-visualization')
  buildGraph(exampleBiofabricGraphComponent.graph, exampleNetworkData, true, true)
  const gvim = exampleBiofabricGraphComponent.inputMode
  gvim.moveViewportInputMode.enabled = false
  exampleBiofabricGraphComponent.mouseWheelBehavior = 'none'
  // Create a small example biofabric with simple lexicographical ordering
  const biofabric = new Biofabric(exampleBiofabricGraphComponent, 'label', 'label', {
    edgeOrderingKey: 'LexicographicalAscending',
    nodeOrderingKey: 'LexicographicalAscending',
    biofabricWidth: 275,
    biofabricHeight: 250,
    horizontalPadding: 50,
    edgeSpacing: 0.2,
    formStaircases: false,
    cssVarPrefix: 'yfiles-biofabric-demo'
  })

  setUIDisabled(true)
  await biofabric.runLayout()
  await exampleBiofabricGraphComponent.fitGraphBounds()
  setUIDisabled(false)
}

/**
 * Enables/disables the buttons in the toolbar and the input mode. This is used for managing the toolbar during
 * layout calculation.
 */
function setUIDisabled(disabled) {
  document.querySelector(`#edgeColorModePicker`).disabled = disabled
  document.querySelector(`#nodeWidthPicker`).disabled = disabled
  document.querySelector(`#edgeSortingPicker`).disabled = disabled
  document.querySelector(`#nodeSortingPicker`).disabled = disabled
  document.querySelector(`#edgeGroupingPicker`).disabled = disabled
  document.querySelector(`#edgeGroupSortingPicker`).disabled = disabled
  document.querySelector(`#nodeGroupingPicker`).disabled = disabled
  document.querySelector(`#nodeGroupSortingPicker`).disabled = disabled
}

// Run the Application
await run().then(finishLoading)
