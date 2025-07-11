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
  BendEventArgs,
  CanvasComponent,
  ClickEventArgs,
  ClickInputMode,
  ClipboardGraphCopier,
  ContextMenuInputMode,
  CreateBendInputMode,
  CreateEdgeInputMode,
  DragDropEffects,
  DropInputMode,
  EdgeEventArgs,
  EditLabelInputMode,
  EventArgs,
  FoldingManager,
  GraphBuilder,
  GraphClipboard,
  GraphClipboardEventArgs,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphViewerInputMode,
  HandleInputMode,
  HierarchicalLayout,
  HierarchicalLayoutEdgeDescriptor,
  HoveredItemChangedEventArgs,
  IBend,
  IEdge,
  IEdgeReconnectionPortCandidateProvider,
  IEdgeStyle,
  IFoldingView,
  IGraph,
  IGraphSelection,
  IInputMode,
  ILabel,
  ILabelModelParameter,
  ILabelStyle,
  IModelItem,
  INode,
  INodeStyle,
  InputModeEventArgs,
  InputModeItemChangedEventArgs,
  InputModeItemEventArgs,
  IPort,
  IPortLocationModelParameter,
  IPortStyle,
  ItemChangedEventArgs,
  ItemClickedEventArgs,
  ItemCopiedEventArgs,
  ItemEventArgs,
  ItemHoverInputMode,
  ItemsEventArgs,
  KeyEventArgs,
  LabelDropInputMode,
  type LabelEditingEventArgs,
  LabelEventArgs,
  LabelStyle,
  LabelTextValidatingEventArgs,
  LayoutExecutor,
  License,
  MoveInputMode,
  MoveViewportInputMode,
  NavigationInputMode,
  NodeDropInputMode,
  NodeEventArgs,
  Point,
  PointerButtons,
  PointerEventArgs,
  PopulateContextMenuEventArgs,
  PopulateItemContextMenuEventArgs,
  PortEventArgs,
  PrepareRenderContextEventArgs,
  PropertyChangedEventArgs,
  QueryItemToolTipEventArgs,
  QueryPositionHandlerEventArgs,
  QueryToolTipEventArgs,
  Rect,
  SelectionEventArgs,
  SimpleLabel,
  SimpleNode,
  Size,
  SvgExport,
  TextEditorInputMode,
  TextEventArgs,
  ToolTipInputMode,
  UndoEngine
} from '@yfiles/yfiles'

import { initDemoStyles } from '@yfiles/demo-resources/demo-styles'
import { EventView } from './EventView'
import { fetchLicense } from '@yfiles/demo-resources/fetch-license'
import { configureTwoPointerPanning } from '@yfiles/demo-utils/configure-two-pointer-panning'
import { finishLoading } from '@yfiles/demo-resources/demo-page'
import type { JSONGraph } from '@yfiles/demo-utils/json-model'
import graphData from './graph-data.json'

/**
 * This demo shows how to register to the various events provided by the {@link IGraph graph},
 * the graph component} and the input modes.
 */
async function run(): Promise<void> {
  License.value = await fetchLicense()

  eventView = new EventView()

  // initialize the GraphComponent
  initializeGraphComponent()

  initializeUI()
  initializeInputModes()
  setupToolTips()
  setupContextMenu()

  registerInputModeEvents()
  registerNavigationInputModeEvents()

  enableFolding()

  initializeGraph()
  initializeDragAndDropPanel()

  // build the graph from the given data set
  buildGraph(graphComponent.graph, graphData)

  // layout and center the graph
  LayoutExecutor.ensure()
  graphComponent.graph.applyLayout(
    new HierarchicalLayout({
      defaultEdgeDescriptor: new HierarchicalLayoutEdgeDescriptor({
        minimumFirstSegmentLength: 50,
        minimumLastSegmentLength: 50
      }),
      minimumLayerDistance: 70
    })
  )
  await graphComponent.fitGraphBounds()

  enableUndo()

  // initialize collapsible headings
  initOptionHeadings()
}

let eventView: EventView

let editorMode: GraphEditorInputMode

let viewerMode: GraphViewerInputMode

let manager: FoldingManager

let foldingView: IFoldingView

/**
 * Creates nodes and edges according to the given data.
 */
function buildGraph(graph: IGraph, graphData: JSONGraph): void {
  const graphBuilder = new GraphBuilder(graph)

  graphBuilder
    .createNodesSource({
      data: graphData.nodeList.filter((item) => !item.isGroup),
      id: (item) => item.id,
      parentId: (item) => item.parentId
    })
    .nodeCreator.createLabelBinding((item) => item.label)

  graphBuilder
    .createGroupNodesSource({
      data: graphData.nodeList.filter((item) => item.isGroup),
      id: (item) => item.id
    })
    .nodeCreator.createLabelBinding((item) => item.label)

  graphBuilder
    .createEdgesSource({
      data: graphData.edgeList,
      sourceId: (item) => item.source,
      targetId: (item) => item.target
    })
    .edgeCreator.createLabelBinding((item) => item.label)

  graphBuilder.buildGraph()
}

/**
 * Registers some keyboard events to the graphComponent.
 */
function registerGraphComponentKeyEvents(): void {
  graphComponent.addEventListener('key-down', componentOnKeyDown)
  graphComponent.addEventListener('key-up', componentOnKeyUp)
}

/**
 * Unregisters some keyboard events from the graphComponent.
 */
function unregisterGraphComponentKeyEvents(): void {
  graphComponent.removeEventListener('key-down', componentOnKeyDown)
  graphComponent.removeEventListener('key-up', componentOnKeyUp)
}

/**
 * Registers the copy clipboard events to the graphComponent.
 */
function registerClipboardCopierEvents(): void {
  graphComponent.clipboard.addEventListener('items-cutting', clipboardOnItemsCutting)
  graphComponent.clipboard.addEventListener('items-cut', clipboardOnItemsCut)
  graphComponent.clipboard.addEventListener('items-copying', clipboardOnItemsCopying)
  graphComponent.clipboard.addEventListener('items-copied', clipboardOnItemsCopied)
  graphComponent.clipboard.addEventListener('items-pasting', clipboardOnItemsPasting)
  graphComponent.clipboard.addEventListener('items-pasted', clipboardOnItemsPasted)
  graphComponent.clipboard.addEventListener('items-duplicating', clipboardOnItemsDuplicating)
  graphComponent.clipboard.addEventListener('items-duplicated', clipboardOnItemsDuplicated)

  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'graph-copied',
    clipboardOnGraphCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'node-copied',
    clipboardOnNodeCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'edge-copied',
    clipboardOnEdgeCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'port-copied',
    clipboardOnPortCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'label-copied',
    clipboardOnLabelCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.addEventListener(
    'object-copied',
    clipboardOnObjectCopiedToClipboard
  )

  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'graph-copied',
    clipboardOnGraphCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'node-copied',
    clipboardOnNodeCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'edge-copied',
    clipboardOnEdgeCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'port-copied',
    clipboardOnPortCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'label-copied',
    clipboardOnLabelCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.addEventListener(
    'object-copied',
    clipboardOnObjectCopiedFromClipboard
  )

  graphComponent.clipboard.duplicateCopier.addEventListener(
    'graph-copied',
    clipboardOnGraphDuplicated
  )
  graphComponent.clipboard.duplicateCopier.addEventListener(
    'node-copied',
    clipboardOnNodeDuplicated
  )
  graphComponent.clipboard.duplicateCopier.addEventListener(
    'edge-copied',
    clipboardOnEdgeDuplicated
  )
  graphComponent.clipboard.duplicateCopier.addEventListener(
    'port-copied',
    clipboardOnPortDuplicated
  )
  graphComponent.clipboard.duplicateCopier.addEventListener(
    'label-copied',
    clipboardOnLabelDuplicated
  )
  graphComponent.clipboard.duplicateCopier.addEventListener(
    'object-copied',
    clipboardOnObjectDuplicated
  )
}

/**
 * Unregisters the copy clipboard events from the graphComponent.
 */
function unregisterClipboardCopierEvents(): void {
  graphComponent.clipboard.removeEventListener('items-cutting', clipboardOnItemsCutting)
  graphComponent.clipboard.removeEventListener('items-cut', clipboardOnItemsCut)
  graphComponent.clipboard.removeEventListener('items-copying', clipboardOnItemsCopying)
  graphComponent.clipboard.removeEventListener('items-copied', clipboardOnItemsCopied)
  graphComponent.clipboard.removeEventListener('items-pasting', clipboardOnItemsPasting)
  graphComponent.clipboard.removeEventListener('items-pasted', clipboardOnItemsPasted)
  graphComponent.clipboard.removeEventListener('items-duplicating', clipboardOnItemsDuplicating)
  graphComponent.clipboard.removeEventListener('items-duplicated', clipboardOnItemsDuplicated)

  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'graph-copied',
    clipboardOnGraphCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'node-copied',
    clipboardOnNodeCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'edge-copied',
    clipboardOnEdgeCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'port-copied',
    clipboardOnPortCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'label-copied',
    clipboardOnLabelCopiedToClipboard
  )
  graphComponent.clipboard.toClipboardCopier.removeEventListener(
    'object-copied',
    clipboardOnObjectCopiedToClipboard
  )

  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'graph-copied',
    clipboardOnGraphCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'node-copied',
    clipboardOnNodeCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'edge-copied',
    clipboardOnEdgeCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'port-copied',
    clipboardOnPortCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'label-copied',
    clipboardOnLabelCopiedFromClipboard
  )
  graphComponent.clipboard.fromClipboardCopier.removeEventListener(
    'object-copied',
    clipboardOnObjectCopiedFromClipboard
  )

  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'graph-copied',
    clipboardOnGraphDuplicated
  )
  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'node-copied',
    clipboardOnNodeDuplicated
  )
  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'edge-copied',
    clipboardOnEdgeDuplicated
  )
  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'port-copied',
    clipboardOnPortDuplicated
  )
  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'label-copied',
    clipboardOnLabelDuplicated
  )
  graphComponent.clipboard.duplicateCopier.removeEventListener(
    'object-copied',
    clipboardOnObjectDuplicated
  )
}

/**
 * Registers the pointer events to the graphComponent.
 */
function registerGraphComponentPointerEvents(): void {
  graphComponent.addEventListener('pointer-click', componentOnPointerClick)
  graphComponent.addEventListener('pointer-enter', componentOnPointerEnter)
  graphComponent.addEventListener('pointer-leave', componentOnPointerLeave)
  graphComponent.addEventListener('lost-pointer-capture', componentOnPointerLostCapture)
  graphComponent.addEventListener('pointer-down', componentOnPointerDown)
  graphComponent.addEventListener('pointer-up', componentOnPointerUp)
  graphComponent.addEventListener('pointer-drag', componentOnPointerDrag)
  graphComponent.addEventListener('pointer-move', componentOnPointerMove)
  graphComponent.addEventListener('pointer-cancel', componentOnPointerCancel)
  graphComponent.addEventListener('pointer-long-rest', componentOnPointerLongRest)
  graphComponent.addEventListener('wheel', componentOnMouseWheelTurned)
  graphComponent.addEventListener('pointer-long-press', componentOnPointerLongPress)
  graphComponent.addEventListener('pointer-long-rest', componentOnPointerLongRest)
}

/**
 * Unregisters the pointer events from the graphComponent.
 */
function unregisterGraphComponentPointerEvents(): void {
  graphComponent.removeEventListener('pointer-click', componentOnPointerClick)
  graphComponent.removeEventListener('pointer-enter', componentOnPointerEnter)
  graphComponent.removeEventListener('pointer-leave', componentOnPointerLeave)
  graphComponent.removeEventListener('lost-pointer-capture', componentOnPointerLostCapture)
  graphComponent.removeEventListener('pointer-down', componentOnPointerDown)
  graphComponent.removeEventListener('pointer-up', componentOnPointerUp)
  graphComponent.removeEventListener('pointer-drag', componentOnPointerDrag)
  graphComponent.removeEventListener('pointer-move', componentOnPointerMove)
  graphComponent.removeEventListener('pointer-cancel', componentOnPointerCancel)
  graphComponent.removeEventListener('pointer-long-rest', componentOnPointerLongRest)
  graphComponent.removeEventListener('wheel', componentOnMouseWheelTurned)
  graphComponent.removeEventListener('pointer-long-press', componentOnPointerLongPress)
  graphComponent.removeEventListener('pointer-long-rest', componentOnPointerLongRest)
}

/**
 * Registers the rendering events to the graphComponent.
 */
