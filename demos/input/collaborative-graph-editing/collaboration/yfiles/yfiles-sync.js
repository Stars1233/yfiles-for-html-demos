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
import { createIdentityMap, observeSharedMaps } from '../core'
import { createYFilesRecordAdapter } from './yfiles-record-adapter'
import { createYFilesGraphPublisher } from './yfiles-graph-publisher'
import { createYFilesGraphReconciler } from './yfiles-graph-reconciler'
export { createYFilesRecordAdapter } from './yfiles-record-adapter'

/**
 * Creates a record-to-yFiles graph projection.
 *
 * The callbacks contain application-specific model-item creation and updates;
 * this function handles the generic yFiles lifecycle around them:
 * creation, deletion, reconnecting edges, identity maps, and observation of
 * the shared records. Movement itself remains owned by yFiles input modes:
 * MoveInputMode resolves the appropriate IPositionHandler through the model
 * item's lookup chain, including the built-in handling for grouped descendants
 * and bends. This projection only serializes the graph changes produced by
 * that handler.
 *
 * `start` is the usual entry point: it performs an initial record-to-graph
 * reconciliation before enabling graph observation. If the host has built a
 * local seed graph, call `publishGraph` only after confirming that the shared
 * record maps are empty. `dispose` stops observation but does not destroy the
 * supplied graph, records, history, or client.
 */
