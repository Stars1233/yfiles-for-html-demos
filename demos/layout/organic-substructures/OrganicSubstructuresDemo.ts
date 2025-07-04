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
  Graph,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphMLIOHandler,
  IGraph,
  IGroupPaddingProvider,
  INode,
  Insets,
  LayoutExecutor,
  License,
  OrganicLayout,
  OrganicLayoutChainSubstructureStyle,
  OrganicLayoutCycleSubstructureStyle,
  OrganicLayoutData,
  OrganicLayoutGroupSubstructureScope,
  OrganicLayoutParallelSubstructureStyle,
  OrganicLayoutStarSubstructureStyle,
  OrganicLayoutTreeSubstructureStyle,
  ShapeNodeStyle,
  Size
} from '@yfiles/yfiles'
import { NodeTypePanel } from '@yfiles/demo-utils/NodeTypePanel'
import type { ColorSetName } from '@yfiles/demo-resources/demo-styles'
import {
  colorSets,
  createDemoEdgeStyle,
  createDemoNodeStyle,
  createDemoShapeNodeStyle,
  initDemoStyles
} from '@yfiles/demo-resources/demo-styles'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { addNavigationButtons, addOptions, finishLoading } from '@yfiles/demo-resources/demo-page'

/**
 * The color sets for the eight different node types.
 */
const nodeTypeColors: ColorSetName[] = [
  'demo-palette-21',
  'demo-palette-22',
  'demo-palette-23',
  'demo-palette-15',
  'demo-palette-25',
  'demo-palette-11',
  'demo-palette-12',
  'demo-palette-14'
]

let graphComponent: GraphComponent

let layoutRunning = false

let allowNodeTypeChange = true

/**
 * Bootstraps the demo.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()
  graphComponent = new GraphComponent('#graphComponent')
  // enable interactive editing
  graphComponent.inputMode = new GraphEditorInputMode({
    selectableItems: GraphItemTypes.NODE | GraphItemTypes.EDGE,
    // disable interactive label creation - labels are simply not in the focus of this demo
    allowAddLabel: false,
    // disable interactive label editing - labels are simply not in the focus of this demo
    allowEditLabel: false
  })

  // enable undo/redo
  graphComponent.graph.undoEngineEnabled = true

  // initializes the context menu for changing a node's type
  initializeTypePanel(graphComponent)

  // bind the buttons to their commands
  initializeUI()
}

/**
 * Calculates a new graph layout and optionally applies the new layout in an animated fashion.
 * This method also takes care of disabling the UI during layout calculations.
 */
async function runLayout(animate: boolean): Promise<void> {
  if (layoutRunning) {
    return
  }

  layoutRunning = true
  disableUI(true)

  try {
    // the actual layout calculation
    await runLayoutCore(animate)
  } finally {
    layoutRunning = false
    disableUI(false)
  }
}

/**
 * Calculates a new graph layout and optionally applies the new layout in an animated fashion.
 * This method creates and configures a new organic layout algorithm for this purpose.
 */