function registerGraphComponentRenderEvents(): void {
  graphComponent.addEventListener('prepare-render-context', componentOnPrepareRenderContext)
  graphComponent.addEventListener('updated-visual', componentOnUpdatedVisual)
  graphComponent.addEventListener('updating-visual', componentOnUpdatingVisual)
}

/**
 * Unregisters the rendering events from the graphComponent.
 */
function unregisterGraphComponentRenderEvents(): void {
  graphComponent.removeEventListener('prepare-render-context', componentOnPrepareRenderContext)
  graphComponent.removeEventListener('updated-visual', componentOnUpdatedVisual)
  graphComponent.removeEventListener('updating-visual', componentOnUpdatingVisual)
}

/**
 * Registers the viewport events to the graphComponent.
 */
function registerGraphComponentViewportEvents(): void {
  graphComponent.addEventListener('viewport-changed', componentOnViewportChanged)
  graphComponent.addEventListener('zoom-changed', componentOnZoomChanged)
}

/**
 * Unregisters the viewport events from the graphComponent.
 */
function unregisterGraphComponentViewportEvents(): void {
  graphComponent.removeEventListener('viewport-changed', componentOnViewportChanged)
  graphComponent.removeEventListener('zoom-changed', componentOnZoomChanged)
}

/**
 * Registers events regarding node changes to the graphComponent's graph.
 */
function registerNodeEvents(): void {
  graphComponent.graph.addEventListener('node-layout-changed', onNodeLayoutChanged)
  graphComponent.graph.addEventListener('node-style-changed', onNodeStyleChanged)
  graphComponent.graph.addEventListener('node-tag-changed', onNodeTagChanged)
  graphComponent.graph.addEventListener('node-created', onNodeCreated)
  graphComponent.graph.addEventListener('node-removed', onNodeRemoved)
}

/**
 * Unregisters events regarding node changes from the graphComponent's graph.
 */
function unregisterNodeEvents(): void {
  graphComponent.graph.removeEventListener('node-layout-changed', onNodeLayoutChanged)
  graphComponent.graph.removeEventListener('node-style-changed', onNodeStyleChanged)
  graphComponent.graph.removeEventListener('node-tag-changed', onNodeTagChanged)
  graphComponent.graph.removeEventListener('node-created', onNodeCreated)
  graphComponent.graph.removeEventListener('node-removed', onNodeRemoved)
}

/**
 * Registers events regarding edge changes to the graphComponent's graph.
 */
function registerEdgeEvents(): void {
  graphComponent.graph.addEventListener('edge-ports-changed', onEdgePortsChanged)
  graphComponent.graph.addEventListener('edge-style-changed', onEdgeStyleChanged)
  graphComponent.graph.addEventListener('edge-tag-changed', onEdgeTagChanged)
  graphComponent.graph.addEventListener('edge-created', onEdgeCreated)
  graphComponent.graph.addEventListener('edge-removed', onEdgeRemoved)
}

/**
 * Unregisters events regarding edge changes from the graphComponent's graph.
 */
function unregisterEdgeEvents(): void {
  graphComponent.graph.removeEventListener('edge-ports-changed', onEdgePortsChanged)
  graphComponent.graph.removeEventListener('edge-style-changed', onEdgeStyleChanged)
  graphComponent.graph.removeEventListener('edge-tag-changed', onEdgeTagChanged)
  graphComponent.graph.removeEventListener('edge-created', onEdgeCreated)
  graphComponent.graph.removeEventListener('edge-removed', onEdgeRemoved)
}

/**
 * Registers events regarding bend changes to the graphComponent's graph.
 */
function registerBendEvents(): void {
  graphComponent.graph.addEventListener('bend-added', onBendAdded)
  graphComponent.graph.addEventListener('bend-location-changed', onBendLocationChanged)
  graphComponent.graph.addEventListener('bend-tag-changed', onBendTagChanged)
  graphComponent.graph.addEventListener('bend-removed', onBendRemoved)
}

/**
 * Unregisters events regarding bend changes from the graphComponent's graph.
 */
function unregisterBendEvents(): void {
  graphComponent.graph.removeEventListener('bend-added', onBendAdded)
  graphComponent.graph.removeEventListener('bend-location-changed', onBendLocationChanged)
  graphComponent.graph.removeEventListener('bend-tag-changed', onBendTagChanged)
  graphComponent.graph.removeEventListener('bend-removed', onBendRemoved)
}

/**
 * Registers events regarding port changes to the graphComponent's graph.
 */
function registerPortEvents(): void {
  graphComponent.graph.addEventListener('port-added', onPortAdded)
  graphComponent.graph.addEventListener(
    'port-location-parameter-changed',
    onPortLocationParameterChanged
  )
  graphComponent.graph.addEventListener('port-style-changed', onPortStyleChanged)
  graphComponent.graph.addEventListener('port-tag-changed', onPortTagChanged)
  graphComponent.graph.addEventListener('port-removed', onPortRemoved)
}

/**
 * Unregisters events regarding port changes from the graphComponent's graph.
 */
function unregisterPortEvents(): void {
  graphComponent.graph.removeEventListener('port-added', onPortAdded)
  graphComponent.graph.removeEventListener(
    'port-location-parameter-changed',
    onPortLocationParameterChanged
  )
  graphComponent.graph.removeEventListener('port-style-changed', onPortStyleChanged)
  graphComponent.graph.removeEventListener('port-tag-changed', onPortTagChanged)
  graphComponent.graph.removeEventListener('port-removed', onPortRemoved)
}

/**
 * Registers events regarding label changes to the graphComponent's graph.
 */
function registerLabelEvents(): void {
  graphComponent.graph.addEventListener('label-added', onLabelAdded)
  graphComponent.graph.addEventListener('label-preferred-size-changed', onLabelPreferredSizeChanged)
  graphComponent.graph.addEventListener(
    'label-layout-parameter-changed',
    onLabelLayoutParameterChanged
  )
  graphComponent.graph.addEventListener('label-style-changed', onLabelStyleChanged)
  graphComponent.graph.addEventListener('label-tag-changed', onLabelTagChanged)
  graphComponent.graph.addEventListener('label-text-changed', onLabelTextChanged)
  graphComponent.graph.addEventListener('label-removed', onLabelRemoved)
}

/**
 * Unregisters events regarding label changes from the graphComponent's graph.
 */
function unregisterLabelEvents(): void {
  graphComponent.graph.removeEventListener('label-added', onLabelAdded)
  graphComponent.graph.removeEventListener(
    'label-preferred-size-changed',
    onLabelPreferredSizeChanged
  )
  graphComponent.graph.removeEventListener(
    'label-layout-parameter-changed',
    onLabelLayoutParameterChanged
  )
  graphComponent.graph.removeEventListener('label-style-changed', onLabelStyleChanged)
  graphComponent.graph.removeEventListener('label-tag-changed', onLabelTagChanged)
  graphComponent.graph.removeEventListener('label-text-changed', onLabelTextChanged)
  graphComponent.graph.removeEventListener('label-removed', onLabelRemoved)
}

/**
 * Registers events regarding hierarchy changes to the graphComponent's graph.
 */
function registerHierarchyEvents(): void {
  graphComponent.graph.addEventListener('parent-changed', onParentChanged)
  graphComponent.graph.addEventListener('is-group-node-changed', onIsGroupNodeChanged)
}

/**
 * Unregisters events regarding hierarchy changes from the graphComponent's graph.
 */
function unregisterHierarchyEvents(): void {
  graphComponent.graph.removeEventListener('parent-changed', onParentChanged)
  graphComponent.graph.removeEventListener('is-group-node-changed', onIsGroupNodeChanged)
}

/**
 * Registers events regarding folding changes to the folding view of the graphComponent.
 */
function registerFoldingEvents(): void {
  foldingView.addEventListener('group-collapsed', onGroupCollapsed)
  foldingView.addEventListener('group-expanded', onGroupExpanded)
  foldingView.addEventListener('property-changed', onPropertyChanged)
}

/**
 * Unregisters events regarding folding changes from the folding view of the graphComponent.
 */
function unregisterFoldingEvents(): void {
  foldingView.removeEventListener('group-collapsed', onGroupCollapsed)
  foldingView.removeEventListener('group-expanded', onGroupExpanded)
  foldingView.removeEventListener('property-changed', onPropertyChanged)
}

/**
 * Registers events regarding updating the current display to the graphComponent's graph.
 */
function registerGraphRenderEvents(): void {
  graphComponent.graph.addEventListener('displays-invalidated', onDisplaysInvalidated)
}

/**
 * Unregisters events regarding updating the current display from the graphComponent's graph.
 */
function unregisterGraphRenderEvents(): void {
  graphComponent.graph.removeEventListener('displays-invalidated', onDisplaysInvalidated)
}

/**
 * Registers events to the graphComponent.
 */
function registerGraphComponentEvents(): void {
  graphComponent.addEventListener('current-item-changed', componentOnCurrentItemChanged)
}

/**
 * Unregisters events from the graphComponent.
 */
function unregisterGraphComponentEvents(): void {
  graphComponent.removeEventListener('current-item-changed', componentOnCurrentItemChanged)
}

/**
 * Registers events to the input mode.
 */
function registerInputModeEvents(): void {
  editorMode.addEventListener('canvas-clicked', geimOnCanvasClicked)
  editorMode.addEventListener('deleted-item', geimOnDeletedItem)
  editorMode.addEventListener('deleted-selection', geimOnDeletedSelection)
  editorMode.addEventListener('deleting-selection', geimOnDeletingSelection)
  editorMode.addEventListener('item-clicked', geimOnItemClicked)
  editorMode.addEventListener('item-double-clicked', geimOnItemDoubleClicked)
  editorMode.addEventListener('item-left-clicked', geimOnItemLeftClicked)
  editorMode.addEventListener('item-left-double-clicked', geimOnItemLeftDoubleClicked)
  editorMode.addEventListener('item-right-clicked', geimOnItemRightClicked)
  editorMode.addEventListener('item-right-double-clicked', geimOnItemRightDoubleClicked)
  editorMode.addEventListener('multi-selection-finished', geimOnMultiSelectionFinished)
  editorMode.addEventListener('multi-selection-started', geimOnMultiSelectionStarted)
  editorMode.addEventListener('node-created', geimOnNodeCreated)
  editorMode.addEventListener('node-reparented', geimOnNodeReparented)
  editorMode.addEventListener('edge-ports-changed', geimOnEdgePortsChanged)
  editorMode.addEventListener('populate-item-context-menu', geimOnPopulateItemContextMenu)
  editorMode.addEventListener('query-item-tool-tip', geimOnQueryItemToolTip)
  editorMode.addEventListener('label-added', geimOnLabelAdded)
  editorMode.addEventListener('label-edited', geimOnLabelEdited)

  viewerMode.addEventListener('canvas-clicked', gvimOnCanvasClicked)
  viewerMode.addEventListener('item-clicked', gvimOnItemClicked)
  viewerMode.addEventListener('item-double-clicked', gvimOnItemDoubleClicked)
  viewerMode.addEventListener('item-left-clicked', gvimOnItemLeftClicked)
  viewerMode.addEventListener('item-left-double-clicked', gvimOnItemLeftDoubleClicked)
  viewerMode.addEventListener('item-right-clicked', gvimOnItemRightClicked)
  viewerMode.addEventListener('item-right-double-clicked', gvimOnItemRightDoubleClicked)
  viewerMode.addEventListener('multi-selection-finished', gvimOnMultiSelectionFinished)
  viewerMode.addEventListener('multi-selection-started', gvimOnMultiSelectionStarted)
  viewerMode.addEventListener('populate-item-context-menu', gvimOnPopulateItemContextMenu)
  viewerMode.addEventListener('query-item-tool-tip', gvimOnQueryItemToolTip)
}

/**
 * Unregisters events from the input mode.
 */
