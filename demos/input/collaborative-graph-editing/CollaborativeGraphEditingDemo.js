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
  FoldingManager,
  FreeNodeLabelModel,
  GraphBuilder,
  GraphComponent,
  GraphEditorInputMode,
  GraphItemTypes,
  GraphOverviewComponent,
  GraphSnapContext,
  HierarchicalLayout,
  LayoutExecutor,
  License,
  ModifierKeys,
  NodeAlignmentPolicy,
  OrthogonalEdgeEditingContext,
  ShapeNodeStyle,
  SmartEdgeLabelModel,
  TextBoxPlacementPolicy
} from '@yfiles/yfiles'
import { configureTwoPointerPanning } from '@yfiles/demo-utils/configure-two-pointer-panning'
import graphData from './graph-data.json'
import { DemoStyleOverviewRenderer, initDemoStyles } from '@yfiles/demo-app/demo-styles'
import {
  createDemoEdgeStyleDeserializer,
  createDemoNodeStyleDeserializer,
  serializeEdgeStyle,
  serializeNodeStyle
} from './collaborative-style-support'
import { initializePopovers } from './collaborative-popover-support'
import { finishLoading } from '@yfiles/demo-app/modern/finish-loading'
import {
  deserializeLabelModelParameter,
  serializeLabelModelParameter
} from '@yfiles/demo-utils/label-model-serialization'
import licenseData from '../../../lib/license.json'
import { createCollaborationSession } from './collaboration'
import { PEER_COLORS, USER_NAMES } from './demo-users'
import { initializeFollowUserUI } from './follow-user-ui'
import { initializeTimerVisualization } from './reset-timer'
import { showToast } from '@yfiles/demo-app/modern/toast'
import { startTour } from '@yfiles/demo-app/modern/tour'
import { tour } from './tour/tour'

const AUTHOR_STORAGE_KEY = 'collaborative-geim-author'

const collabUrl =
  import.meta.env['VITE_WS_URL'] ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3001`

/**
 * Runs the demo.
 */
async function run() {
  License.value = licenseData

  const editor = initializeGraphEditor()
  const deserializeNodeStyle = createDemoNodeStyleDeserializer(
    editor.masterGraph.nodeDefaults.style
  )
  const deserializeEdgeStyle = createDemoEdgeStyleDeserializer(
    editor.masterGraph.edgeDefaults.style
  )
  const collaborationSession = await createCollaborationSession({
    clientOptions: { serverUrl: collabUrl, roomName: 'collaborative-geim' },
    graphComponent: editor.graphComponent,
    recordAdapterOptions: {
      serializeLabelLayoutParameter: serializeLabelModelParameter,
      deserializeLabelLayoutParameter: deserializeLabelModelParameter,
      serializeNodeStyle: serializeNodeStyle,
      deserializeNodeStyle: deserializeNodeStyle,
      serializeEdgeStyle: serializeEdgeStyle,
      deserializeEdgeStyle: deserializeEdgeStyle
    },
    presenceOptions: { author: authorName(), colorForClient: peerColor },
    layoutOptions: {
      calculateLayout: (graph) => {
        LayoutExecutor.ensure()
        graph.applyLayout(new HierarchicalLayout({ fromSketchMode: true }))
      }
    },
    initialize: ({ synced, graph, collaboration: session }) => {
      // y-websocket keeps the Y.Doc connected through BroadcastChannel even
      // when its websocket is unavailable. In that mode there is no server
      // state to wait for, so an empty document may be seeded locally. The
      // seed is written to the same Y.Doc and will be synchronized normally
      // if the websocket becomes available later.
      const offline = !session.client.provider.wsconnected
      return (synced || offline) && initializeGraphData(session.records, graph)
    }
  })
  setUserNodeDefaultColor(editor.masterGraph, collaborationSession.client.awareness.clientID)
  initializePopovers(editor.graphComponent)
  const disposeFollowUserUI = initializeFollowUserUI({
    component: editor.graphComponent,
    awareness: collaborationSession.client.awareness,
    controller: collaborationSession.presence.viewport.controller,
    colorForClient: peerColor
  })
  initializeHistoryBindings(editor.graphComponent, collaborationSession.collaboration.history)
  initializeUI(editor.graphComponent, collaborationSession.layoutCoordinator.startLayout, () => {
    // A reset replaces the complete shared model. Stop observation first, so
    // graph removal and reconstruction are not published as separate edits.
    collaborationSession.stop()
    setDefaultStyles(editor.masterGraph)
    resetGraph(
      collaborationSession.collaboration.records,
      editor.masterGraph,
      collaborationSession.collaboration.synchronizer
    )
    void editor.graphComponent.fitGraphBounds()
    setUserNodeDefaultColor(editor.masterGraph, collaborationSession.client.awareness.clientID)
    collaborationSession.start()
  })
  void editor.graphComponent.fitGraphBounds()

  let serverAlive
  let disposeTimer
  if (collaborationSession.client.provider.wsconnected) {
    disposeTimer = initializeTimerVisualization(collabUrl)

    serverAlive = setInterval(() => {
      if (!collaborationSession.client.provider.wsconnected) {
        showToast(
          `<h2>Connection to the collaboration server was lost</h2>
 <p>Please restart the server or contact the website administrator.</p>`,
          10000
        )
        clearInterval(serverAlive)
      }
    }, 15000)
  } else {
    showToast(
      `<h2>No collaboration server found</h2>