async function runLayoutCore(animate: boolean): Promise<void> {
  // configure the organic layout algorithm
  const layout = new OrganicLayout()

  const currentSample = document.querySelector<HTMLInputElement>(`#sample-combo-box`)!.value

  //configure some basic settings
  layout.deterministic = true
  layout.defaultMinimumNodeDistance = currentSample === 'groups' ? 0 : 70
  layout.defaultPreferredEdgeLength = 60

  // configure substructure styles (cycles, chains, parallel structures, star, tree)
  layout.cycleSubstructureStyle = getCycleStyle()
  layout.chainSubstructureStyle = getChainStyle()
  layout.parallelSubstructureStyle = getParallelStyle()
  layout.starSubstructureStyle = getStarStyle()
  layout.treeSubstructureStyle = getTreeStyle()
  layout.groupSubstructureScope = getGroupSubstructureScope()

  //configure type separation for parallel and star substructures
  const separateParallel = document.querySelector<HTMLInputElement>(`#separate-parallel`)!
  layout.parallelSubstructureTypeSeparation = separateParallel.checked
  const separateStar = document.querySelector<HTMLInputElement>(`#separate-star`)!
  layout.starSubstructureTypeSeparation = separateStar.checked

  // configure data-driven features for the organic layout algorithm by using OrganicLayoutData
  const layoutData = new OrganicLayoutData()

  if (document.querySelector<HTMLInputElement>(`#use-edge-grouping`)!.checked) {
    // if desired, define edge grouping on the organic layout data
    layoutData.substructureSourceGroupIds = 'groupAll'
    layoutData.substructureTargetGroupIds = 'groupAll'
  }

  if (document.querySelector<HTMLInputElement>(`#consider-node-types`)!.checked) {
    // if types should be considered define a delegate on the respective layout data property
    // that queries the type from the node's tag
    layoutData.nodeTypes = getNodeType
  }

  // Ensure that the LayoutExecutor class is not removed by build optimizers
  // It is needed for the 'applyLayoutAnimated' method in this demo.
  LayoutExecutor.ensure()

  // runs the layout algorithm and applies the result...
  if (animate) {
    //... with a morph animation
    await graphComponent.applyLayoutAnimated({ layout, layoutData })
  } else {
    //... without an animation
    graphComponent.graph.applyLayout(layout, layoutData)
    await graphComponent.fitGraphBounds()
  }
}

/**
 * Gets the type of the given node by querying it from the node's tag.
 */
function getNodeType(node: INode): number {
  return (node.tag && node.tag.type) || 0
}

/**
 * Determines the desired cycle substructure style for layout calculations from the settings UI.
 */
function getCycleStyle(): OrganicLayoutCycleSubstructureStyle {
  switch (getSelectedValue('cycleStyle')) {
    case 'CIRCULAR':
      return OrganicLayoutCycleSubstructureStyle.CIRCULAR
    default:
      return OrganicLayoutCycleSubstructureStyle.NONE
  }
}

/**
 * Determines the desired chain substructure style for layout calculations from the settings UI.
 */
function getChainStyle(): OrganicLayoutChainSubstructureStyle {
  switch (getSelectedValue('chainStyle')) {
    case 'RECTANGULAR':
      return OrganicLayoutChainSubstructureStyle.RECTANGULAR
    case 'STRAIGHT_LINE':
      return OrganicLayoutChainSubstructureStyle.STRAIGHT_LINE
    case 'DISK':
      return OrganicLayoutChainSubstructureStyle.DISK
    default:
      return OrganicLayoutChainSubstructureStyle.NONE
  }
}

/**
 * Determines the desired parallel substructure style for layout calculations from the settings UI.
 */
function getParallelStyle() {
  switch (getSelectedValue('parallelStyle')) {
    case 'RADIAL':
      return OrganicLayoutParallelSubstructureStyle.RADIAL
    case 'RECTANGULAR':
      return OrganicLayoutParallelSubstructureStyle.RECTANGULAR
    case 'STRAIGHT_LINE':
      return OrganicLayoutParallelSubstructureStyle.STRAIGHT_LINE
    default:
      return OrganicLayoutParallelSubstructureStyle.NONE
  }
}

/**
 * Determines the desired star substructure style for layout calculations from the settings UI.
 */
function getStarStyle(): OrganicLayoutStarSubstructureStyle {
  switch (getSelectedValue('starStyle')) {
    case 'CIRCULAR':
      return OrganicLayoutStarSubstructureStyle.CIRCULAR
    case 'RADIAL':
      return OrganicLayoutStarSubstructureStyle.RADIAL
    case 'SEPARATED_RADIAL':
      return OrganicLayoutStarSubstructureStyle.SEPARATED_RADIAL
    default:
      return OrganicLayoutStarSubstructureStyle.NONE
  }
}

/**
 * Determines the desired tree substructure style for layout calculations from the settings UI.
 */