function unregisterInputModeEvents(): void {
  editorMode.removeEventListener('canvas-clicked', geimOnCanvasClicked)
  editorMode.removeEventListener('deleted-item', geimOnDeletedItem)
  editorMode.removeEventListener('deleted-selection', geimOnDeletedSelection)
  editorMode.removeEventListener('deleting-selection', geimOnDeletingSelection)
  editorMode.removeEventListener('item-clicked', geimOnItemClicked)
  editorMode.removeEventListener('item-double-clicked', geimOnItemDoubleClicked)
  editorMode.removeEventListener('item-left-clicked', geimOnItemLeftClicked)
  editorMode.removeEventListener('item-left-double-clicked', geimOnItemLeftDoubleClicked)
  editorMode.removeEventListener('item-right-clicked', geimOnItemRightClicked)
  editorMode.removeEventListener('item-right-double-clicked', geimOnItemRightDoubleClicked)
  editorMode.removeEventListener('multi-selection-finished', geimOnMultiSelectionFinished)
  editorMode.removeEventListener('multi-selection-started', geimOnMultiSelectionStarted)
  editorMode.removeEventListener('node-created', geimOnNodeCreated)
  editorMode.removeEventListener('node-reparented', geimOnNodeReparented)
  editorMode.removeEventListener('edge-ports-changed', geimOnEdgePortsChanged)
  editorMode.removeEventListener('populate-item-context-menu', geimOnPopulateItemContextMenu)
  editorMode.removeEventListener('query-item-tool-tip', geimOnQueryItemToolTip)
  viewerMode.removeEventListener('canvas-clicked', gvimOnCanvasClicked)
  viewerMode.removeEventListener('item-clicked', gvimOnItemClicked)
  viewerMode.removeEventListener('item-double-clicked', gvimOnItemDoubleClicked)
  viewerMode.removeEventListener('item-left-clicked', gvimOnItemLeftClicked)
  viewerMode.removeEventListener('item-left-double-clicked', gvimOnItemLeftDoubleClicked)
  viewerMode.removeEventListener('item-right-clicked', gvimOnItemRightClicked)
  viewerMode.removeEventListener('item-right-double-clicked', gvimOnItemRightDoubleClicked)
  viewerMode.removeEventListener('multi-selection-finished', gvimOnMultiSelectionFinished)
  viewerMode.removeEventListener('multi-selection-started', gvimOnMultiSelectionStarted)
  viewerMode.removeEventListener('populate-item-context-menu', gvimOnPopulateItemContextMenu)
  viewerMode.removeEventListener('query-item-tool-tip', gvimOnQueryItemToolTip)
}

/**
 * Registers events to the move input mode.
 */
function registerMoveInputModeEvents(): void {
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'drag-canceled',
    moveInputModeOnDragCanceled
  )
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'drag-canceling',
    moveInputModeOnDragCanceling
  )
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'drag-finished',
    moveInputModeOnDragFinished
  )
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'drag-finishing',
    moveInputModeOnDragFinishing
  )
  editorMode.moveSelectedItemsInputMode.addEventListener('drag-started', moveInputModeOnDragStarted)
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'drag-starting',
    moveInputModeOnDragStarting
  )
  editorMode.moveSelectedItemsInputMode.addEventListener('dragged', moveInputModeOnDragged)
  editorMode.moveSelectedItemsInputMode.addEventListener('dragging', moveInputModeOnDragging)
  editorMode.moveSelectedItemsInputMode.addEventListener(
    'query-position-handler',
    moveInputModeOnQueryPositionHandler
  )
}

/**
 * Unregisters events from the move input mode.
 */
function unregisterMoveInputModeEvents(): void {
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-canceled',
    moveInputModeOnDragCanceled
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-canceling',
    moveInputModeOnDragCanceling
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-finished',
    moveInputModeOnDragFinished
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-finishing',
    moveInputModeOnDragFinishing
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-started',
    moveInputModeOnDragStarted
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'drag-starting',
    moveInputModeOnDragStarting
  )
  editorMode.moveSelectedItemsInputMode.removeEventListener('dragged', moveInputModeOnDragged)
  editorMode.moveSelectedItemsInputMode.removeEventListener('dragging', moveInputModeOnDragging)
  editorMode.moveSelectedItemsInputMode.removeEventListener(
    'query-position-handler',
    moveInputModeOnQueryPositionHandler
  )
}

/**
 * Registers events to the node drop input mode.
 */
function registerItemDropInputModeEvents(): void {
  editorMode.nodeDropInputMode.addEventListener('drag-dropped', itemInputModeOnDragDropped)
  editorMode.nodeDropInputMode.addEventListener('drag-entered', itemInputModeOnDragEntered)
  editorMode.nodeDropInputMode.addEventListener('drag-left', itemInputModeOnDragLeft)
  editorMode.nodeDropInputMode.addEventListener('drag-over', itemInputModeOnDragOver)
  editorMode.nodeDropInputMode.addEventListener('item-created', itemInputModeOnItemCreated)
  editorMode.labelDropInputMode.addEventListener('drag-dropped', itemInputModeOnDragDropped)
  editorMode.labelDropInputMode.addEventListener('drag-entered', itemInputModeOnDragEntered)
  editorMode.labelDropInputMode.addEventListener('drag-left', itemInputModeOnDragLeft)
  editorMode.labelDropInputMode.addEventListener('drag-over', itemInputModeOnDragOver)
  editorMode.labelDropInputMode.addEventListener('item-created', itemInputModeOnItemCreated)
  // PortDropInputMode inherits drag-dropped, drag-entered, drag-left, drag-over, item-created events from
  // ItemDropInputMode, too
}

/**
 * Unregisters events from the node drop input mode.
 */
function unregisterItemDropInputModeEvents(): void {
  editorMode.nodeDropInputMode.removeEventListener('drag-dropped', itemInputModeOnDragDropped)
  editorMode.nodeDropInputMode.removeEventListener('drag-entered', itemInputModeOnDragEntered)
  editorMode.nodeDropInputMode.removeEventListener('drag-left', itemInputModeOnDragLeft)
  editorMode.nodeDropInputMode.removeEventListener('drag-over', itemInputModeOnDragOver)
  editorMode.nodeDropInputMode.removeEventListener('item-created', itemInputModeOnItemCreated)
  editorMode.labelDropInputMode.removeEventListener('drag-dropped', itemInputModeOnDragDropped)
  editorMode.labelDropInputMode.removeEventListener('drag-entered', itemInputModeOnDragEntered)
  editorMode.labelDropInputMode.removeEventListener('drag-left', itemInputModeOnDragLeft)
  editorMode.labelDropInputMode.removeEventListener('drag-over', itemInputModeOnDragOver)
  editorMode.labelDropInputMode.removeEventListener('item-created', itemInputModeOnItemCreated)
}

/**
 * Registers events from the edit label input mode.
 */
function registerEditLabelInputModeEvents(): void {
  editorMode.editLabelInputMode.addEventListener('label-added', editLabelInputModeLabelAdded)
  editorMode.editLabelInputMode.addEventListener('label-deleted', editLabelInputModeLabelDeleted)
  editorMode.editLabelInputMode.addEventListener('label-edited', editLabelInputModeLabelEdited)
  editorMode.editLabelInputMode.addEventListener(
    'label-editing-canceled',
    editLabelInputModeLabelEditingCanceled
  )
  editorMode.editLabelInputMode.addEventListener(
    'label-editing-started',
    editLabelInputModeLabelEditingStarted
  )
  editorMode.editLabelInputMode.addEventListener(
    'query-label-adding',
    editLabelInputModeOnQueryLabelAdding
  )
  editorMode.editLabelInputMode.addEventListener(
    'query-label-editing',
    editLabelInputModeOnQueryLabelEditing
  )
  editorMode.editLabelInputMode.addEventListener(
    'validate-label-text',
    editLabelInputModeOnQueryValidateLabelText
  )
}

/**
 * Unregisters events from the edit label input mode.
 */
function unregisterEditLabelInputModeEvents(): void {
  editorMode.editLabelInputMode.removeEventListener('label-added', editLabelInputModeLabelAdded)
  editorMode.editLabelInputMode.removeEventListener('label-deleted', editLabelInputModeLabelDeleted)
  editorMode.editLabelInputMode.removeEventListener('label-edited', editLabelInputModeLabelEdited)
  editorMode.editLabelInputMode.removeEventListener(
    'label-editing-canceled',
    editLabelInputModeLabelEditingCanceled
  )
  editorMode.editLabelInputMode.removeEventListener(
    'label-editing-started',
    editLabelInputModeLabelEditingStarted
  )
  editorMode.editLabelInputMode.removeEventListener(
    'query-label-adding',
    editLabelInputModeOnQueryLabelAdding
  )
  editorMode.editLabelInputMode.removeEventListener(
    'query-label-editing',
    editLabelInputModeOnQueryLabelEditing
  )
  editorMode.editLabelInputMode.removeEventListener(
    'validate-label-text',
    editLabelInputModeOnQueryValidateLabelText
  )
}

/**
 * Registers hover events to the input mode.
 */
function registerItemHoverInputModeEvents(): void {
  editorMode.itemHoverInputMode.addEventListener(
    'hovered-item-changed',
    itemHoverInputModeOnHoveredItemChanged
  )
  viewerMode.itemHoverInputMode.addEventListener(
    'hovered-item-changed',
    itemHoverInputModeOnHoveredItemChanged
  )
}

/**
 * Unregisters hover events from the input mode.
 */
function unregisterItemHoverInputModeEvents(): void {
  editorMode.itemHoverInputMode.removeEventListener(
    'hovered-item-changed',
    itemHoverInputModeOnHoveredItemChanged
  )
  viewerMode.itemHoverInputMode.removeEventListener(
    'hovered-item-changed',
    itemHoverInputModeOnHoveredItemChanged
  )
}

/**
 * Registers events to the bend input mode.
 */
function registerCreateBendInputModeEvents(): void {
  editorMode.createBendInputMode.addEventListener('bend-created', createBendInputModeOnBendCreated)
  editorMode.createBendInputMode.addEventListener(
    'drag-canceled',
    createBendInputModeOnDragCanceled
  )
  editorMode.createBendInputMode.addEventListener('dragged', createBendInputModeOnDragged)
  editorMode.createBendInputMode.addEventListener('dragging', createBendInputModeOnDragging)
}

/**
 * Unregisters events from the bend input mode.
 */
function unregisterCreateBendInputModeEvents(): void {
  editorMode.createBendInputMode.removeEventListener(
    'bend-created',
    createBendInputModeOnBendCreated
  )
  editorMode.createBendInputMode.removeEventListener(
    'drag-canceled',
    createBendInputModeOnDragCanceled
  )
  editorMode.createBendInputMode.removeEventListener('dragged', createBendInputModeOnDragged)
  editorMode.createBendInputMode.removeEventListener('dragging', createBendInputModeOnDragging)
}

/**
 * Registers events related to the context menu.
 */
function registerContextMenuInputModeEvents(): void {
  editorMode.contextMenuInputMode.addEventListener(
    'populate-menu',
    contextMenuInputModeOnPopulateMenu
  )
  viewerMode.contextMenuInputMode.addEventListener(
    'populate-menu',
    contextMenuInputModeOnPopulateMenu
  )
}

/**
 * Unregisters events related to the context menu.
 */
function unregisterContextMenuInputModeEvents(): void {
  editorMode.contextMenuInputMode.removeEventListener(
    'populate-menu',
    contextMenuInputModeOnPopulateMenu
  )
  viewerMode.contextMenuInputMode.removeEventListener(
    'populate-menu',
    contextMenuInputModeOnPopulateMenu
  )
}

/**
 * Registers events related to the text editor mode.
 */
function registerTextEditorInputModeEvents(): void {
  const textEditorInputMode = editorMode.editLabelInputMode.textEditorInputMode
  textEditorInputMode.addEventListener('editing-canceled', textEditorInputModeOnEditingCanceled)
  textEditorInputMode.addEventListener('editing-started', textEditorInputModeOnEditingStarted)
  textEditorInputMode.addEventListener('text-edited', textEditorInputModeOnTextEdited)
}

/**
 * Unregisters events related from the text editor mode.
 */
function unregisterTextEditorInputModeEvents(): void {
  const textEditorInputMode = editorMode.editLabelInputMode.textEditorInputMode
  textEditorInputMode.removeEventListener('editing-canceled', textEditorInputModeOnEditingCanceled)
  textEditorInputMode.removeEventListener('editing-started', textEditorInputModeOnEditingStarted)
  textEditorInputMode.removeEventListener('text-edited', textEditorInputModeOnTextEdited)
}

/**
 * Registers events related to tooltips to the input mode.
 */
function registerTooltipInputModeEvents(): void {
  editorMode.toolTipInputMode.addEventListener('query-tool-tip', toolTipInputModeOnQueryToolTip)
  viewerMode.toolTipInputMode.addEventListener('query-tool-tip', toolTipInputModeOnQueryToolTip)
}

/**
 * Registers events related to tooltips from the input mode.
 */
function unregisterToolTipInputModeEvents(): void {
  editorMode.toolTipInputMode.removeEventListener('query-tool-tip', toolTipInputModeOnQueryToolTip)
  viewerMode.toolTipInputMode.removeEventListener('query-tool-tip', toolTipInputModeOnQueryToolTip)
}

