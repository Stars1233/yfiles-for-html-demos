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
  Animator,
  type GraphComponent,
  type GraphEditorInputMode,
  IAnimation,
  type IEdge,
  type IGraph,
  type INode,
  type IPort,
  type IPortLocationModelParameter,
  LayoutGraphAdapter,
  Point,
  Rect,
  TimeSpan
} from '@yfiles/yfiles'
import { createUniqueId, type LocalHistory } from '../core'
import type { AwarenessLike } from '../presence'
import type { LayoutCommit, SharedGraphRecords } from '../records'
import type { YFilesEdgeRecord, YFilesNodeRecord, YFilesSynchronizer } from './yfiles-sync'

const LAYOUT_FIELD = 'collaborativeLayout'
const START_DELAY_MILLISECONDS = 150
const DEFAULT_ANIMATION_DURATION_MILLISECONDS = 800
const OWNER_RELEASE_GRACE_MILLISECONDS = 500

type LayoutPhase = 'scheduled' | 'committed'

type LayoutState = {
  id: string
  ownerId: number
  phase: LayoutPhase
  startAt: number
  durationMilliseconds: number
}

type GeometrySnapshot = {
  nodeLayouts: Map<INode, Rect>
  bendLocations: Map<IEdge, Point[]>
  portLocationParameters: Map<IPort, IPortLocationModelParameter>
}

export type CollaborativeLayoutOptions = {
  /** Calculates final coordinates synchronously on the rendered layout graph. */
  calculateLayout: (graph: IGraph) => void
  /** Duration used by all clients when replaying the committed coordinates. */
  animationDurationMilliseconds?: number
}

export type CollaborativeLayoutCoordinatorOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = CollaborativeLayoutOptions & {
  graphComponent: GraphComponent
  inputMode: GraphEditorInputMode
  graph: IGraph
  awareness: AwarenessLike
  records: SharedGraphRecords<NodeRecord, EdgeRecord>
  history: LocalHistory
  synchronizer: YFilesSynchronizer
  stopSynchronization: () => void
  startSynchronization: (options?: { observeGraph?: boolean }) => () => void
}

export type CollaborativeLayoutCoordinator = {
  /** Starts a coordinated layout, or does nothing while another layout wins. */
  startLayout: () => Promise<void>
  /** Releases awareness and graph resources owned by this coordinator. */
  dispose: () => void
}

/**
 * Coordinates a layout as one shared geometry update followed by local replay.
 * The graph-to-record observer is disabled while the local graph is calculated
 * and while all clients animate, so animation frames never become shared edits.
 */