<p>Collaboration will use the broadcast channel and work only locally.</p>
<p>To collaborate through a server, start the server from the demo folder in the package or contact your administrator.</p>`,
      10000
    )
  }

  // Enable guided tour
  const guidedTourTriggers = document.querySelectorAll('.guided-tour-trigger')
  for (const guidedTourTrigger of guidedTourTriggers) {
    guidedTourTrigger.classList.remove('hidden')
    guidedTourTrigger.addEventListener('click', async () => {
      startTour(tour)
    })
  }

  return () => {
    disposeFollowUserUI()
    // The collaboration session owns presence, synchronizer, local history,
    // and websocket client, so one disposal is enough for the lifecycle.
    collaborationSession.dispose()
    clearInterval(serverAlive)
    disposeTimer()
  }
}

function initializeGraphEditor() {
  const graphComponent = new GraphComponent('graphComponent')
  const overviewComponent = new GraphOverviewComponent('overviewComponent')
  overviewComponent.graphComponent = graphComponent
  overviewComponent.graphOverviewRenderer = new DemoStyleOverviewRenderer()

  const foldingManager = new FoldingManager()
  const masterGraph = foldingManager.masterGraph
  setDefaultStyles(masterGraph)
  const foldingView = foldingManager.createFoldingView()
  graphComponent.graph = foldingView.graph

  const editorMode = createEditorMode()
  graphComponent.inputMode = editorMode
  configureTwoPointerPanning(graphComponent)

  return { graphComponent, overviewComponent, masterGraph, foldingView, editorMode }
}

function initializeGraphData(records, graph) {
  const seeded = records.nodeRecords.size === 0 && records.edgeRecords.size === 0
  if (seeded) {
    buildGraph(graph, graphData)
    LayoutExecutor.ensure()
    graph.applyLayout(new HierarchicalLayout())
  }
  return seeded
}

function resetGraph(records, graph, synchronization) {
  // The caller has stopped synchronization before entering this function.
  // Keep the replacement in one local-history transaction, clear identity
  // maps because every graph item is about to be replaced, then publish the
  // rebuilt graph as one new shared state.
  records.history.run(() => {
    for (const edge of [...graph.edges]) graph.remove(edge)
    for (const node of [...graph.nodes]) graph.remove(node)
    synchronization.nodeById.clear()
    synchronization.edgeById.clear()
    for (const id of [...records.edgeRecords.keys()]) records.edgeRecords.delete(id)
    for (const id of [...records.nodeRecords.keys()]) records.nodeRecords.delete(id)

    buildGraph(graph, graphData)
    LayoutExecutor.ensure()
    graph.applyLayout(new HierarchicalLayout())
    synchronization.publishGraph()
    synchronization.synchronize()
  })
  // A reset establishes a new baseline rather than an undoable sequence of
  // deletions and creations.
  records.history.clear()
}

function initializeHistoryBindings(component, history) {
  const keyboard = component.inputMode.keyboardInputMode
  const undoButton = document.querySelector('#local-undo-button')
  const redoButton = document.querySelector('#local-redo-button')

  // Keep both controls in sync with the local Yjs history. subscribe() also
  // invokes the listener once, so the initially disabled state is set here too.
  history.subscribe(() => {
    undoButton.disabled = !history.canUndo()
    redoButton.disabled = !history.canRedo()
  })

  keyboard.addKeyBinding('z', ModifierKeys.CONTROL, history.undo)
  undoButton.addEventListener('click', history.undo)
  keyboard.addKeyBinding('y', ModifierKeys.CONTROL, history.redo)
  redoButton.addEventListener('click', history.redo)
}

/**
 * Creates nodes and edges according to the given data.
 */
function buildGraph(graph, graphData) {
  const graphBuilder = new GraphBuilder(graph)

  graphBuilder.createNodesSource({
    data: graphData.nodeList.filter((item) => !item.isGroup),
    id: (item) => item.id,
    parentId: (item) => item.parent
  })

  graphBuilder
    .createGroupNodesSource({
      data: graphData.nodeList.filter((item) => item.isGroup),
      id: (item) => item.id,
      parentId: (item) => item.parent
    })
    .nodeCreator.createLabelBinding((item) => item.label)

  graphBuilder.createEdgesSource({
    data: graphData.edgeList,
    sourceId: (item) => item.source,
    targetId: (item) => item.target
  })

  graphBuilder.buildGraph()
}

/**
 * Creates the editor input mode for this demo.
 */
function createEditorMode() {
  const mode = new GraphEditorInputMode({
    snapContext: createGraphSnapContext(),
    orthogonalEdgeEditingContext: new OrthogonalEdgeEditingContext({ enabled: false })
  })
  // Keep unselected movement enabled for ordinary and group nodes alike.
  mode.movableUnselectedItems = GraphItemTypes.NODE
  mode.editLabelInputMode.textEditorInputMode.textBoxPlacementPolicy =
    TextBoxPlacementPolicy.MOVE_TEXT_BOX
  // Fix the top right location of a group node when toggling collapse/expand
  mode.navigationInputMode.autoGroupNodeAlignmentPolicy = NodeAlignmentPolicy.TOP_RIGHT
  mode.createBendInputMode.priority = mode.moveSelectedItemsInputMode.priority - 1

  mode.snapContext.enabled = true

  return mode
}

function peerColor(clientId) {
  return PEER_COLORS[clientId % PEER_COLORS.length]
}

function setUserNodeDefaultColor(graph, clientId) {
  const style = graph.nodeDefaults.style
  if (style instanceof ShapeNodeStyle) style.fill = peerColor(clientId)
}

function authorName() {
  const stored = sessionStorage.getItem(AUTHOR_STORAGE_KEY)
  if (stored) return stored
  const name = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)]
  sessionStorage.setItem(AUTHOR_STORAGE_KEY, name)
  return name
}

/**
 * Creates a configured {@link GraphSnapContext} for this demo.
 */
function createGraphSnapContext() {
  return new GraphSnapContext({ enabled: false })
}

/**
 * Sets default styles to the graph.
 * @param graph The graph
 */
function setDefaultStyles(graph) {
  // Assign the default demo styles
  initDemoStyles(graph, { foldingEnabled: true, orthogonalEditing: true, shape: 'round-rectangle' })

  // Set the default node label position centered below the node with the FreeNodeLabelModel that supports label
  // snapping
  graph.nodeDefaults.labels.layoutParameter = FreeNodeLabelModel.INSTANCE.createParameter(
    [0.5, 1.0],
    [0, 10],
    [0.5, 0.0],
    [0, 0],
    0
  )

  // Set the default edge label position with the SmartEdgeLabelModel that supports label snapping
  graph.edgeDefaults.labels.layoutParameter = new SmartEdgeLabelModel().createParameterFromSource(
    0,
    0,
    0.5
  )
}

/**
 * Binds various actions to buttons in the demo's toolbar.
 */
function initializeUI(graphComponent, applyLayout, resetSeed) {
  document.querySelector('#apply-layout-button').addEventListener('click', () => {
    void applyLayout()
  })
  document.querySelector('#reset-seed-button').addEventListener('click', () => {
    if (window.confirm('Reset the collaborative graph to its starting seed?')) resetSeed()
  })
  const geim = graphComponent.inputMode

  const orthogonalEditingButton = document.querySelector('#demo-orthogonal-editing-button')
  orthogonalEditingButton.addEventListener('click', () => {
    geim.orthogonalEdgeEditingContext.enabled = orthogonalEditingButton.checked
  })
}
void run().then((dispose) => {
  finishLoading()
  window.addEventListener('pagehide', dispose, { once: true })
})