/**
 * Registers events related to group navigation to the navigation input mode.
 */
function registerNavigationInputModeEvents(): void {
  editorMode.navigationInputMode.addEventListener(
    'group-collapsed',
    navigationInputModeOnGroupCollapsed
  )
  editorMode.navigationInputMode.addEventListener(
    'group-collapsing',
    navigationInputModeOnGroupCollapsing
  )
  editorMode.navigationInputMode.addEventListener(
    'group-entered',
    navigationInputModeOnGroupEntered
  )
  editorMode.navigationInputMode.addEventListener(
    'group-entering',
    navigationInputModeOnGroupEntering
  )
  editorMode.navigationInputMode.addEventListener('group-exited', navigationInputModeOnGroupExited)
  editorMode.navigationInputMode.addEventListener(
    'group-exiting',
    navigationInputModeOnGroupExiting
  )
  editorMode.navigationInputMode.addEventListener(
    'group-expanded',
    navigationInputModeOnGroupExpanded
  )
  editorMode.navigationInputMode.addEventListener(
    'group-expanding',
    navigationInputModeOnGroupExpanding
  )

  viewerMode.navigationInputMode.addEventListener(
    'group-collapsed',
    navigationInputModeOnGroupCollapsed
  )
  viewerMode.navigationInputMode.addEventListener(
    'group-collapsing',
    navigationInputModeOnGroupCollapsing
  )
  viewerMode.navigationInputMode.addEventListener(
    'group-entered',
    navigationInputModeOnGroupEntered
  )
  viewerMode.navigationInputMode.addEventListener(
    'group-entering',
    navigationInputModeOnGroupEntering
  )
  viewerMode.navigationInputMode.addEventListener('group-exited', navigationInputModeOnGroupExited)
  viewerMode.navigationInputMode.addEventListener(
    'group-exiting',
    navigationInputModeOnGroupExiting
  )
  viewerMode.navigationInputMode.addEventListener(
    'group-expanded',
    navigationInputModeOnGroupExpanded
  )
  viewerMode.navigationInputMode.addEventListener(
    'group-expanding',
    navigationInputModeOnGroupExpanding
  )
}

/**
 * Unregisters events related to group navigation from the navigation input mode.
 */
function unregisterNavigationInputModeEvents(): void {
  editorMode.navigationInputMode.removeEventListener(
    'group-collapsed',
    navigationInputModeOnGroupCollapsed
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-collapsing',
    navigationInputModeOnGroupCollapsing
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-entered',
    navigationInputModeOnGroupEntered
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-entering',
    navigationInputModeOnGroupEntering
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-exited',
    navigationInputModeOnGroupExited
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-exiting',
    navigationInputModeOnGroupExiting
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-expanded',
    navigationInputModeOnGroupExpanded
  )
  editorMode.navigationInputMode.removeEventListener(
    'group-expanding',
    navigationInputModeOnGroupExpanding
  )

  viewerMode.navigationInputMode.removeEventListener(
    'group-collapsed',
    navigationInputModeOnGroupCollapsed
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-collapsing',
    navigationInputModeOnGroupCollapsing
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-entered',
    navigationInputModeOnGroupEntered
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-entering',
    navigationInputModeOnGroupEntering
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-exited',
    navigationInputModeOnGroupExited
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-exiting',
    navigationInputModeOnGroupExiting
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-expanded',
    navigationInputModeOnGroupExpanded
  )
  viewerMode.navigationInputMode.removeEventListener(
    'group-expanding',
    navigationInputModeOnGroupExpanding
  )
}

/**
 * Registers events to the click input mode.
 */
function registerClickInputModeEvents(): void {
  editorMode.clickInputMode.addEventListener('clicked', clickInputModeOnClicked)
  viewerMode.clickInputMode.addEventListener('clicked', clickInputModeOnClicked)
}

/**
 * Unregisters events from the click input mode.
 */
function unregisterClickInputModeEvents(): void {
  editorMode.clickInputMode.removeEventListener('clicked', clickInputModeOnClicked)
  viewerMode.clickInputMode.removeEventListener('clicked', clickInputModeOnClicked)
}

/**
 * Registers events to the click input mode.
 */
function registerHandleInputModeEvents(): void {
  editorMode.handleInputMode.addEventListener('drag-canceled', handleInputModeOnDragCanceled)
  editorMode.handleInputMode.addEventListener('drag-canceling', handleInputModeOnDragCanceling)
  editorMode.handleInputMode.addEventListener('drag-finished', handleInputModeOnDragFinished)
  editorMode.handleInputMode.addEventListener('drag-finishing', handleInputModeOnDragFinishing)
  editorMode.handleInputMode.addEventListener('drag-started', handleInputModeOnDragStarted)
  editorMode.handleInputMode.addEventListener('drag-starting', handleInputModeOnDragStarting)
  editorMode.handleInputMode.addEventListener('dragged', handleInputModeOnDragged)
  editorMode.handleInputMode.addEventListener('dragging', handleInputModeOnDragging)
}

/**
 * Unregisters events from the handle input mode.
 */
function unregisterHandleInputModeEvents(): void {
  editorMode.handleInputMode.removeEventListener('drag-canceled', handleInputModeOnDragCanceled)
  editorMode.handleInputMode.removeEventListener('drag-canceling', handleInputModeOnDragCanceling)
  editorMode.handleInputMode.removeEventListener('drag-finished', handleInputModeOnDragFinished)
  editorMode.handleInputMode.removeEventListener('drag-finishing', handleInputModeOnDragFinishing)
  editorMode.handleInputMode.removeEventListener('drag-started', handleInputModeOnDragStarted)
  editorMode.handleInputMode.removeEventListener('drag-starting', handleInputModeOnDragStarting)
  editorMode.handleInputMode.removeEventListener('dragged', handleInputModeOnDragged)
  editorMode.handleInputMode.removeEventListener('dragging', handleInputModeOnDragging)
}

/**
 * Registers events to the move viewport input mode.
 */
function registerMoveViewportInputModeEvents(): void {
  editorMode.moveViewportInputMode.addEventListener(
    'drag-canceled',
    moveViewportInputModeOnDragCanceled
  )
  editorMode.moveViewportInputMode.addEventListener(
    'drag-canceling',
    moveViewportInputModeOnDragCanceling
  )
  editorMode.moveViewportInputMode.addEventListener(
    'drag-finished',
    moveViewportInputModeOnDragFinished
  )
  editorMode.moveViewportInputMode.addEventListener(
    'drag-finishing',
    moveViewportInputModeOnDragFinishing
  )
  editorMode.moveViewportInputMode.addEventListener(
    'drag-started',
    moveViewportInputModeOnDragStarted
  )
  editorMode.moveViewportInputMode.addEventListener(
    'drag-starting',
    moveViewportInputModeOnDragStarting
  )
  editorMode.moveViewportInputMode.addEventListener('dragged', moveViewportInputModeOnDragged)
  editorMode.moveViewportInputMode.addEventListener('dragging', moveViewportInputModeOnDragging)

  viewerMode.moveViewportInputMode.addEventListener(
    'drag-canceled',
    moveViewportInputModeOnDragCanceled
  )
  viewerMode.moveViewportInputMode.addEventListener(
    'drag-canceling',
    moveViewportInputModeOnDragCanceling
  )
  viewerMode.moveViewportInputMode.addEventListener(
    'drag-finished',
    moveViewportInputModeOnDragFinished
  )
  viewerMode.moveViewportInputMode.addEventListener(
    'drag-finishing',
    moveViewportInputModeOnDragFinishing
  )
  viewerMode.moveViewportInputMode.addEventListener(
    'drag-started',
    moveViewportInputModeOnDragStarted
  )
  viewerMode.moveViewportInputMode.addEventListener(
    'drag-starting',
    moveViewportInputModeOnDragStarting
  )
  viewerMode.moveViewportInputMode.addEventListener('dragged', moveViewportInputModeOnDragged)
  viewerMode.moveViewportInputMode.addEventListener('dragging', moveViewportInputModeOnDragging)
}

/**
 * Unregisters events from the move viewport input mode.
 */
function unregisterMoveViewportInputModeEvents(): void {
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-canceled',
    moveViewportInputModeOnDragCanceled
  )
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-canceling',
    moveViewportInputModeOnDragCanceling
  )
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-finished',
    moveViewportInputModeOnDragFinished
  )
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-finishing',
    moveViewportInputModeOnDragFinishing
  )
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-started',
    moveViewportInputModeOnDragStarted
  )
  editorMode.moveViewportInputMode.removeEventListener(
    'drag-starting',
    moveViewportInputModeOnDragStarting
  )
  editorMode.moveViewportInputMode.removeEventListener('dragged', moveViewportInputModeOnDragged)
  editorMode.moveViewportInputMode.removeEventListener('dragging', moveViewportInputModeOnDragging)

  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-canceled',
    moveViewportInputModeOnDragCanceled
  )
  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-canceling',
    moveViewportInputModeOnDragCanceling
  )
  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-finished',
    moveViewportInputModeOnDragFinished
  )
  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-finishing',
    moveViewportInputModeOnDragFinishing
  )
  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-started',
    moveViewportInputModeOnDragStarted
  )
  viewerMode.moveViewportInputMode.removeEventListener(
    'drag-starting',
    moveViewportInputModeOnDragStarting
  )
  viewerMode.moveViewportInputMode.removeEventListener('dragged', moveViewportInputModeOnDragged)
  viewerMode.moveViewportInputMode.removeEventListener('dragging', moveViewportInputModeOnDragging)
}

/**
 * Registers events to the create edge input mode.
 */
function registerCreateEdgeInputModeEvents(): void {
  editorMode.createEdgeInputMode.addEventListener('edge-created', createEdgeInputModeOnEdgeCreated)
  editorMode.createEdgeInputMode.addEventListener(
    'edge-creation-started',
    createEdgeInputModeOnEdgeCreationStarted
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-canceled',
    createEdgeInputModeOnGestureCanceled
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-canceling',
    createEdgeInputModeOnGestureCanceling
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-finished',
    createEdgeInputModeOnGestureFinished
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-finishing',
    createEdgeInputModeOnGestureFinishing
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-started',
    createEdgeInputModeOnGestureStarted
  )
  editorMode.createEdgeInputMode.addEventListener(
    'gesture-starting',
    createEdgeInputModeOnGestureStarting
  )
  editorMode.createEdgeInputMode.addEventListener('moved', createEdgeInputModeOnMoved)
  editorMode.createEdgeInputMode.addEventListener('moving', createEdgeInputModeOnMoving)
  editorMode.createEdgeInputMode.addEventListener('port-added', createEdgeInputModeOnPortAdded)
}

/**
 * Unregisters events from the create edge input mode.
 */
function unregisterCreateEdgeInputModeEvents(): void {
  editorMode.createEdgeInputMode.removeEventListener(
    'edge-created',
    createEdgeInputModeOnEdgeCreated
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'edge-creation-started',
    createEdgeInputModeOnEdgeCreationStarted
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-canceled',
    createEdgeInputModeOnGestureCanceled
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-canceling',
    createEdgeInputModeOnGestureCanceling
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-finished',
    createEdgeInputModeOnGestureFinished
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-finishing',
    createEdgeInputModeOnGestureFinishing
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-started',
    createEdgeInputModeOnGestureStarted
  )
  editorMode.createEdgeInputMode.removeEventListener(
    'gesture-starting',
    createEdgeInputModeOnGestureStarting
  )
  editorMode.createEdgeInputMode.removeEventListener('moved', createEdgeInputModeOnMoved)
  editorMode.createEdgeInputMode.removeEventListener('moving', createEdgeInputModeOnMoving)
  editorMode.createEdgeInputMode.removeEventListener('port-added', createEdgeInputModeOnPortAdded)
}

/**
 * Registers selection events to the graphComponent.
 */
function registerSelectionEvents(): void {
  graphComponent.selection.addEventListener('item-added', onItemSelectionAdded)
  graphComponent.selection.addEventListener('item-removed', onItemSelectionRemoved)
}

/**
 * Unregisters selection events from the graphComponent.
 */
function unregisterSelectionEvents(): void {
  graphComponent.selection.removeEventListener('item-added', onItemSelectionAdded)
  graphComponent.selection.removeEventListener('item-removed', onItemSelectionRemoved)
}

/**
 * Registers event handlers for undo engine events.
 */
function registerUndoEvents(): void {
  const undoEngine = graphComponent.graph.undoEngine!
  undoEngine.addEventListener('property-changed', undoEngineOnPropertyChanged)
  undoEngine.addEventListener('unit-redone', undoEngineOnUnitRedone)
  undoEngine.addEventListener('unit-undone', undoEngineOnUnitUndone)
}