export function createCollaborativeLayoutCoordinator<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
>(
  options: CollaborativeLayoutCoordinatorOptions<NodeRecord, EdgeRecord>
): CollaborativeLayoutCoordinator {
  const {
    graphComponent,
    inputMode,
    awareness,
    records,
    history,
    synchronizer,
    stopSynchronization,
    startSynchronization,
    calculateLayout,
    animationDurationMilliseconds = DEFAULT_ANIMATION_DURATION_MILLISECONDS
  } = options
  const animationGraph = graphComponent.graph
  const foldingView = animationGraph.foldingView

  const lifecycle = { disposed: false }
  const isDisposed = (): boolean => lifecycle.disposed
  let activeSession: LayoutState | null = null
  let localSessionId: string | null = null
  let synchronizationLocked = false
  let previousWaiting = false
  let replayTimer: number | null = null
  let ownerPromise: Promise<void> | null = null
  let replayAbortController: AbortController | null = null
  let latestCommit: LayoutCommit | null = null
  let sessionSource: GeometrySnapshot | null = null

  const clearReplayTimer = (): void => {
    if (replayTimer === null) return
    window.clearTimeout(replayTimer)
    replayTimer = null
  }

  const states = (): LayoutState[] => {
    const now = Date.now()
    const result: LayoutState[] = []
    awareness.getStates().forEach((state) => {
      const layout = state[LAYOUT_FIELD]
      if (!isLayoutState(layout)) return
      const expiresAt =
        layout.startAt + layout.durationMilliseconds + OWNER_RELEASE_GRACE_MILLISECONDS
      if (expiresAt >= now) result.push(layout)
    })
    return result
  }

  const selectActiveLayoutState = (): LayoutState | null => {
    const available = states()
    return available.length === 0 ? null : available.sort(compareLayoutStates)[0]!
  }

  const setLocalState = (state: LayoutState | null): void => {
    awareness.setLocalStateField(LAYOUT_FIELD, state)
  }

  const lockSynchronization = (): void => {
    if (synchronizationLocked) return
    synchronizationLocked = true
    previousWaiting = inputMode.waiting
    inputMode.waiting = true
    synchronizer.pause()
    stopSynchronization()
    startSynchronization({ observeGraph: false })
  }

  const unlockSynchronization = (): void => {
    if (!synchronizationLocked) return
    clearReplayTimer()
    replayAbortController?.abort()
    replayAbortController = null
    // Reconcile while graph observation is still disabled. The subsequent
    // normal start then installs the graph observer without publishing this
    // reconciliation as a local edit.
    synchronizer.resume()
    startSynchronization()
    inputMode.waiting = previousWaiting
    synchronizationLocked = false
  }

  const captureGeometry = (): GeometrySnapshot => {
    const nodeLayouts = new Map<INode, Rect>()
    const bendLocations = new Map<IEdge, Point[]>()
    const portLocationParameters = new Map<IPort, IPortLocationModelParameter>()

    for (const node of animationGraph.nodes) {
      const layout = node.layout
      nodeLayouts.set(node, new Rect(layout.x, layout.y, layout.width, layout.height))
    }
    for (const edge of animationGraph.edges) {
      bendLocations.set(
        edge,
        Array.from(edge.bends, (bend) => new Point(bend.location.x, bend.location.y))
      )
      portLocationParameters.set(edge.sourcePort, edge.sourcePort.locationParameter)
      portLocationParameters.set(edge.targetPort, edge.targetPort.locationParameter)
    }
    return { nodeLayouts, bendLocations, portLocationParameters }
  }

  const restoreGeometry = (snapshot: GeometrySnapshot): void => {
    snapshot.nodeLayouts.forEach((layout, node) => animationGraph.setNodeLayout(node, layout))
    snapshot.bendLocations.forEach((locations, edge) => {
      while (edge.bends.size > locations.length) {
        animationGraph.remove(edge.bends.at(edge.bends.size - 1)!)
      }
      locations.forEach((location, index) => {
        const bend = edge.bends.at(index)
        if (bend) animationGraph.setBendLocation(bend, location)
        else animationGraph.addBend(edge, location, index)
      })
    })
    snapshot.portLocationParameters.forEach((parameter, port) =>
      animationGraph.setPortLocationParameter(port, parameter)
    )
  }

  const viewNode = (masterNode: INode): INode | null =>
    foldingView ? foldingView.getViewItem(masterNode) : masterNode

  const viewEdge = (masterEdge: IEdge): IEdge | null =>
    foldingView ? foldingView.getViewItem(masterEdge) : masterEdge

  const createTargetAdapter = (): LayoutGraphAdapter => {
    const adapter = new LayoutGraphAdapter(animationGraph)
    adapter.initialize()

    const idsByNode = new Map(
      Array.from(synchronizer.nodeById, ([id, node]) => [node, id] as const)
    )

    for (const [id, masterNode] of synchronizer.nodeById) {
      const node = viewNode(masterNode)
      const record = records.nodeRecords.get(id)
      if (!node || !record) continue

      const layoutNode = adapter.getLayoutNode(node)
      if (!layoutNode) continue
      const layout = record.foldingLayout ?? record.layout
      layoutNode.layout.bounds = new Rect(layout.x, layout.y, layout.width, layout.height)
    }

    for (const [id, masterEdge] of synchronizer.edgeById) {
      const edge = viewEdge(masterEdge)
      const record = records.edgeRecords.get(id)
      if (!edge || !record) continue

      const sourceNode = viewNode(masterEdge.sourceNode)
      const targetNode = viewNode(masterEdge.targetNode)
      if (!sourceNode || !targetNode) continue
      if (edge.sourceNode !== sourceNode || edge.targetNode !== targetNode) continue

      const layoutEdge = adapter.getLayoutEdge(edge)
      if (!layoutEdge) continue

      const sourceNodeId = idsByNode.get(masterEdge.sourceNode)
      const targetNodeId = idsByNode.get(masterEdge.targetNode)
      if (!sourceNodeId || !targetNodeId) continue

      const sourceNodeRecord = records.nodeRecords.get(sourceNodeId)
      const targetNodeRecord = records.nodeRecords.get(targetNodeId)
      if (!sourceNodeRecord || !targetNodeRecord) continue

      const sourceLocation = absolutePortLocation(
        record.sourcePort,
        sourceNodeRecord.layout,
        record.portLocationsRelative
      )
      const targetLocation = absolutePortLocation(
        record.targetPort,
        targetNodeRecord.layout,
        record.portLocationsRelative
      )

      layoutEdge.sourcePortLocation = sourceLocation
      layoutEdge.targetPortLocation = targetLocation
      Array.from(layoutEdge.bends).forEach((bend) => adapter.layoutGraph.remove(bend))
      record.bends.forEach((bend) => adapter.layoutGraph.addBend(layoutEdge, bend.x, bend.y))
    }

    return adapter
  }

  const hasCompleteCommit = (state: LayoutState): boolean => {
    if (!latestCommit || latestCommit.id !== state.id || latestCommit.ownerId !== state.ownerId) {
      return false
    }
    return (
      latestCommit.nodeIds.every((id) => records.nodeRecords.has(id)) &&
      latestCommit.edgeIds.every((id) => records.edgeRecords.has(id))
    )
  }

  const animateToAdapter = async (adapter: LayoutGraphAdapter): Promise<void> => {
    replayAbortController = new AbortController()
    const animation = IAnimation.createLayoutAnimation(
      animationGraph,
      adapter,
      TimeSpan.fromMilliseconds(animationDurationMilliseconds)
    )
    const animator = new Animator({
      canvasComponent: graphComponent,
      allowUserInteraction: false,
      autoInvalidation: true
    })
    try {
      await animator.animate(animation, replayAbortController.signal)
    } catch {
      // Cancellation and a failed animation are both recovered by the final
      // synchronizer reconciliation in unlockSynchronization.
    } finally {
      replayAbortController = null
    }
  }

  const replayFromSource = async (source: GeometrySnapshot): Promise<void> => {
    restoreGeometry(source)
    await animateToAdapter(createTargetAdapter())
  }

  const finishSession = (id: string): void => {
    if (activeSession?.id !== id) return
    activeSession = null
    sessionSource = null
    localSessionId = localSessionId === id ? null : localSessionId
    unlockSynchronization()
  }

  const scheduleRemoteReplay = (): void => {
    const state = activeSession
    if (!state || state.ownerId === awareness.clientID || state.phase !== 'committed') return
    if (!hasCompleteCommit(state)) return
    if (replayTimer !== null) return
    replayTimer = window.setTimeout(() => {
      replayTimer = null
      if (isDisposed() || activeSession?.id !== state.id || state.phase !== 'committed') return
      if (!hasCompleteCommit(state)) return
      const source = sessionSource ?? captureGeometry()
      void replayFromSource(source).then(() => finishSession(state.id))
    }, 0)
  }

  const onLayoutCommitChanged = (): void => {
    const commit = records.layoutRoot.get('latest')
    latestCommit = isLayoutCommit(commit) ? commit : null
    scheduleRemoteReplay()
  }
  const initialCommit = records.layoutRoot.get('latest')
  latestCommit = isLayoutCommit(initialCommit) ? initialCommit : null
  records.layoutRoot.observe(onLayoutCommitChanged)

  const adoptActiveLayoutState = (state: LayoutState | null): void => {
    if (!state) {
      if (activeSession) finishSession(activeSession.id)
      return
    }
    if (activeSession?.id === state.id) {
      activeSession = state
      if (state.phase === 'committed') scheduleRemoteReplay()
      return
    }
    if (activeSession) finishSession(activeSession.id)
    activeSession = state
    sessionSource = captureGeometry()
    lockSynchronization()
    if (state.phase === 'committed') scheduleRemoteReplay()
  }

  const onAwarenessChange = (): void => {
    if (isDisposed()) return
    adoptActiveLayoutState(selectActiveLayoutState())
  }
  awareness.on('change', onAwarenessChange)

  const runOwnerSession = async (state: LayoutState): Promise<void> => {
    const waitMilliseconds = Math.max(0, state.startAt - Date.now())
    if (waitMilliseconds > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, waitMilliseconds))
    }
    if (isDisposed() || localSessionId !== state.id || selectActiveLayoutState()?.id !== state.id) {
      return
    }

    lockSynchronization()
    const source = sessionSource ?? captureGeometry()
    let targetPublished = false
    try {
      calculateLayout(animationGraph)
      let commit: LayoutCommit | undefined
      history.run(() => {
        synchronizer.publishGraph()
        commit = {
          id: state.id,
          ownerId: state.ownerId,
          nodeIds: Array.from(synchronizer.nodeById.keys()),
          edgeIds: Array.from(synchronizer.edgeById.keys()),
          committedAt: Date.now()
        }
        records.layoutRoot.set('latest', commit)
      })
      if (!commit) throw new Error('Collaborative layout commit was not created')
      latestCommit = commit
      targetPublished = true
      const committedState: LayoutState = { ...state, phase: 'committed' }
      activeSession = committedState
      setLocalState(committedState)
      await replayFromSource(source)
    } catch {
      if (!targetPublished) restoreGeometry(source)
      setLocalState(null)
    } finally {
      finishSession(state.id)
      if (!isDisposed()) {
        window.setTimeout(() => {
          const localState = awareness.getStates().get(awareness.clientID)?.[LAYOUT_FIELD]
          if (isLayoutState(localState) && localState.id === state.id) setLocalState(null)
          const commit = records.layoutRoot.get('latest')
          if (isLayoutCommit(commit) && commit.id === state.id) records.layoutRoot.delete('latest')
        }, OWNER_RELEASE_GRACE_MILLISECONDS)
      }
    }
  }

  const startLayout = async (): Promise<void> => {
    if (isDisposed() || selectActiveLayoutState() || ownerPromise) return
    const state: LayoutState = {
      id: createUniqueId('layout'),
      ownerId: awareness.clientID,
      phase: 'scheduled',
      startAt: Date.now() + START_DELAY_MILLISECONDS,
      durationMilliseconds: animationDurationMilliseconds
    }
    localSessionId = state.id
    sessionSource = captureGeometry()
    activeSession = state
    lockSynchronization()
    setLocalState(state)
    ownerPromise = runOwnerSession(state).finally(() => {
      ownerPromise = null
    })
    await ownerPromise
  }

  const dispose = (): void => {
    if (isDisposed()) return
    lifecycle.disposed = true
    clearReplayTimer()
    replayAbortController?.abort()
    replayAbortController = null
    records.layoutRoot.unobserve(onLayoutCommitChanged)
    awareness.off('change', onAwarenessChange)
    if (localSessionId) setLocalState(null)
    activeSession = null
    sessionSource = null
    unlockSynchronization()
  }

  adoptActiveLayoutState(selectActiveLayoutState())

  return { startLayout, dispose }
}