function getTreeStyle(): OrganicLayoutTreeSubstructureStyle {
  switch (getSelectedValue('treeStyle')) {
    case 'RADIAL_TREE':
      return OrganicLayoutTreeSubstructureStyle.RADIAL_TREE
    case 'RADIAL':
      return OrganicLayoutTreeSubstructureStyle.RADIAL
    case 'ORIENTED':
      return OrganicLayoutTreeSubstructureStyle.ORIENTED
    default:
      return OrganicLayoutTreeSubstructureStyle.NONE
  }
}

/**
 * Determines the desired group substructure scope for layout calculations from the settings UI.
 */
function getGroupSubstructureScope(): OrganicLayoutGroupSubstructureScope {
  switch (getSelectedValue('groupScope')) {
    case 'ALL':
      return OrganicLayoutGroupSubstructureScope.ALL_GROUPS
    case 'WITHOUT_EDGES':
      return OrganicLayoutGroupSubstructureScope.GROUPS_WITHOUT_EDGES
    case 'WITHOUT_INTER_EDGES':
      return OrganicLayoutGroupSubstructureScope.GROUPS_WITHOUT_INTER_EDGES
    default:
      return OrganicLayoutGroupSubstructureScope.NO_GROUPS
  }
}

/**
 * Configures default visualizations for the given graph.
 * @param graph The demo's graph.
 */
function configureGraph(graph: IGraph): void {
  initDemoStyles(graph)

  // use first type color for all interactively created nodes
  graph.nodeDefaults.style = createDemoNodeStyle(nodeTypeColors[0])
  graph.nodeDefaults.shareStyleInstance = false
  graph.nodeDefaults.size = new Size(40, 40)
  graph.decorator.nodes.groupPaddingProvider.addConstant(
    (node) => graph.isGroupNode(node),
    IGroupPaddingProvider.create(() => new Insets(40))
  )

  graph.edgeDefaults.style = createDemoEdgeStyle({ showTargetArrow: false })
}

/**
 * Initializes the context menu for changing a node's type.
 */
function initializeTypePanel(graphComponent: GraphComponent): void {
  const typePanel = new NodeTypePanel(graphComponent, nodeTypeColors, colorSets)
  typePanel.nodeTypeChanged = (item, newType) => setNodeType(item, newType)

  typePanel.typeChanged = () => runLayout(true)

  // update the nodes whose types will be changed on selection change events
  graphComponent.selection.addEventListener(
    'item-added',
    () =>
      (typePanel.currentItems = allowNodeTypeChange
        ? graphComponent.selection.nodes
            .filter((n) => !graphComponent.graph.isGroupNode(n))
            .toArray()
        : null)
  )
}

/**
 * Sets the type for the given node by updating the node's tag and the according style.
 * This function is invoked when the type of node is changed via the type panel.
 */
function setNodeType(node: INode, type: number): void {
  // set a new tag and style so that this change is easily undo-able
  node.tag = { type: type }
  const graph = graphComponent.graph
  if (node.style instanceof ShapeNodeStyle) {
    graph.setStyle(node, createDemoShapeNodeStyle(node.style.shape, nodeTypeColors[type]))
  } else {
    graph.setStyle(node, createDemoNodeStyle(nodeTypeColors[type]))
  }
}

/**
 * Loads a sample graph for testing the substructure and node types support of the organic layout
 * algorithm.
 */