export function createYFilesSynchronizer(options) {
  const {
    graph,
    records,
    nodeRecords: configuredNodeRecords,
    edgeRecords: configuredEdgeRecords,
    nodeById: configuredNodeById,
    edgeById: configuredEdgeById,
    foldingView,
    recordAdapter: configuredRecordAdapter,
    recordAdapterOptions,
    createNode: createNodeOverride,
    updateNode: updateNodeOverride,
    createEdge: createEdgeOverride,
    updateEdge: updateEdgeOverride,
    canUpdateEdge = (edge, _record, source, target) =>
      edge.sourceNode === source && edge.targetNode === target,
    afterSynchronize,
    graphPublisher
  } = options

  const nodeRecords = configuredNodeRecords ?? records?.nodeRecords
  const edgeRecords = configuredEdgeRecords ?? records?.edgeRecords
  if (!nodeRecords || !edgeRecords) {
    throw new Error('createYFilesSynchronizer requires records or both nodeRecords and edgeRecords')
  }
  const nodeById = configuredNodeById ?? new Map()
  const edgeById = configuredEdgeById ?? new Map()
  const graphPublisherWithHistory =
    records?.history && !graphPublisher?.transact
      ? { ...graphPublisher, transact: records.history.transact }
      : graphPublisher

  const recordAdapter =
    configuredRecordAdapter ??
    createYFilesRecordAdapter({
      graph,
      nodeById,
      edgeById,
      foldingView,
      ...recordAdapterOptions,
      getNodeId: graphPublisherWithHistory?.getNodeId ?? recordAdapterOptions?.getNodeId,
      getEdgeId: graphPublisherWithHistory?.getEdgeId ?? recordAdapterOptions?.getEdgeId
    })
  const updateNode = updateNodeOverride ?? recordAdapter.updateNode
  const updateEdge = updateEdgeOverride ?? recordAdapter.updateEdge
  const effectiveGraphPublisher = {
    ...graphPublisherWithHistory,
    getNodeId: graphPublisherWithHistory?.getNodeId ?? recordAdapter.getNodeId,
    getEdgeId: graphPublisherWithHistory?.getEdgeId ?? recordAdapter.getEdgeId,
    nodeRecord: graphPublisherWithHistory?.nodeRecord ?? recordAdapter.nodeRecord,
    edgeRecord: graphPublisherWithHistory?.edgeRecord ?? recordAdapter.edgeRecord
  }

  let applyingSharedRecords = false
  let synchronizationPauseDepth = 0
  let synchronizeAgain = false
  let synchronizeAgainFully = false
  const pendingChanges = new Map()
  const nodeIdentity = createIdentityMap(nodeById)
  const edgeIdentity = createIdentityMap(edgeById)

  const reconciler = createYFilesGraphReconciler({
    graph,
    nodeRecords,
    edgeRecords,
    nodeById,
    edgeById,
    foldingView,
    recordAdapter,
    createNode: createNodeOverride,
    applyDefaultNodeUpdateAfterCreate: !!createNodeOverride && !updateNodeOverride,
    updateNode,
    createEdge: createEdgeOverride,
    applyDefaultEdgeUpdateAfterCreate: !!createEdgeOverride && !updateEdgeOverride,
    updateEdge,
    canUpdateEdge,
    nodeIdentity,
    edgeIdentity
  })

  const publisher = createYFilesGraphPublisher({
    graph,
    foldingView,
    nodeRecords,
    edgeRecords,
    nodeById,
    edgeById,
    nodeIdentity,
    edgeIdentity,
    graphPublisher: effectiveGraphPublisher,
    isApplyingSharedRecords: () => applyingSharedRecords
  })

  const queueChanges = (changes) => {
    if (!changes) {
      synchronizeAgainFully = true
      return
    }
    for (const change of changes) {
      let keys = pendingChanges.get(change.map)
      if (!keys) {
        keys = new Set()
        pendingChanges.set(change.map, keys)
      }
      for (const key of change.keys) keys.add(key)
    }
  }

  const takeQueuedChanges = () => {
    if (synchronizeAgainFully) {
      synchronizeAgainFully = false
      pendingChanges.clear()
      return undefined
    }
    const changes = []
    for (const [map, keys] of pendingChanges) changes.push({ map, keys: [...keys] })
    pendingChanges.clear()
    return changes.length > 0 ? changes : undefined
  }

  const synchronize = (changes) => {
    if (synchronizationPauseDepth > 0) {
      queueChanges(changes)
      return
    }
    // Graph updates performed by the projection itself must not be published
    // back to Yjs. This also prevents a remote update from echoing forever.
    if (applyingSharedRecords) {
      synchronizeAgain = true
      queueChanges(changes)
      return
    }
    // A graph-originated record write already reflects the current graph
    // state. Applying that same record synchronously from the map observer
    // re-enters yFiles while its change event is still being dispatched.
    if (publisher.isWritingGraphRecord()) return
    applyingSharedRecords = true
    try {
      const fullSynchronization = !changes || changes.length === 0
      const nodeIds = new Set()
      const edgeIds = new Set()
      if (!fullSynchronization) {
        for (const change of changes) {
          if (change.keys.length === 0) {
            synchronizeAgainFully = true
            continue
          }
          const target = change.map === nodeRecords ? nodeIds : edgeIds
          for (const key of change.keys) target.add(key)
        }
      }

      if (fullSynchronization || synchronizeAgainFully) {
        synchronizeAgainFully = false
        reconciler.reconcileAll()
      } else {
        reconciler.reconcileIncremental(nodeIds, edgeIds)
      }

      afterSynchronize?.()
    } finally {
      applyingSharedRecords = false
      if (synchronizeAgain) {
        synchronizeAgain = false
        synchronize(takeQueuedChanges())
      }
    }
  }

  const observeSharedRecords = () =>
    observeSharedMaps([nodeRecords, edgeRecords], (change) =>
      synchronize(change ? [change] : undefined)
    )

  const observeGraphChanges = publisher.observeGraph
  const pause = () => {
    synchronizationPauseDepth++
  }
  const resume = () => {
    if (synchronizationPauseDepth === 0) return
    synchronizationPauseDepth--
    if (synchronizationPauseDepth === 0) synchronize(takeQueuedChanges())
  }
  let startedStop
  const start = ({ observeGraph = true } = {}) => {
    startedStop?.()
    const stops = [observeSharedRecords()]
    if (observeGraph) stops.push(observeGraphChanges())
    const stop = () => {
      stops.splice(0).forEach((unsubscribe) => unsubscribe())
      if (startedStop === stop) startedStop = undefined
    }
    startedStop = stop
    return stop
  }
  const dispose = () => {
    startedStop?.()
    startedStop = undefined
  }

  return {
    synchronize,
    nodeById,
    edgeById,
    observeSharedRecords,
    observeGraphChanges,
    start,
    pause,
    resume,
    dispose,
    publishNode: publisher.publishNode,
    publishEdge: publisher.publishEdge,
    publishGraph: publisher.publishGraph,
    removeNodeById: reconciler.removeNodeById,
    removeEdgeById: reconciler.removeEdgeById
  }
}