function absolutePortLocation(
  location: { x: number; y: number },
  nodeLayout: { x: number; y: number },
  relative: boolean | undefined
): Point {
  return relative
    ? new Point(nodeLayout.x + location.x, nodeLayout.y + location.y)
    : new Point(location.x, location.y)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isLayoutState(value: unknown): value is LayoutState {
  if (!isRecord(value)) return false
  const id = value.id
  const ownerId = value.ownerId
  const phase = value.phase
  const startAt = value.startAt
  const durationMilliseconds = value.durationMilliseconds
  return (
    typeof id === 'string' &&
    typeof ownerId === 'number' &&
    Number.isFinite(ownerId) &&
    (phase === 'scheduled' || phase === 'committed') &&
    typeof startAt === 'number' &&
    Number.isFinite(startAt) &&
    typeof durationMilliseconds === 'number' &&
    Number.isFinite(durationMilliseconds) &&
    durationMilliseconds > 0
  )
}

function isLayoutCommit(value: unknown): value is LayoutCommit {
  if (!isRecord(value)) return false
  const id = value.id
  const ownerId = value.ownerId
  const nodeIds = value.nodeIds
  const edgeIds = value.edgeIds
  const committedAt = value.committedAt
  return (
    typeof id === 'string' &&
    typeof ownerId === 'number' &&
    Number.isFinite(ownerId) &&
    Array.isArray(nodeIds) &&
    nodeIds.every((nodeId) => typeof nodeId === 'string') &&
    Array.isArray(edgeIds) &&
    edgeIds.every((edgeId) => typeof edgeId === 'string') &&
    typeof committedAt === 'number' &&
    Number.isFinite(committedAt)
  )
}

function compareLayoutStates(left: LayoutState, right: LayoutState): number {
  return (
    left.startAt - right.startAt || left.ownerId - right.ownerId || left.id.localeCompare(right.id)
  )
}
