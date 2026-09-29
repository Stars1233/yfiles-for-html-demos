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
  EdgeLabelPreferredPlacement,
  FolderNodeConverter,
  FoldingEdgeConverter,
  FoldingManager,
  GraphBuilder,
  GraphComponent,
  GraphMLIOHandler,
  HierarchicalLayout,
  HierarchicalLayoutData,
  type ILayoutAlgorithm,
  LabelAngleReferences,
  LabelEdgeSides,
  LabelSideReferences,
  type LayoutData,
  LayoutExecutor,
  License,
  OrthogonalLayout,
  OrthogonalLayoutData,
  PortAdjustmentPolicy,
  Rect,
  SerializationProperties
} from '@yfiles/yfiles'
import IsometricData from './resources/IsometricData'
import licenseData from '../../../lib/license.json'
import { openGraphML } from '@yfiles/demo-utils/graphml-support'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import { IsometricRuntime } from './isometric'
import { Pseudo3DRuntime } from './pseudo3d'
import type { ViewMode, ViewRuntime } from './ViewRuntime'

let graphComponent: GraphComponent = null!
let foldingManager: FoldingManager = null!
let activeRuntime: ViewRuntime = null!
let activeMode: ViewMode = 'pseudo3d'
let switching = false

function createRuntimeTag(dataItem: any): any {
  return { ...dataItem, color: dataItem.color ? { ...dataItem.color } : dataItem.color }
}

type ToolbarCommand = { selector: string; command: Command; parameter: any; tooltip: string }

const toolbarCommands: ToolbarCommand[] = [
  {
    selector: "[data-command='FIT_GRAPH_BOUNDS']",
    command: Command.FIT_GRAPH_BOUNDS,
    parameter: null,
    tooltip: 'Fit content'
  },
  {
    selector: "[data-command='INCREASE_ZOOM']",
    command: Command.INCREASE_ZOOM,
    parameter: null,
    tooltip: 'Increase zoom'
  },
  {
    selector: "[data-command='DECREASE_ZOOM']",
    command: Command.DECREASE_ZOOM,
    parameter: null,
    tooltip: 'Decrease zoom'
  }
]

function rebindToolbarCommands(target: GraphComponent): void {
  for (const { selector, command, parameter, tooltip } of toolbarCommands) {
    const element = document.querySelector<HTMLElement>(selector)
    if (!element) {
      continue
    }

    const replacement = element.cloneNode(true) as HTMLElement
    replacement.removeAttribute('data-command-registered')
    replacement.removeAttribute('data-disabled')
    replacement.removeAttribute('disabled')
    element.replaceWith(replacement)

    replacement.addEventListener('click', () => {
      if (target.canExecuteCommand(command, parameter)) {
        target.executeCommand(command, parameter)
      }
    })

    const updateDisabledState = () => {
      if (target.canExecuteCommand(command, parameter)) {
        replacement.removeAttribute('disabled')
      } else {
        replacement.setAttribute('disabled', 'disabled')
      }
    }
    target.addEventListener('can-execute-changed', updateDisabledState)
    replacement.setAttribute('data-command-registered', '')
    replacement.setAttribute('title', tooltip)
    updateDisabledState()
  }
}

/**
 * A flag that signals whether a layout is currently running to prevent re-entrant layout
 * calculations.
 */
let layoutRunning = false

/**
 * Starts the demo which displays graphs in an isometric fashion to create an impression of a
 * 3-dimensional view.
 */
async function run(): Promise<void> {
  License.value = licenseData
  initializeUI()
  await switchView('pseudo3d')
}

function initializeFolding(): void {
  foldingManager = new FoldingManager(graphComponent.graph)
  foldingManager.folderNodeConverter = new FolderNodeConverter({
    folderNodeDefaults: { copyLabels: true, shareStyleInstance: false, size: [210, 120] }
  })
  foldingManager.foldingEdgeConverter = new FoldingEdgeConverter({
    foldingEdgeDefaults: { copyLabels: true }
  })

  graphComponent.graph = foldingManager.createFoldingView().graph
}

function createRuntime(mode: ViewMode): ViewRuntime {
  if (mode === 'isometric') {
    return new IsometricRuntime(graphComponent, { onProjectionChanged: syncProjectionControls })
  }
  return new Pseudo3DRuntime(graphComponent, { onProjectionChanged: syncProjectionControls })
}

async function switchView(mode: ViewMode): Promise<void> {
  if (switching || layoutRunning || (activeMode === mode && activeRuntime)) {
    return
  }

  switching = true
  setUIDisabled(true)
  try {
    disposeCurrentComponent()
    activeMode = mode
    syncModeDescription()

    const host = document.querySelector<HTMLElement>('#graphComponent')!
    host.replaceChildren()
    graphComponent = new GraphComponent(host)
    rebindToolbarCommands(graphComponent)
    initializeFolding()
    activeRuntime = createRuntime(mode)
    activeRuntime.initialize()
    activeRuntime.initializeGraph(graphComponent.graph)
    await loadGraph()
    syncModeControls()
    syncProjectionControls()
  } finally {
    switching = false
    setUIDisabled(false)
  }
}