async function loadSample(sample: string): Promise<void> {
  disableUI(true)
  try {
    const newGraph = new Graph()
    // configures default styles for newly created graph elements
    configureGraph(newGraph)

    // load sample data
    await new GraphMLIOHandler().readFromURL(newGraph, `resources/${sample}.graphml`)

    // update the settings UI to match the sample's default layout settings
    const data = await loadSampleData(`resources/${sample}.json`)
    updateLayoutSettings(data)

    const { overrideStyles, allowItemCreation, allowItemModification, allowTypeChanges } =
      data.settings

    // enable/disable node type changes depending on the sample
    allowNodeTypeChange = allowTypeChanges

    // if required for the sample, override and set the node styles
    if (overrideStyles) {
      updateNodeStyles(newGraph)
    }

    // update input mode setting depending on whether we are allowed to change the graph structure
    const inputMode = graphComponent.inputMode as GraphEditorInputMode
    inputMode.allowCreateNode = allowItemCreation
    inputMode.allowCreateEdge = allowItemCreation
    inputMode.allowDuplicate = allowItemCreation
    inputMode.allowClipboardOperations = allowItemCreation
    inputMode.moveSelectedItemsInputMode.enabled = allowItemModification
    inputMode.deletableItems = allowItemCreation ? GraphItemTypes.ALL : GraphItemTypes.NONE
    inputMode.showHandleItems = allowItemModification ? GraphItemTypes.ALL : GraphItemTypes.NONE

    if (allowItemCreation) {
      // update the default node style depending on the style of the first node
      const refStyle = newGraph.nodes.first()?.style
      if (refStyle instanceof ShapeNodeStyle) {
        newGraph.nodeDefaults.style = createDemoShapeNodeStyle(refStyle.shape, nodeTypeColors[0])
      }
    }

    // replace the old graph with the new sample
    graphComponent.graph = newGraph

    // calculate an initial arrangement for the new sample
    await runLayout(false)

    // enable undo/redo
    newGraph.undoEngineEnabled = true
  } finally {
    disableUI(false)
  }
}

/**
 * Updates the node styles in the given graph depending on the type of each node.
 * @param graph the graph to update.
 */
function updateNodeStyles(graph: IGraph): void {
  for (const node of graph.nodes) {
    if (node.tag && node.tag.type > -1) {
      graph.setStyle(node, createDemoNodeStyle(nodeTypeColors[node.tag.type]))
    }
  }
}

/**
 * Loads sample data from the file identified by the given sample path.
 * @param samplePath the path to the sample data file.
 */
async function loadSampleData(samplePath: string): Promise<any> {
  const response = await fetch(samplePath)
  return await response.json()
}

/**
 * Updates the settings UI to match the given sample's default layout settings
 * @yjs:keep = cycleSubstructureStyle,chainSubstructureStyle,starSubstructureStyle,parallelSubstructureStyle,parallelSubstructureTypeSeparation,starSubstructureTypeSeparation
 * @param data the sample data representing the desired graph structure.
 */
function updateLayoutSettings(data: any): void {
  const settings = data.settings
  if (settings) {
    updateSelectedIndex('cycleStyle', settings.cycleSubstructureStyle)
    updateSelectedIndex('chainStyle', settings.chainSubstructureStyle)
    updateSelectedIndex('starStyle', settings.starSubstructureStyle)
    updateSelectedIndex('parallelStyle', settings.parallelSubstructureStyle)
    updateSelectedIndex('treeStyle', settings.treeSubstructureStyle)
    updateSelectedIndex('groupScope', settings.groupSubstructures)
    updateState('use-edge-grouping', settings.useEdgeGrouping, false)
    updateState('consider-node-types', settings.considerNodeTypes, true)
    updateState('separate-parallel', settings.parallelSubstructureTypeSeparation, false)
    updateState('separate-star', settings.starSubstructureTypeSeparation, false)
  } else {
    document.querySelector<HTMLSelectElement>(`#cycleStyle`)!.selectedIndex = 0
    document.querySelector<HTMLSelectElement>(`#chainStyle`)!.selectedIndex = 0
    document.querySelector<HTMLSelectElement>(`#starStyle`)!.selectedIndex = 0
    document.querySelector<HTMLSelectElement>(`#parallelStyle`)!.selectedIndex = 0
    document.querySelector<HTMLSelectElement>(`#treeStyle`)!.selectedIndex = 0
    document.querySelector<HTMLSelectElement>(`#groupScope`)!.selectedIndex = 0
    document.querySelector<HTMLInputElement>(`#use-edge-grouping`)!.checked = false
    document.querySelector<HTMLInputElement>(`#consider-node-types`)!.checked = true
    document.querySelector<HTMLInputElement>(`#separate-parallel`)!.checked = false
    document.querySelector<HTMLInputElement>(`#separate-star`)!.checked = false
  }
}