/**
 * Unregisters event handlers for undo engine events.
 */
function unregisterUndoEvents(): void {
  const undoEngine = graphComponent.graph.undoEngine!
  undoEngine.removeEventListener('property-changed', undoEngineOnPropertyChanged)
  undoEngine.removeEventListener('unit-redone', undoEngineOnUnitRedone)
  undoEngine.removeEventListener('unit-undone', undoEngineOnUnitUndone)
}

const eventRegistration: Record<string, () => void> = {
  registerGraphComponentKeyEvents,
  unregisterGraphComponentKeyEvents,
  registerClipboardCopierEvents,
  unregisterClipboardCopierEvents,
  registerGraphComponentPointerEvents,
  unregisterGraphComponentPointerEvents,
  registerGraphComponentRenderEvents,
  unregisterGraphComponentRenderEvents,
  registerGraphComponentViewportEvents,
  unregisterGraphComponentViewportEvents,
  registerNodeEvents,
  unregisterNodeEvents,
  registerEdgeEvents,
  unregisterEdgeEvents,
  registerBendEvents,
  unregisterBendEvents,
  registerPortEvents,
  unregisterPortEvents,
  registerLabelEvents,
  unregisterLabelEvents,
  registerHierarchyEvents,
  unregisterHierarchyEvents,
  registerFoldingEvents,
  unregisterFoldingEvents,
  registerGraphRenderEvents,
  unregisterGraphRenderEvents,
  registerGraphComponentEvents,
  unregisterGraphComponentEvents,
  registerInputModeEvents,
  unregisterInputModeEvents,
  registerMoveInputModeEvents,
  unregisterMoveInputModeEvents,
  registerItemDropInputModeEvents,
  unregisterItemDropInputModeEvents,
  registerEditLabelInputModeEvents,
  unregisterEditLabelInputModeEvents,
  registerItemHoverInputModeEvents,
  unregisterItemHoverInputModeEvents,
  registerCreateBendInputModeEvents,
  unregisterCreateBendInputModeEvents,
  registerContextMenuInputModeEvents,
  unregisterContextMenuInputModeEvents,
  registerTextEditorInputModeEvents,
  unregisterTextEditorInputModeEvents,
  registerTooltipInputModeEvents,
  unregisterToolTipInputModeEvents,
  registerNavigationInputModeEvents,
  unregisterNavigationInputModeEvents,
  registerClickInputModeEvents,
  unregisterClickInputModeEvents,
  registerHandleInputModeEvents,
  unregisterHandleInputModeEvents,
  registerMoveViewportInputModeEvents,
  unregisterMoveViewportInputModeEvents,
  registerCreateEdgeInputModeEvents,
  unregisterCreateEdgeInputModeEvents,
  registerSelectionEvents,
  unregisterSelectionEvents,
  registerUndoEvents,
  unregisterUndoEvents
}

/**
 * Invoked when the display has to be invalidated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onDisplaysInvalidated(args: EventArgs, sender: IGraph): void {
  log(sender, 'Displays Invalidated')
}

/**
 * Invoked when the port of an edge changes.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onEdgePortsChanged(args: EdgeEventArgs, sender: IGraph): void {
  logWithType(sender, `Edge Ports Changed: ${args.item}`, 'EdgePortsChanged')
}

/**
 * Invoked when the style of an edge changes.
 * @param sender The source of the event
 * @param args An object that
 *   contains the event data
 */
function onEdgeStyleChanged(args: ItemChangedEventArgs<IEdge, IEdgeStyle>, sender: IGraph): void {
  logWithType(sender, `Edge Style Changed: ${args.item}`, 'EdgeStyleChanged')
}

/**
 * Invoked when the tag of an edge changes.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onEdgeTagChanged(args: ItemChangedEventArgs<IEdge, any>, sender: IGraph): void {
  logWithType(sender, `Edge Tag Changed: ${args.item}`, 'EdgeTagChanged')
}

/**
 * Invoked when an edge has been created.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onEdgeCreated(args: ItemEventArgs<IEdge>, sender: IGraph): void {
  logWithType(sender, `Edge Created: ${args.item}`, 'EdgeCreated')
}

/**
 * Invoked when an edge has been removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onEdgeRemoved(args: EdgeEventArgs, sender: IGraph): void {
  logWithType(sender, `Edge Removed: ${args.item}`, 'EdgeRemoved')
}

/**
 * Invoked when a label has been added.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onLabelAdded(args: ItemEventArgs<ILabel>, sender: IGraph): void {
  logWithType(sender, `Label Added: ${args.item}`, 'LabelAdded')
}

/**
 * Invoked when a label has been added.
 * @param sender The source of the event
 * @param args An object that contains
 *   the event data
 */
function onLabelPreferredSizeChanged(
  args: ItemChangedEventArgs<ILabel, Size>,
  sender: IGraph
): void {
  logWithType(sender, `Label Preferred Size Changed: ${args.item}`, 'LabelPreferredSizeChanged')
}

/**
 * Invoked when the parameter of a label has changed.
 * @param sender The source of the event
 * @param args An object
 *   that contains the event data
 */
function onLabelLayoutParameterChanged(
  args: ItemChangedEventArgs<ILabel, ILabelModelParameter>,
  sender: IGraph
): void {
  logWithType(sender, `Label Layout Parameter Changed: ${args.item}`, 'LabelLayoutParameterChanged')
}

/**
 * Invoked when the style of a label has changed.
 * @param sender The source of the event
 * @param args An object that
 *   contains the event data
 */
function onLabelStyleChanged(
  args: ItemChangedEventArgs<ILabel, ILabelStyle>,
  sender: IGraph
): void {
  logWithType(sender, `Label Style Changed: ${args.item}`, 'LabelStyleChanged')
}

/**
 * Invoked when the tag of a label has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onLabelTagChanged(args: ItemChangedEventArgs<ILabel, any>, sender: IGraph): void {
  logWithType(sender, `Label Tag Changed: ${args.item}`, 'LabelTagChanged')
}

/**
 * Invoked when the text of a label has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onLabelTextChanged(args: ItemChangedEventArgs<ILabel, string>, sender: IGraph): void {
  logWithType(sender, `Label Text Changed: ${args.item}`, 'LabelTextChanged')
}

/**
 * Invoked when the text of a label has been removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onLabelRemoved(args: LabelEventArgs, sender: IGraph): void {
  logWithType(sender, `Label Removed: ${args.item}`, 'LabelRemoved')
}

/**
 * Invoked when the layout of a node has changed.
 * @param oldLayout the layout of the node before the layout changed
 * @param sender The source of the event
 * @param node The given node
 */
function onNodeLayoutChanged(node: INode, oldLayout: Rect, sender: IGraph): void {
  logWithType(sender, `Node Layout Changed: ${node}`, 'NodeLayoutChanged')
}

/**
 * Invoked when the style of a node has changed.
 * @param sender The source of the event
 * @param args An object that
 *   contains the event data
 */
function onNodeStyleChanged(args: ItemChangedEventArgs<INode, INodeStyle>, sender: IGraph): void {
  logWithType(sender, `Node Style Changed: ${args.item}`, 'NodeStyleChanged')
}

/**
 * Invoked when the tag of a node has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onNodeTagChanged(args: ItemChangedEventArgs<INode, any>, sender: IGraph): void {
  logWithType(sender, `Node Tag Changed: ${args.item}`, 'NodeTagChanged')
}

/**
 * Invoked when a node has been created.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onNodeCreated(args: ItemEventArgs<INode>, sender: IGraph): void {
  logWithType(sender, `Node Created: ${args.item}`, 'NodeCreated')
}

/**
 * Invoked when a node has been removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onNodeRemoved(args: NodeEventArgs, sender: IGraph): void {
  logWithType(sender, `Node Removed: ${args.item}`, 'NodeRemoved')
}

/**
 * Invoked when a port has been added.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onPortAdded(args: ItemEventArgs<IPort>, sender: IGraph): void {
  logWithType(sender, `Port Added: ${args.item}`, 'PortAdded')
}

/**
 * Invoked when the location parameter of a port has changed.
 * @param sender The source of the event
 * @param args An
 *   object that contains the event data
 */
function onPortLocationParameterChanged(
  args: ItemChangedEventArgs<IPort, IPortLocationModelParameter>,
  sender: IGraph
): void {
  logWithType(
    sender,
    `Port Location Parameter Changed: ${args.item}`,
    'PortLocationParameterChanged'
  )
}

/**
 * Invoked when the style of a port has changed.
 * @param sender The source of the event
 * @param args An object that
 *   contains the event data
 */
function onPortStyleChanged(args: ItemChangedEventArgs<IPort, IPortStyle>, sender: IGraph): void {
  logWithType(sender, `Port Style Changed: ${args.item}`, 'PortStyleChanged')
}

/**
 * Invoked when the tag of a port has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onPortTagChanged(args: ItemChangedEventArgs<IPort, any>, sender: IGraph): void {
  logWithType(sender, `Port Tag Changed: ${args.item}`, 'PortTagChanged')
}

/**
 * Invoked when a port has been removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onPortRemoved(args: PortEventArgs, sender: IGraph): void {
  logWithType(sender, `Port Removed: ${args.item}`, 'PortRemoved')
}

/**
 * Invoked when a bend has been added.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onBendAdded(args: ItemEventArgs<IBend>, sender: IGraph): void {
  logWithType(sender, `Bend Added: ${args.item}`, 'BendAdded')
}

/**
 * Invoked when the location of a bend has changed.
 * @param sender The source of the event
 * @param bend The bend whose location has changed
 * @param oldLocation The location of the bend before the change
 */
function onBendLocationChanged(bend: IBend, oldLocation: Point, sender: IGraph): void {
  logWithType(sender, `Bend Location Changed: ${bend}`, 'BendLocationChanged')
}

/**
 * Invoked when the tag of a bend has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onBendTagChanged(args: ItemChangedEventArgs<IBend, any>, sender: IGraph): void {
  logWithType(sender, `Bend Tag Changed: ${args.item}`, 'BendTagChanged')
}

/**
 * Invoked when a bend has been removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onBendRemoved(args: BendEventArgs, sender: IGraph): void {
  logWithType(sender, `Bend Removed: ${args.item}`, 'BendRemoved')
}

/**
 * Invoked when the parent of a node has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onParentChanged(args: NodeEventArgs, sender: IGraph): void {
  logWithType(
    sender,
    `Parent Changed: ${args.parent} -> ${graphComponent.graph.getParent(args.item)}`,
    'ParentChanged'
  )
}

/**
 * Invoked when the group node status of a node has changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onIsGroupNodeChanged(args: NodeEventArgs, sender: IGraph): void {
  logWithType(sender, `Group State Changed: ${args.isGroupNode}`, 'IsGroupNodeChanged')
}

/**
 * Invoked when a group has been collapsed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onGroupCollapsed(args: ItemEventArgs<INode>, sender: IFoldingView): void {
  logWithType(sender, `Group Collapsed: ${args.item}`, 'GroupCollapsed')
}

/**
 * Invoked when a group has been expanded.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onGroupExpanded(args: ItemEventArgs<INode>, sender: IFoldingView): void {
  logWithType(sender, `Group Expanded: ${args.item}`, 'GroupExpanded')
}

/**
 * Invoked when a property has changed.
 * @param args An object that contains the event data
 * @param view The source of the event
 */
function onPropertyChanged(args: PropertyChangedEventArgs, view: IFoldingView): void {
  logWithType(view, `Property Changed: ${args.propertyName}`, 'PropertyChanged')
}