function disposeCurrentComponent(): void {
  activeRuntime?.dispose()
  activeRuntime = null!
  foldingManager?.dispose()
  foldingManager = null!
  if (graphComponent) {
    graphComponent.cleanUp()
    graphComponent = null!
  }
}

/**
 * Loads a graph from JSON and initializes all styles and isometric data.
 * The graph also gets an initial layout.
 */
async function loadGraph(): Promise<void> {
  const graph = graphComponent.graph

  const graphBuilder = new GraphBuilder(graph)
  const nodeSource = graphBuilder.createNodesSource({
    data: IsometricData.nodesSource,
    id: 'id',
    parentId: 'group',
    labels: ['label'],
    layout: (data: any) => new Rect(0, 0, data.width, data.depth),
    tag: createRuntimeTag
  })
  if (activeRuntime.getNodeStyle) {
    nodeSource.nodeCreator.styleProvider = (dataItem) => activeRuntime.getNodeStyle!(dataItem)
  }
  graphBuilder.createGroupNodesSource({
    data: IsometricData.groupsSource,
    id: 'id',
    parentId: 'group',
    labels: ['label'],
    tag: createRuntimeTag
  })
  const edgesSource = graphBuilder.createEdgesSource({
    data: IsometricData.edgesSource,
    sourceId: 'from',
    targetId: 'to'
  })
  edgesSource.edgeCreator.createLabelsSource((edgeData: any) => [edgeData.label])

  graphBuilder.buildGraph()

  await runHierarchicalLayout()
}

function syncProjectionControls(): void {
  if (!activeRuntime) {
    return
  }

  const rotationSlider = document.querySelector<HTMLInputElement>('#rotation')
  if (rotationSlider) {
    rotationSlider.value = String(Math.round(activeRuntime.getRotation()))
  }

  const inclinationSlider = document.querySelector<HTMLInputElement>('#inclination')
  if (inclinationSlider && activeRuntime.getInclination) {
    inclinationSlider.value = String(Math.round(activeRuntime.getInclination()))
  }
}

function syncModeDescription() {
  const pseudo3dDescription = document.querySelector<HTMLElement>('#pseudo3d-description')
  if (pseudo3dDescription) {
    pseudo3dDescription.hidden = activeMode !== 'pseudo3d'
  }
  const isometricDescription = document.querySelector<HTMLElement>('#isometric-description')
  if (isometricDescription) {
    isometricDescription.hidden = activeMode !== 'isometric'
  }
  const pseudo3dInteraction = document.querySelector<HTMLElement>('#pseudo3d-interaction')
  if (pseudo3dInteraction) {
    pseudo3dInteraction.hidden = activeMode !== 'pseudo3d'
  }
  const isometricInteraction = document.querySelector<HTMLElement>('#isometric-interaction')
  if (isometricInteraction) {
    isometricInteraction.hidden = activeMode !== 'isometric'
  }
  const pseudo3dThingsToTry = document.querySelector<HTMLElement>('#pseudo3d-things-to-try')
  if (pseudo3dThingsToTry) {
    pseudo3dThingsToTry.hidden = activeMode !== 'pseudo3d'
  }
  const isometricThingsToTry = document.querySelector<HTMLElement>('#isometric-things-to-try')
  if (isometricThingsToTry) {
    isometricThingsToTry.hidden = activeMode !== 'isometric'
  }
}

function syncModeControls(): void {
  if (!activeRuntime) {
    return
  }

  const rotationSlider = document.querySelector<HTMLInputElement>('#rotation')
  if (rotationSlider) {
    rotationSlider.min = String(activeRuntime.rotationMinimum)
    rotationSlider.max = String(activeRuntime.rotationMaximum)
    rotationSlider.step = String(activeRuntime.rotationStep)
  }

  const modeSelector = document.querySelector<HTMLSelectElement>('#view-mode')
  if (modeSelector) {
    modeSelector.value = activeMode
  }

  const inclinationControl = document.querySelector<HTMLElement>('#inclination-control')
  if (inclinationControl) {
    inclinationControl.hidden = activeMode === 'isometric'
  }

  const gridToggle = document.querySelector<HTMLInputElement>('#grid-toggle')
  if (gridToggle) {
    gridToggle.checked = activeRuntime.getGridVisible()
  }
}

function runHierarchicalLayout(): Promise<void> {
  const layout = new HierarchicalLayout({
    nodeToEdgeDistance: 50,
    minimumLayerDistance: 40,
    gridSpacing: 10
  })

  const layoutData = new HierarchicalLayoutData({
    edgeLabelPreferredPlacements: new EdgeLabelPreferredPlacement({
      angle: 0,
      distanceToEdge: 10,
      angleReference: LabelAngleReferences.RELATIVE_TO_EDGE_FLOW,
      edgeSide: LabelEdgeSides.LEFT_OF_EDGE,
      sideReference: LabelSideReferences.ABSOLUTE_WITH_RIGHT_ABOVE
    }),
    incrementalEdges: graphComponent.graph.edges
  })
  return runLayout(layout, layoutData)
}