/**
 * Sets the checked state for the HTMLInputElement identified by the given ID.
 * @param id the ID for the HTMLInputElement whose checked state will be set.
 * @param value the new checked state.
 * @param defaultValue the fallback checked state to be used if the given value is undefined.
 */
function updateState(id: string, value: boolean | undefined, defaultValue: boolean): void {
  document.querySelector<HTMLInputElement>(`#${id}`)!.checked =
    'undefined' === typeof value ? defaultValue : value
}

/**
 * Sets the selected index for HTMLSelectElement identified by the given ID to the index of the
 * given value. If the given value is undefined or not a value of the HTMLSelectElement's options,
 * selectedIndex will be set to 0.
 * @param id the ID for the HTMLSelectElement whose selectedIndex will be set.
 * @param value the value whose index will be the new selectedIndex.
 */
function updateSelectedIndex(id: string, value: string | undefined): void {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`)!
  const idx = indexOf(select, value)
  select.selectedIndex = idx > -1 ? idx : 0
}

/**
 * Determines the index of the given value in the given HTMLSelectElement's options.
 * @param select the HTMLSelectElement whose options are searched for the given value.
 * @param value the value to search for.
 * @returns the index of the given value or -1 if the given value is undefined or not a value
 * of the given HTMLSelectElement's options.
 */
function indexOf(select: HTMLSelectElement, value: string | undefined): number {
  if (value) {
    let idx = 0
    for (const option of select.options) {
      if (option.value === value) {
        return idx
      }
      ++idx
    }
  }
  return -1
}

/**
 * Sets the disabled state for certain UI controls to the given state.
 * @param disabled the disabled state to set.
 */
function disableUI(disabled: boolean): void {
  for (const element of document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
    '.toolbar-component'
  )) {
    element.disabled = disabled
  }

  for (const element of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    '.settings-editor'
  )) {
    element.disabled = disabled
  }
}

/**
 * Binds actions and commands to the demo's UI controls.
 */
function initializeUI(): void {
  const sampleSelect = document.querySelector<HTMLSelectElement>('#sample-combo-box')!
  sampleSelect.addEventListener('change', async () => {
    await loadSample(sampleSelect.options[sampleSelect.selectedIndex].value)
  })
  // as a final step, addOptions will fire a change event
  // due to the change listener registered above, this will load the initial sample graph
  addOptions(
    sampleSelect,
    { text: 'Simple Mixed, Large', value: 'mixed_large' },
    { text: 'Simple Mixed, Small', value: 'mixed_small' },
    { text: 'Simple Parallel', value: 'parallel' },
    { text: 'Simple Star', value: 'star' },
    { text: 'Simple Groups', value: 'groups' },
    { text: 'Computer Network', value: 'computer_network' }
  )
  addNavigationButtons(sampleSelect, true, false, 'sidebar-button')

  // changing a value automatically runs a layout
  for (const editor of document.querySelectorAll('.settings-editor')) {
    editor.addEventListener('change', async () => await runLayout(true))
  }

  document
    .querySelector<HTMLButtonElement>('#apply-layout-button')!
    .addEventListener('click', async () => await runLayout(true))
}

/**
 * Determines the currently selected value of the HTMLSelectElement identified by the given ID.
 * @param id the ID for the HTMLSelectElement whose selected value is returned.
 * @returns the selected value of the HTMLSelectElement identified by the given ID.
 */
function getSelectedValue(id: string): string {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`)!
  return select.options[select.selectedIndex].value
}

run().then(finishLoading)