/**
 * Invoked when the entire graph has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnGraphCopiedToClipboard(
  args: ItemCopiedEventArgs<IGraph>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Copied to Clipboard')
}

/**
 * Invoked when a node has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnNodeCopiedToClipboard(
  args: ItemCopiedEventArgs<INode>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when an edge has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnEdgeCopiedToClipboard(
  args: ItemCopiedEventArgs<IEdge>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a port has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnPortCopiedToClipboard(
  args: ItemCopiedEventArgs<IPort>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a label has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnLabelCopiedToClipboard(
  args: ItemCopiedEventArgs<ILabel>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a style has been copied to clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnObjectCopiedToClipboard(
  args: ItemCopiedEventArgs<any>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Object Copied to Clipboard')
}

/**
 * Invoked when the entire graph has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnGraphCopiedFromClipboard(
  args: ItemCopiedEventArgs<IGraph>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Copied From Clipboard')
}

/**
 * Invoked when a node has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnNodeCopiedFromClipboard(
  args: ItemCopiedEventArgs<INode>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when an edge has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnEdgeCopiedFromClipboard(
  args: ItemCopiedEventArgs<IEdge>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a port has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnPortCopiedFromClipboard(
  args: ItemCopiedEventArgs<IPort>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a label has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnLabelCopiedFromClipboard(
  args: ItemCopiedEventArgs<ILabel>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Copied to Clipboard')
}

/**
 * Invoked when a style has been copied from clipboard.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnObjectCopiedFromClipboard(
  args: ItemCopiedEventArgs<any>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Object Copied From Clipboard')
}

/**
 * Invoked when the entire graph has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnGraphDuplicated(
  args: ItemCopiedEventArgs<IGraph>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Duplicated')
}

/**
 * Invoked when a node has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnNodeDuplicated(
  args: ItemCopiedEventArgs<INode>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Duplicated')
}

/**
 * Invoked when an edge has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnEdgeDuplicated(
  args: ItemCopiedEventArgs<IEdge>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Duplicated')
}

/**
 * Invoked when a port has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnPortDuplicated(
  args: ItemCopiedEventArgs<IPort>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Duplicated')
}

/**
 * Invoked when a label has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnLabelDuplicated(
  args: ItemCopiedEventArgs<ILabel>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Graph Item Duplicated')
}

/**
 * Invoked when a style has been duplicated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clipboardOnObjectDuplicated(
  args: ItemCopiedEventArgs<ILabel>,
  sender: ClipboardGraphCopier
): void {
  log(sender, 'Object Duplicated')
}

/**
 * Invoked before a clipboard copy operation starts.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsCopying(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Copying')
}

/**
 * Invoked after a clipboard copy operation has finished.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsCopied(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Copied')
}

/**
 * Invoked before a clipboard cut operation starts.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsCutting(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Cutting')
}

/**
 * Invoked after a clipboard cut operation has finished.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsCut(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Cut')
}

/**
 * Invoked before a clipboard paste operation starts.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsPasting(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Pasting')
}

/**
 * Invoked after a clipboard paste operation has finished.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsPasted(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Pasted')
}

/**
 * Invoked before a clipboard duplicate operation starts.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsDuplicating(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Duplicating')
}

/**
 * Invoked after a clipboard duplicate operation has finished.
 * @param args An object that contains the event data.
 * @param sender The {@link GraphClipboard} instance that is the source of the event.
 */
function clipboardOnItemsDuplicated(args: GraphClipboardEventArgs, sender: GraphClipboard): void {
  log(sender, 'Items Duplicated')
}

/**
 * Invoked when the currentItem property has changed its value
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnCurrentItemChanged(
  args: PropertyChangedEventArgs,
  sender: GraphComponent
): void {
  log(sender, 'GraphComponent CurrentItemChanged')
}

/**
 * Invoked when keys are being pressed, i.e. keydown.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnKeyDown(args: KeyEventArgs, sender: GraphComponent): void {
  const modifierText = getModifierText(args)
  logWithType(
    sender,
    `GraphComponent KeyDown: ${args.key}${modifierText.length > 0 ? ` (modifiers: ${modifierText})` : ''}`,
    'GraphComponentKeyDown'
  )
}

/**
 * Invoked when keys are being released, i.e. keyup.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnKeyUp(args: KeyEventArgs, sender: GraphComponent): void {
  const modifierText = getModifierText(args)
  logWithType(
    sender,
    `GraphComponent KeyUp: ${args.key}${modifierText.length > 0 ? ` (modifiers: ${modifierText})` : ''}`,
    'GraphComponentKeyUp'
  )
}

/**
 * Invoked when the user clicked the pointer.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerClick(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, `GraphComponent PointerClick, clicks: ${args.clickCount}`)
}

/**
 * Invoked when the pointer is being moved while at least one of the pointer buttons is pressed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerDrag(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerDrag')
}

/**
 * Invoked when the pointer has entered the canvas.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerEnter(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerEnter')
}

/**
 * Invoked when the pointer has exited the canvas.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerLeave(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerLeave')
}

/**
 * Invoked when the pointer capture has been lost.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerLostCapture(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerLostCapture')
}

/**
 * Invoked when the pointer has been moved in world coordinates.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerMove(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerMove')
}

/**
 * Invoked when a pointer button has been pressed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerDown(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerDown')
}

/**
 * Invoked when the pointer button has been released.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerUp(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerUp')
}

/**
 * Invoked when the pointer input has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerCancel(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent PointerCancel')
}

/**
 * Invoked when the mouse wheel has turned.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnMouseWheelTurned(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent MouseWheelTurned')
}

/**
 * Invoked when a long press gesture has been performed with a touch pointer.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerLongPress(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent LongPress')
}

/**
 * Invoked when a long press gesture has been performed with a touch pointer.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPointerLongRest(args: PointerEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent LongRest')
}

/**
 * Invoked before the visual tree is painted.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnPrepareRenderContext(
  args: PrepareRenderContextEventArgs,
  sender: GraphComponent
): void {
  log(sender, 'GraphComponent PrepareRenderContext')
}

/**
 * Invoked after the visual tree has been updated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnUpdatedVisual(args: EventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent UpdatedVisual')
}

/**
 * Invoked before the visual tree is updated.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnUpdatingVisual(args: EventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent UpdatingVisual')
}

/**
 * Invoked when the viewport property has been changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnViewportChanged(args: PropertyChangedEventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent ViewportChanged')
}

/**
 * Invoked when the value of the zoom property has been changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function componentOnZoomChanged(args: EventArgs, sender: GraphComponent): void {
  log(sender, 'GraphComponent ZoomChanged')
}

/**
 * Invoked when the empty canvas area has been clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnCanvasClicked(args: ClickEventArgs, sender: GraphEditorInputMode): void {
  log(sender, 'GraphEditorInputMode CanvasClicked')
}

/**
 * Invoked when an item has been deleted interactively by this mode.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnDeletedItem(
  args: InputModeItemEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode DeletedItem')
}

/**
 * Invoked just before the deleteSelection method has deleted the selection after all selected items have been
 * removed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnDeletedSelection(args: ItemsEventArgs, sender: GraphEditorInputMode): void {
  log(sender, 'GraphEditorInputMode DeletedSelection')
}

/**
 * Invoked just before the deleteSelection method starts its work and will be followed by any number of DeletedItem
 * events and finalized by a DeletedSelection event.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnDeletingSelection(
  args: SelectionEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode DeletingSelection')
}

/**
 * Invoked when an item has been clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, `GraphEditorInputMode ItemClicked ${args.handled ? '(Handled)' : '(Unhandled)'}`)
}

/**
 * Invoked when an item has been double clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, `GraphEditorInputMode ItemDoubleClicked${args.handled ? '(Handled)' : '(Unhandled)'}`)
}

/**
 * Invoked when an item has been left-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemLeftClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, `GraphEditorInputMode ItemLeftClicked${args.handled ? '(Handled)' : '(Unhandled)'}`)
}

/**
 * Invoked when an item has been left double-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemLeftDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(
    sender,
    `GraphEditorInputMode ItemLeftDoubleClicked${args.handled ? '(Handled)' : '(Unhandled)'}`
  )
}

/**
 * Invoked when an item has been right clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemRightClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, `GraphEditorInputMode ItemRightClicked${args.handled ? '(Handled)' : '(Unhandled)'}`)
}

/**
 * Invoked when an item has been right double-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnItemRightDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(
    sender,
    `GraphEditorInputMode ItemRightDoubleClicked${args.handled ? '(Handled)' : '(Unhandled)'}`
  )
}

/**
 * Invoked when a label has been added.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnLabelAdded(
  args: InputModeItemEventArgs<ILabel>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode LabelAdded')
}

/**
 * Invoked when the label text has been changed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnLabelEdited(
  args: InputModeItemEventArgs<ILabel>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode LabelEdited')
}

/**
 * Invoked when a single or multi select operation has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnMultiSelectionFinished(
  args: SelectionEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode MultiSelectionFinished')
}

/**
 * Invoked when a single or multi select operation has been started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnMultiSelectionStarted(
  args: SelectionEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode MultiSelectionStarted')
}

/**
 * Invoked when this mode has created a node in response to user interaction.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnNodeCreated(
  args: InputModeItemEventArgs<INode>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode NodeCreated')
}

/**
 * Invoked when a node has been reparented interactively.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnNodeReparented(
  args: InputModeItemChangedEventArgs<INode, NodeEventArgs>,
  sender: GraphEditorInputMode
): void {
  log(sender, 'GraphEditorInputMode NodeReparented')
}

/**
 * Invoked after an edge's source and/or target ports have been changed as the result of an input gesture.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function geimOnEdgePortsChanged(
  args: InputModeItemChangedEventArgs<IEdge, EdgeEventArgs>,
  sender: GraphEditorInputMode
): void {
  const edge = args.item
  log(
    sender,
    `GraphEditorInputMode Edge ${edge} Ports Changed to ${edge.sourcePort}->${edge.targetPort}`
  )
}

/**
 * Invoked when the context menu over an item is about to be opened to determine the contents of the Menu.
 * @param sender The source of the event
 * @param args An object that contains the
 *   event data
 */
function geimOnPopulateItemContextMenu(
  args: PopulateItemContextMenuEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(
    sender,
    `GraphEditorInputMode PopulateItemContextMenu${args.handled ? '(Handled)' : '(Unhandled)'}`
  )
}

/**
 * Invoked when the pointer is hovering over an item to determine the tool tip to display.
 * @param sender The source of the event
 * @param args An object that contains the event
 *   data
 */
function geimOnQueryItemToolTip(
  args: QueryItemToolTipEventArgs<IModelItem>,
  sender: GraphEditorInputMode
): void {
  log(sender, `GraphEditorInputMode QueryItemToolTip${args.handled ? '(Handled)' : '(Unhandled)'}`)
}

/**
 * Invoked when the empty canvas area has been clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnCanvasClicked(args: ClickEventArgs, sender: GraphViewerInputMode): void {
  log(sender, 'GraphViewerInputMode CanvasClicked')
}

/**
 * Invoked when an item has been clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemClicked')
}

/**
 * Invoked when an item has been double-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemDoubleClicked')
}

/**
 * Invoked when an item has been left-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemLeftClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemLeftClicked')
}

/**
 * Invoked when an item has been left double-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemLeftDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemLeftDoubleClicked')
}

/**
 * Invoked when an item has been right-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemRightClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemRightClicked')
}

/**
 * Invoked when an item has been right double-clicked.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnItemRightDoubleClicked(
  args: ItemClickedEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode ItemRightDoubleClicked')
}

/**
 * Invoked when a single or multi select operation has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnMultiSelectionFinished(
  args: SelectionEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode MultiSelectionFinished')
}

/**
 * Invoked when a single or multi select operation has been started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function gvimOnMultiSelectionStarted(
  args: SelectionEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode MultiSelectionStarted')
}

/**
 * Invoked when the context menu over an item is about to be opened to determine the contents of the Menu.
 * @param sender The source of the event
 * @param args An object that contains the
 *   event data
 */
function gvimOnPopulateItemContextMenu(
  args: PopulateItemContextMenuEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode PopulateItemContextMenu')
}

/**
 * Invoked when the pointer is hovering over an item to determine the tool tip to display.
 * @param sender The source of the event
 * @param args An object that contains the event
 *   data
 */
function gvimOnQueryItemToolTip(
  args: QueryItemToolTipEventArgs<IModelItem>,
  sender: GraphViewerInputMode
): void {
  log(sender, 'GraphViewerInputMode QueryItemToolTip')
}