function runOrthogonalLayout(): Promise<void> {
  const layout = new OrthogonalLayout({ gridSpacing: 20 })

  const layoutData = new OrthogonalLayoutData({
    edgeLabelPreferredPlacements: new EdgeLabelPreferredPlacement({
      angle: 0,
      distanceToEdge: 10,
      angleReference: LabelAngleReferences.RELATIVE_TO_EDGE_FLOW,
      edgeSide: LabelEdgeSides.LEFT_OF_EDGE,
      sideReference: LabelSideReferences.ABSOLUTE_WITH_RIGHT_ABOVE
    })
  })
  return runLayout(layout, layoutData)
}

async function runLayout(layout: ILayoutAlgorithm, layoutData: LayoutData): Promise<void> {
  if (layoutRunning) {
    return Promise.reject(new Error('layout is running'))
  }

  layoutRunning = true
  setUIDisabled(true)

  // configure layout execution to not move the view port
  const executor = new LayoutExecutor({
    graphComponent,
    layout,
    layoutData,
    animateViewport: true,
    animationDuration: '1s',
    portAdjustmentPolicies: PortAdjustmentPolicy.ALWAYS
  })

  try {
    await executor.start()
  } finally {
    layoutRunning = false
    setUIDisabled(false)
  }
}

async function openFile(graphMLIOHandler: GraphMLIOHandler): Promise<void> {
  try {
    const graph = graphComponent.graph
    await openGraphML(graphComponent, graphMLIOHandler)
    activeRuntime.applyStyles(graph)

    await runHierarchicalLayout()
  } finally {
    setUIDisabled(false)
  }
}

/**
 * Binds actions to the toolbar buttons.
 */
function initializeUI(): void {
  // ignore deserialization errors when loading graphs that use different styles
  // the styles will be replaced with the active view's styles later
  const graphMLIOHandler = new GraphMLIOHandler()
  graphMLIOHandler.deserializationPropertyOverrides.set(
    SerializationProperties.IGNORE_XAML_DESERIALIZATION_ERRORS,
    true
  )

  const rotationSlider = document.querySelector<HTMLInputElement>('#rotation')!
  rotationSlider.addEventListener('input', () => {
    activeRuntime?.setRotation(Number(rotationSlider.value))
  })
  const inclinationSlider = document.querySelector<HTMLInputElement>('#inclination')!
  inclinationSlider.addEventListener('input', () => {
    activeRuntime?.setInclination?.(Number(inclinationSlider.value))
  })

  const modeSelector = document.querySelector<HTMLSelectElement>('#view-mode')
  modeSelector?.addEventListener('change', () => {
    const mode: ViewMode = modeSelector.value === 'isometric' ? 'isometric' : 'pseudo3d'
    void switchView(mode)
  })

  document
    .querySelector<HTMLButtonElement>('#open-file-button')!
    .addEventListener('click', async () => {
      await openFile(graphMLIOHandler)
    })

  document
    .querySelector<HTMLButtonElement>('#hierarchical-layout')!
    .addEventListener('click', runHierarchicalLayout)
  document
    .querySelector<HTMLButtonElement>('#orthogonal-layout')!
    .addEventListener('click', runOrthogonalLayout)
  document.querySelector<HTMLButtonElement>('#grid-toggle')!.addEventListener('click', () => {
    if (activeRuntime) {
      activeRuntime.setGridVisible(!activeRuntime.getGridVisible())
    }
  })
  const orthogonalEditingButton = document.querySelector<HTMLInputElement>(
    '#demo-orthogonal-editing-button'
  )!
  orthogonalEditingButton.addEventListener('click', () => {
    activeRuntime?.setOrthogonalEditing?.(orthogonalEditingButton.checked)
  })
}

/**
 * Disables buttons in the toolbar.
 */
function setUIDisabled(disabled: boolean): void {
  const effectiveDisabled = disabled || switching || layoutRunning
  document.querySelector<HTMLButtonElement>('#open-file-button')!.disabled = effectiveDisabled
  document.querySelector<HTMLButtonElement>('#hierarchical-layout')!.disabled = effectiveDisabled
  document.querySelector<HTMLButtonElement>('#orthogonal-layout')!.disabled = effectiveDisabled
  document.querySelector<HTMLButtonElement>('#grid-toggle')!.disabled = effectiveDisabled
  document.querySelector<HTMLInputElement>('#rotation')!.disabled = effectiveDisabled
  document.querySelector<HTMLInputElement>('#inclination')!.disabled = effectiveDisabled
  document.querySelector<HTMLInputElement>('#demo-orthogonal-editing-button')!.disabled =
    effectiveDisabled
  const modeSelector = document.querySelector<HTMLSelectElement>('#view-mode')
  if (modeSelector) {
    modeSelector.disabled = effectiveDisabled
  }
}

run().then(finishLoading)