/**
 * Invoked when the drag has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragCanceled(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode DragCanceled', 'DragCanceled')
}

/**
 * Invoked before the drag will be canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragCanceling(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode DragCanceling', 'DragCanceling')
}

/**
 * Invoked once the drag has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragFinished(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode DragFinished', 'DragFinished')
}

/**
 * Invoked before the drag will be finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragFinishing(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, `MoveInputMode DragFinishing${getAffectedItems(sender)}`, 'DragFinishing')
}

/**
 * Invoked at the end of every drag.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragged(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode Dragged', 'Dragged')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragging(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode Dragging', 'Dragging')
}

/**
 * Invoked once the drag is initialized and has started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragStarted(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, `MoveInputMode DragStarted${getAffectedItems(sender)}`, 'DragStarted')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnDragStarting(args: InputModeEventArgs, sender: MoveInputMode): void {
  logWithType(sender, 'MoveInputMode DragStarting', 'DragStarting')
}

/**
 * Invoked when a drag is recognized for MoveInputMode.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveInputModeOnQueryPositionHandler(
  args: QueryPositionHandlerEventArgs,
  sender: MoveInputMode
): void {
  log(sender, 'MoveInputMode QueryPositionHandler')
}

/**
 * Invoked when the drag operation is dropped.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemInputModeOnDragDropped(args: InputModeEventArgs, sender: DropInputMode): void {
  logWithType(sender, `${getDropInputModeName(sender)} DragDropped`, 'DragDropped')
}

/**
 * Invoked when the drag operation enters the CanvasComponent.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemInputModeOnDragEntered(args: InputModeEventArgs, sender: DropInputMode): void {
  logWithType(sender, `${getDropInputModeName(sender)} DragEntered`, 'DragEntered')
}

/**
 * Invoked when the drag operation leaves the CanvasComponent.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemInputModeOnDragLeft(args: InputModeEventArgs, sender: DropInputMode): void {
  logWithType(sender, `${getDropInputModeName(sender)} DragLeft`, 'DragLeft')
}

/**
 * Invoked when the drag operation drags over the CanvasComponent.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemInputModeOnDragOver(args: InputModeEventArgs, sender: DropInputMode): void {
  logWithType(sender, `${getDropInputModeName(sender)} DragOver`, 'DragOver')
}

/**
 * Invoked when a new item gets created by the drag operation.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemInputModeOnItemCreated(
  args: InputModeItemEventArgs<any>,
  sender: DropInputMode
): void {
  logWithType(sender, `${getDropInputModeName(sender)} ItemCreated`, 'ItemCreated')
}

function getDropInputModeName(sender: DropInputMode): string {
  if (sender instanceof LabelDropInputMode) {
    return 'LabelDropInputMode'
  }
  return 'NodeDropInputMode'
}

/**
 * Invoked when the item that is being hovered over with the pointer changes.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function itemHoverInputModeOnHoveredItemChanged(
  args: HoveredItemChangedEventArgs,
  sender: ItemHoverInputMode
): void {
  logWithType(
    sender,
    `HoverInputMode Item changed from ${args.oldItem} to ${
      args.item !== null ? args.item.toString() : 'null'
    }`,
    'HoveredItemChanged'
  )
}

/**
 * Invoked once a bend creation gesture has been recognized.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createBendInputModeOnBendCreated(
  args: InputModeItemEventArgs<IBend>,
  sender: CreateBendInputMode
): void {
  log(sender, 'CreateBendInputMode Bend Created')
}

/**
 * Invoked when the drag on a bend has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createBendInputModeOnDragCanceled(
  args: InputModeEventArgs,
  sender: CreateBendInputMode
): void {
  logWithType(sender, 'CreateBendInputMode DragCanceled', 'DragCanceled')
}

/**
 * Invoked at the end of every drag on a bend.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createBendInputModeOnDragged(args: InputModeEventArgs, sender: CreateBendInputMode): void {
  logWithType(sender, 'CreateBendInputMode Dragged', 'Dragged')
}

/**
 * Invoked once the drag on a bend is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createBendInputModeOnDragging(
  args: InputModeEventArgs,
  sender: CreateBendInputMode
): void {
  logWithType(sender, 'CreateBendInputMode Dragging', 'Dragging')
}

/**
 * Invoked when the context menu is about to be shown.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function contextMenuInputModeOnPopulateMenu(
  args: PopulateContextMenuEventArgs,
  sender: ContextMenuInputMode
): void {
  log(sender, 'ContextMenuInputMode Populate Context Menu')
}

/**
 * Invoked if the editing has not been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function textEditorInputModeOnEditingCanceled(
  args: TextEventArgs,
  sender: TextEditorInputMode
): void {
  log(sender, 'TextEditorInputMode Editing Canceled')
}

/**
 * Invoked if the editing when text editing is started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function textEditorInputModeOnEditingStarted(
  args: TextEventArgs,
  sender: TextEditorInputMode
): void {
  log(sender, 'TextEditorInputMode Editing Started')
}

/**
 * Invoked once the text has been edited.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function textEditorInputModeOnTextEdited(args: TextEventArgs, sender: TextEditorInputMode): void {
  log(sender, 'TextEditorInputMode Text Edited')
}

/**
 * Invoked when this mode queries the tool tip for a certain query location.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function toolTipInputModeOnQueryToolTip(
  args: QueryToolTipEventArgs,
  sender: ToolTipInputMode
): void {
  log(sender, 'TooltipInputMode QueryToolTip')
}

/**
 * Invoked once a click has been detected.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function clickInputModeOnClicked(args: ClickEventArgs, sender: ClickInputMode): void {
  let modifierText = getModifierText(args)
  const details = `buttons: ${PointerButtons[args.pointerButtons]}, clicks: ${args.clickCount}${modifierText.length > 0 ? `, modifiers: ${modifierText})` : ''}`
  log(sender, `ClickInputMode Clicked (${details})`)
}

/**
 * Invoked when the drag has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragCanceled(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode DragCanceled', 'DragCanceled')
}

/**
 * Invoked before the drag will be canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragCanceling(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode DragCanceling', 'DragCanceling')
}

/**
 * Invoked once the drag has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragFinished(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode DragFinished', 'DragFinished')
}

/**
 * Invoked before the drag will be finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragFinishing(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, `HandleInputMode DragFinishing${getAffectedItems(sender)}`, 'DragFinishing')
}

/**
 * Invoked at the end of every drag.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragged(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode Dragged', 'Dragged')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragging(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode Dragging', 'Dragging')
}

/**
 * Invoked once the drag is initialized and has started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragStarted(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, `HandleInputMode DragStarted${getAffectedItems(sender)}`, 'DragStarted')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function handleInputModeOnDragStarting(args: InputModeEventArgs, sender: HandleInputMode): void {
  logWithType(sender, 'HandleInputMode DragStarting', 'DragStarting')
}

/**
 * Invoked when the drag has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragCanceled(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode DragCanceled', 'DragCanceled')
}

/**
 * Invoked before the drag will be canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragCanceling(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode DragCanceling', 'DragCanceling')
}

/**
 * Invoked once the drag has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragFinished(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode DragFinished', 'DragFinished')
}

/**
 * Invoked before the drag will be finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragFinishing(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, `MoveViewportInputMode DragFinishing`, 'DragFinishing')
}

/**
 * Invoked at the end of every drag.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragged(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode Dragged', 'Dragged')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragging(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode Dragging', 'Dragging')
}

/**
 * Invoked once the drag is initialized and has started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragStarted(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, `MoveViewportInputMode DragStarted`, 'DragStarted')
}

/**
 * Invoked once the drag is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function moveViewportInputModeOnDragStarting(
  args: InputModeEventArgs,
  sender: MoveViewportInputMode
): void {
  logWithType(sender, 'MoveViewportInputMode DragStarting', 'DragStarting')
}

/**
 * Invoked whenever a group has been collapsed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupCollapsed(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Collapsed: ${args.item}`, 'GroupCollapsed')
}

/**
 * Invoked before a group will be collapsed.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupCollapsing(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Collapsing: ${args.item}`, 'Group Collapsing')
}

/**
 * Invoked whenever a group has been entered.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupEntered(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Entered: ${args.item}`, 'Group Entered')
}

/**
 * Invoked before a group will be entered.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupEntering(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Entering: ${args.item}`, 'Group Entering')
}

/**
 * Invoked whenever a group has been exited.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupExited(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Exited: ${args.item}`, 'Group Exited')
}

/**
 * Invoked before a group will be exited.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupExiting(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Exiting: ${args.item}`, 'Group Exiting')
}

/**
 * Invoked when a group has been expanded.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupExpanded(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Expanded: ${args.item}`, 'Group Expanded')
}

/**
 * Invoked before a group has been expanded.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function navigationInputModeOnGroupExpanding(
  args: InputModeItemEventArgs<INode>,
  sender: NavigationInputMode
): void {
  logWithType(sender, `NavigationInputMode Group Expanding: ${args.item}`, 'Group Expanding')
}

/**
 * Invoked after an edge has been created by this mode.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnEdgeCreated(
  args: InputModeItemEventArgs<IEdge>,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Edge Created')
}

/**
 * Invoked when the edge creation has started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnEdgeCreationStarted(
  args: InputModeItemEventArgs<IEdge>,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Edge Creation Started')
}

/**
 * Invoked when the edge creation gesture has been canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureCanceled(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Canceled')
}

/**
 * Invoked before the gesture will be canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureCanceling(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Canceling')
}

/**
 * Invoked once the gesture has been finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureFinished(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Finished')
}

/**
 * Invoked before the gesture will be finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureFinishing(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Finishing')
}

/**
 * Invoked once the gesture is initialized and has started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureStarted(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Started')
}

/**
 * Invoked once the gesture is starting.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnGestureStarting(
  args: InputModeEventArgs,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Gesture Starting')
}

/**
 * Invoked at the end of every drag or move.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnMoved(args: InputModeEventArgs, sender: CreateEdgeInputMode): void {
  log(sender, 'CreateEdgeInputMode Moved')
}

/**
 * Invoked at the start of every drag or move.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnMoving(args: InputModeEventArgs, sender: CreateEdgeInputMode): void {
  log(sender, 'CreateEdgeInputMode Moving')
}

/**
 * Invoked when this instance adds a port to the source or target node during completion of the edge creation gesture.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function createEdgeInputModeOnPortAdded(
  args: InputModeItemEventArgs<IPort>,
  sender: CreateEdgeInputMode
): void {
  log(sender, 'CreateEdgeInputMode Port Added')
}

/**
 * Invoked when an item changed its selection state from selected to unselected or vice versa.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onItemSelectionAdded(args: ItemEventArgs<any>, sender: IGraphSelection): void {
  log(sender, 'GraphComponent Item Selection Added')
}

/**
 * Invoked when an item changed its selection state from selected to unselected or vice versa.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function onItemSelectionRemoved(args: ItemEventArgs<any>, sender: IGraphSelection): void {
  log(sender, 'GraphComponent Item Selection Removed')
}

/**
 * Invoked when a adding a new label is finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeLabelAdded(
  args: InputModeItemEventArgs<ILabel>,
  sender: EditLabelInputMode
): void {
  log(sender, 'Label Added')
}

/**
 * Invoked when a removing a label is finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeLabelDeleted(
  args: InputModeItemChangedEventArgs<ILabel, EventArgs>,
  sender: EditLabelInputMode
): void {
  log(sender, 'Label Deleted')
}

/**
 * Invoked when the label editing process is finished.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeLabelEdited(
  args: InputModeItemEventArgs<ILabel>,
  sender: EditLabelInputMode
): void {
  log(sender, 'Label Edited')
}

/**
 * Invoked when the label editing process is canceled.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeLabelEditingCanceled(
  args: InputModeItemEventArgs<ILabel>,
  sender: EditLabelInputMode
): void {
  log(sender, 'Label Text Editing Canceled')
}

/**
 * Invoked when the label editing process is started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeLabelEditingStarted(
  args: InputModeItemEventArgs<ILabel>,
  sender: EditLabelInputMode
): void {
  log(sender, 'Label Text Editing Started')
}

/**
 * Invoked when a label is about to be added.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeOnQueryLabelAdding(
  args: LabelEditingEventArgs,
  sender: EditLabelInputMode
): void {
  log(sender, 'Query Label Adding')
}

/**
 * Invoked when the label editing process is about to be started.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeOnQueryLabelEditing(
  args: LabelEditingEventArgs,
  sender: EditLabelInputMode
): void {
  log(sender, 'Query Label Editing')
}

/**
 * Invoked when a label that is about to be added or edited.
 * @param sender The source of the event
 * @param args An object that contains the event data
 */
function editLabelInputModeOnQueryValidateLabelText(
  args: LabelTextValidatingEventArgs,
  sender: EditLabelInputMode
): void {
  log(sender, 'Validate Label Text')
}

/**
 * Invoked when the value of the {@link UndoEngine.canUndo}, {@link UndoEngine.canRedo},
 * {@link UndoEngine.undoName}, {@link UndoEngine.redoName}, or {@link UndoEngine.token}
 * property changes.
 * @param args An object that contains the name of the changed property.
 * @param sender The {@link UndoEngine} instance that is the source of the event.
 */
function undoEngineOnPropertyChanged(args: PropertyChangedEventArgs, sender: UndoEngine): void {
  log(sender, `UndoEngine Property Changed: ${args.propertyName}`)
}

/**
 * Invoked when the undo engine undoes an edit in its queue.
 * @param args An empty object without further data.
 * @param sender The {@link UndoEngine} instance that is the source of the event.
 */
function undoEngineOnUnitUndone(args: EventArgs, sender: UndoEngine): void {
  log(sender, 'Undo performed')
}

/**
 * Invoked when the undo engine redoes a previously undone edit.
 * @param args An empty object without further data.
 * @param sender The {@link UndoEngine} instance that is the source of the event.
 */
function undoEngineOnUnitRedone(args: EventArgs, sender: UndoEngine): void {
  log(sender, 'Redo performed')
}

function getModifierText(args: ClickEventArgs | KeyEventArgs): string {
  return args.modifiers !== 0
    ? `${args.shiftKey ? ' Shift' : ''}${args.ctrlKey ? ' Control' : ''}${args.altKey ? ' Alt' : ''}${args.metaKey ? ' Meta' : ''}`
    : ''
}

function clearButtonClick(): any {
  eventView.clear()
}

/**
 * Creates the log message without type.
 * @param sender The source of the event
 * @param message The given message
 */
function log(sender: object, message: any): void {
  logWithType(sender, message, null)
}

/**
 * Creates the log message with the given type.
 * @param sender The source of the event
 * @param message The given message
 * @param type The type of the event
 */
function logWithType(sender: object, message: string, type: string | null): void {
  if (!type) {
    type = message
  }

  let category = 'Unknown'
  if (sender instanceof IInputMode) {
    category = 'InputMode'
  } else if (sender instanceof CanvasComponent || sender instanceof GraphClipboard) {
    category = 'GraphComponent'
  } else if (
    sender instanceof IModelItem ||
    sender instanceof IGraph ||
    sender instanceof IFoldingView ||
    sender instanceof UndoEngine
  ) {
    category = 'Graph'
  }

  eventView.addMessage(message, type, category)
}

function initializeGraphComponent(): void {
  graphComponent = new GraphComponent('graphComponent')
}

function initializeInputModes(): void {
  editorMode = new GraphEditorInputMode()
  editorMode.itemHoverInputMode.hoverItems = GraphItemTypes.ALL
  editorMode.nodeDropInputMode.enabled = true
  editorMode.labelDropInputMode.enabled = true
  editorMode.labelDropInputMode.useLocationForParameter = true
  // initially, we want to disable editing orthogonal edges altogether
  editorMode.orthogonalEdgeEditingContext.enabled = false

  editorMode.contextMenuInputMode.addEventListener('populate-menu', (evt) => {
    evt.contextMenu = [
      {
        label: 'Context Menu Action',
        action: () => log(editorMode.contextMenuInputMode, 'Context Menu Item Action')
      }
    ]
  })

  viewerMode = new GraphViewerInputMode()
  viewerMode.itemHoverInputMode.hoverItems = GraphItemTypes.ALL

  graphComponent.inputMode = editorMode

  // use two finger panning to allow easier editing with touch gestures
  configureTwoPointerPanning(graphComponent)
}

function initializeGraph(): void {
  const graph = graphComponent.graph
  initDemoStyles(graph, { foldingEnabled: true, orthogonalEditing: true })
  graph.nodeDefaults.size = new Size(60, 40)
  graph.edgeDefaults.labels.style = new LabelStyle({
    backgroundFill: 'white',
    padding: [3, 5, 3, 5]
  })
}

function initializeDragAndDropPanel(): void {
  const panel = document.getElementById('drag-and-drop-panel')!
  panel.appendChild(createDraggableNode())
  panel.appendChild(createDraggableLabel())
}

function createDraggableNode(): HTMLElement {
  // create the node visual
  const exportComponent = new GraphComponent()
  exportComponent.graph.createNode(new Rect(0, 0, 30, 30), graphComponent.graph.nodeDefaults.style)
  exportComponent.updateContentBounds()
  const svgExport = new SvgExport(exportComponent.contentBounds)
  const dataUrl = SvgExport.encodeSvgDataUrl(
    SvgExport.exportSvgString(svgExport.exportSvg(exportComponent))
  )
  const div = document.createElement('div')
  div.setAttribute('style', 'width: 30px; height: 30px; margin: 0 10px; touch-action: none;')
  div.setAttribute('title', 'Draggable Node')
  const img = document.createElement('img')
  img.setAttribute('style', 'width: auto; height: auto;')
  img.setAttribute('src', dataUrl)
  div.appendChild(img)

  // register the startDrag listener
  const startDrag = (): void => {
    const simpleNode = new SimpleNode()
    simpleNode.layout = new Rect(0, 0, 30, 30)
    simpleNode.style = graphComponent.graph.nodeDefaults.style.clone()
    const dragPreview = document.createElement('div')
    dragPreview.appendChild(img.cloneNode(true))
    const dragSource = NodeDropInputMode.startDrag(
      div,
      simpleNode,
      DragDropEffects.ALL,
      true,
      dragPreview
    )
    dragSource.addEventListener('query-continue-drag', (evt) => {
      if (evt.dropTarget === null) {
        dragPreview.classList.remove('hidden')
      } else {
        dragPreview.classList.add('hidden')
      }
    })
  }

  img.addEventListener(
    'pointerdown',
    (event) => {
      startDrag()
      event.preventDefault()
    },
    false
  )

  return div
}

function createDraggableLabel(): HTMLDivElement {
  // create the label visual
  const defaultLabelParameter = graphComponent.graph.nodeDefaults.labels.layoutParameter
  const defaultLabelStyle = graphComponent.graph.nodeDefaults.labels.style
  const exportComponent = new GraphComponent()
  const dummyNode = exportComponent.graph.createNode(
    new Rect(0, 0, 30, 30),
    INodeStyle.VOID_NODE_STYLE
  )
  exportComponent.graph.addLabel(dummyNode, 'Label', defaultLabelParameter, defaultLabelStyle)
  exportComponent.contentBounds = new Rect(0, 0, 30, 30)
  const svgExport = new SvgExport(exportComponent.contentBounds)
  const dataUrl = SvgExport.encodeSvgDataUrl(
    SvgExport.exportSvgString(svgExport.exportSvg(exportComponent))
  )
  const div = document.createElement('div')
  div.setAttribute('style', 'width: 30px; height: 30px; margin: 0 10px; touch-action: none;')
  div.setAttribute('title', 'Draggable Label')
  const img = document.createElement('img')
  img.setAttribute('style', 'width: auto; height: auto;')
  img.setAttribute('src', dataUrl)
  div.appendChild(img)

  // register the startDrag listener
  const startDrag = (): void => {
    const simpleNode = new SimpleNode()
    simpleNode.layout = new Rect(0, 0, 40, 40)
    const simpleLabel = new SimpleLabel(simpleNode, 'Label', defaultLabelParameter)
    simpleLabel.preferredSize = defaultLabelStyle.renderer.getPreferredSize(
      simpleLabel,
      defaultLabelStyle
    )
    simpleLabel.style = defaultLabelStyle
    const dragPreview = document.createElement('div')
    dragPreview.appendChild(img.cloneNode(true))
    const dragSource = LabelDropInputMode.startDrag(
      div,
      simpleLabel,
      DragDropEffects.ALL,
      true,
      dragPreview
    )
    dragSource.addEventListener('query-continue-drag', (evt) => {
      if (evt.dropTarget === null) {
        dragPreview.classList.remove('hidden')
      } else {
        dragPreview.classList.add('hidden')
      }
    })
  }

  img.addEventListener(
    'pointerdown',
    (event) => {
      startDrag()
      event.preventDefault()
    },
    false
  )

  return div
}

function setupToolTips(): void {
  editorMode.toolTipItems = GraphItemTypes.NODE
  editorMode.addEventListener('query-item-tool-tip', (evt) => {
    evt.toolTip = `ToolTip for ${evt.item}`
    evt.handled = true
  })

  viewerMode.toolTipItems = GraphItemTypes.NODE
  viewerMode.addEventListener('query-item-tool-tip', (evt) => {
    evt.toolTip = `ToolTip for ${evt.item}`
    evt.handled = true
  })
}

function setupContextMenu(): void {
  editorMode.contextMenuItems = GraphItemTypes.NODE
  editorMode.addEventListener('populate-item-context-menu', (evt) => {
    evt.handled = true
  })

  viewerMode.contextMenuItems = GraphItemTypes.NODE
  viewerMode.addEventListener('populate-item-context-menu', (evt) => {
    evt.handled = true
  })
}

function enableFolding(): void {
  const graph = graphComponent.graph

  // enabled changing ports
  const decorator = graph.decorator.edges.reconnectionPortCandidateProvider
  decorator.addFactory((edge) =>
    IEdgeReconnectionPortCandidateProvider.fromAllNodeAndEdgeCandidates(edge)
  )

  manager = new FoldingManager(graph)
  foldingView = manager.createFoldingView()
  graphComponent.graph = foldingView.graph
}

function enableUndo(): void {
  const defaultGraph = manager.masterGraph
  if (defaultGraph !== null) {
    defaultGraph.undoEngineEnabled = true
  }
}

/**
 * Binds all event-check-boxes to the appropriate functions
 */
function bindEventCheckBoxes() {
  const elements = document.querySelectorAll<HTMLInputElement>("input[data-action='ToggleEvents']")
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]

    element.addEventListener('click', (_: Event) => {
      const eventKind = element.getAttribute('data-event-kind')
      if (eventKind) {
        const enable = element.checked
        const fn = enable
          ? (eventRegistration as any)[`register${eventKind}Events`]
          : (eventRegistration as any)[`unregister${eventKind}Events`]
        if (typeof fn === 'function') {
          fn()
        } else if (typeof window.console !== 'undefined') {
          console.log(`NOT FOUND: ${eventKind}`)
        }
      }
    })
  }
}

function initializeUI(): void {
  bindEventCheckBoxes()

  document.querySelector('#toggle-editing')!.addEventListener('click', () => {
    if (graphComponent.inputMode === editorMode) {
      graphComponent.inputMode = viewerMode
    } else {
      graphComponent.inputMode = editorMode
    }
  })

  const orthogonalEditingButton = document.querySelector<HTMLInputElement>(
    '#demo-orthogonal-editing-button'
  )!
  orthogonalEditingButton.addEventListener('click', () => {
    editorMode.orthogonalEdgeEditingContext!.enabled = orthogonalEditingButton.checked
  })

  document.querySelector('#clear-log-button')!.addEventListener('click', () => clearButtonClick())

  const toggleLogGrouping = document.querySelector<HTMLInputElement>('#toggle-log-grouping')!
  toggleLogGrouping.addEventListener('click', () => {
    eventView.groupEvents = toggleLogGrouping.checked
  })
}

/**
 * The GraphComponent
 */
let graphComponent: GraphComponent

/**
 * Returns the number of affected items as string.
 * @param sender The source of the event
 */
function getAffectedItems(sender: MoveInputMode | HandleInputMode): string {
  let items = sender.affectedItems

  const nodeCount = items.ofType(INode).size
  const edgeCount = items.ofType(IEdge).size
  const bendCount = items.ofType(IBend).size
  const labelCount = items.ofType(ILabel).size
  const portCount = items.ofType(IPort).size
  return (
    `(${items.size} items: ${nodeCount} nodes, ${bendCount} bends, ${edgeCount} edges,` +
    ` ${labelCount} labels, ${portCount} ports)`
  )
}

/**
 * Initialize expand-collapse behavior for option headings.
 */
function initOptionHeadings(): void {
  const optionsHeadings = document.getElementsByClassName('event-options-heading')
  for (let i = 0; i < optionsHeadings.length; i++) {
    const heading = optionsHeadings[i]
    optionsHeadings[i].addEventListener('click', (e) => {
      e.preventDefault()
      const parentNode = heading.parentNode as Element
      const optionsElements = parentNode.getElementsByClassName(
        'event-options-content'
      ) as HTMLCollectionOf<HTMLDivElement>
      if (optionsElements.length > 0) {
        const style = optionsElements[0].style
        if (style.display !== 'none') {
          style.display = 'none'
          heading.className = heading.className.replace('expanded', 'collapsed')
        } else {
          style.display = 'block'
          heading.className = heading.className.replace('collapsed', 'expanded')
        }
      }
      return false
    })
  }

  const headings = document.getElementsByClassName('event-options-heading')
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i]
    heading.addEventListener('click', (evt) => {
      if (evt.target instanceof HTMLDivElement) {
        evt.target.scrollIntoView()
      }
    })
  }
}

run().then(finishLoading)
