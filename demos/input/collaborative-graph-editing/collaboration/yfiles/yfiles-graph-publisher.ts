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
import type { IEdge, IFoldingView, IGraph, INode } from '@yfiles/yfiles'
import { observeYFilesGraph } from './yfiles-graph-observer'
import type { IdentityMap } from '../core'
import { createUniqueId } from '../core'
import type { FieldLevelRecordMap } from '../records'
import type { YFilesEdgeRecord, YFilesNodeRecord } from './yfiles-record-types'
import type { YFilesGraphChange, YFilesGraphPublisherConfig } from './yfiles-sync-types'

export type YFilesGraphPublisherOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  graph: IGraph
  foldingView?: IFoldingView
  nodeRecords: FieldLevelRecordMap<NodeRecord>
  edgeRecords: FieldLevelRecordMap<EdgeRecord>
  nodeById: Map<string, INode>
  edgeById: Map<string, IEdge>
  nodeIdentity: IdentityMap<INode>
  edgeIdentity: IdentityMap<IEdge>
  graphPublisher: YFilesGraphPublisherConfig<NodeRecord, EdgeRecord>
  isApplyingSharedRecords: () => boolean
}

export type YFilesGraphPublisher = {
  publishNode(node: INode, change: YFilesGraphChange): void
  publishEdge(edge: IEdge, change: YFilesGraphChange): void
  publishGraph(): void
  observeGraph(): () => void
  isWritingGraphRecord(): boolean
}

/**
 * Publishes graph changes to shared records and connects graph observation.
 * Serializer callbacks must return complete records; the field-level map then
 * preserves independent top-level fields using the previous snapshot. The
 * publisher suppresses graph events caused by shared-record reconciliation and
 * wraps graph-originated writes in the configured history transaction.
 */
export function createYFilesGraphPublisher<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
>(options: YFilesGraphPublisherOptions<NodeRecord, EdgeRecord>): YFilesGraphPublisher {
  const {
    graph,
    foldingView,
    nodeRecords,
    edgeRecords,
    nodeById,
    edgeById,
    nodeIdentity,
    edgeIdentity,
    graphPublisher,
    isApplyingSharedRecords
  } = options

  let writingGraphRecord = false
  let recordWriteTransactionDepth = 0

  const transact = graphPublisher.transact ?? ((action: () => void): void => action())

  const transactRecordWrites = (action: () => void): void => {
    if (recordWriteTransactionDepth > 0) {
      action()
      return
    }
    recordWriteTransactionDepth++
    try {
      transact(action)
    } finally {
      recordWriteTransactionDepth--
    }
  }

  const setRecord = <T extends object>(
    records: FieldLevelRecordMap<T>,
    id: string,
    record: T,
    previous: T | undefined
  ): void => {
    transactRecordWrites(() => records.setPatch(id, record, previous))
  }

  const deleteRecord = <T extends object>(records: FieldLevelRecordMap<T>, id: string): void => {
    transactRecordWrites(() => records.delete(id))
  }

  const createId = (prefix: string): string => createUniqueId(prefix)

  const taggedId = (item: { tag: unknown }): string | undefined => {
    const tag = item.tag
    if (!tag || typeof tag !== 'object') return undefined
    const id = (tag as { id?: unknown }).id
    return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
  }

  const findNodeId = (node: INode): string | undefined => {
    const id = graphPublisher.getNodeId?.(node) ?? taggedId(node)
    if (id) {
      const existing = nodeById.get(id)
      // Clipboard copies retain the source tag. Do not let a pasted copy
      // claim the source record; the record adapter will assign it a fresh id.
      if (!existing || existing === node) return id
    }
    return nodeIdentity.getId(node)
  }

  const findEdgeId = (edge: IEdge): string | undefined => {
    const id = graphPublisher.getEdgeId?.(edge) ?? taggedId(edge)
    if (id) {
      const existing = edgeById.get(id)
      // See findNodeId: copied clipboard edges can retain the source tag too.
      if (!existing || existing === edge) return id
    }
    return edgeIdentity.getId(edge)
  }

  const findOwner = <T extends object>(owner: unknown, identity: IdentityMap<T>): T | undefined => {
    if (!owner || typeof owner !== 'object') return undefined
    const item = owner as T
    return identity.getId(item) ? item : undefined
  }

  const findNodeOwner = (owner: unknown): INode | undefined => findOwner(owner, nodeIdentity)

  const findEdgeOwner = (owner: unknown): IEdge | undefined => findOwner(owner, edgeIdentity)

  const publishNode = (node: INode, change: YFilesGraphChange = 'node-tag-changed'): void => {
    if (isApplyingSharedRecords() || writingGraphRecord) return
    writingGraphRecord = true
    try {
      const oldId = findNodeId(node)
      const previous = oldId ? nodeRecords.get(oldId) : undefined
      const record = graphPublisher.nodeRecord
        ? graphPublisher.nodeRecord(node, previous, change)
        : (previous ?? ({ id: oldId ?? createId('node') } as NodeRecord))
      if (!record) return

      if (oldId && oldId !== record.id && nodeRecords.has(oldId)) deleteRecord(nodeRecords, oldId)
      nodeIdentity.register(record.id, node)
      if (record !== previous) setRecord(nodeRecords, record.id, record, previous)
    } finally {
      writingGraphRecord = false
    }
  }

  const publishEdge = (edge: IEdge, change: YFilesGraphChange = 'edge-tag-changed'): void => {
    if (isApplyingSharedRecords() || writingGraphRecord) return
    writingGraphRecord = true
    try {
      const oldId = findEdgeId(edge)
      const previous = oldId ? edgeRecords.get(oldId) : undefined
      const sourceId = findNodeId(edge.sourceNode)
      const targetId = findNodeId(edge.targetNode)
      const record = graphPublisher.edgeRecord
        ? graphPublisher.edgeRecord(edge, previous, change)
        : (previous ??
          ({
            id: oldId ?? createId('edge'),
            sourceId: sourceId ?? createId('node'),
            targetId: targetId ?? createId('node')
          } as EdgeRecord))
      if (!record) return

      if (oldId && oldId !== record.id && edgeRecords.has(oldId)) deleteRecord(edgeRecords, oldId)
      edgeIdentity.register(record.id, edge)
      if (record !== previous) setRecord(edgeRecords, record.id, record, previous)
    } finally {
      writingGraphRecord = false
    }
  }

  const publishGraph = (): void => {
    transactRecordWrites(() => {
      for (const node of graph.nodes) publishNode(node, 'node-created')
      for (const edge of graph.edges) publishEdge(edge, 'edge-created')
    })
  }

  const removeNodeRecordFromGraph = (node: INode): void => {
    if (isApplyingSharedRecords() || writingGraphRecord) return
    writingGraphRecord = true
    try {
      transactRecordWrites(() => {
        const id = findNodeId(node)
        for (const [edgeId, edge] of edgeById) {
          if (edge.sourceNode === node || edge.targetNode === node) {
            deleteRecord(edgeRecords, edgeId)
            edgeIdentity.unregister(edgeId, edge)
          }
        }
        if (id) deleteRecord(nodeRecords, id)
        if (id) nodeIdentity.unregister(id, node)
      })
    } finally {
      writingGraphRecord = false
    }
  }

  const removeEdgeRecordFromGraph = (edge: IEdge): void => {
    if (isApplyingSharedRecords() || writingGraphRecord) return
    writingGraphRecord = true
    try {
      transactRecordWrites(() => {
        const id = findEdgeId(edge)
        if (id) deleteRecord(edgeRecords, id)
        if (id) edgeIdentity.unregister(id, edge)
      })
    } finally {
      writingGraphRecord = false
    }
  }

  let graphObservationStop: (() => void) | null = null

  const observeGraph = (): (() => void) => {
    if (graphObservationStop) return graphObservationStop

    // Register items that were created before graph observation started. This
    // is important for demos that build their initial graph before connecting.
    for (const node of graph.nodes) {
      const id = findNodeId(node)
      if (id) nodeIdentity.register(id, node)
    }
    for (const edge of graph.edges) {
      const id = findEdgeId(edge)
      if (id) edgeIdentity.register(id, edge)
    }

    const eventObservationStop = observeYFilesGraph({
      graph,
      foldingView,
      publishNode,
      publishEdge,
      transactRecordWrites,
      removeNode: removeNodeRecordFromGraph,
      removeEdge: removeEdgeRecordFromGraph,
      findNodeOwner,
      findEdgeOwner,
      isApplyingSharedRecords,
      isWritingGraphRecord: () => writingGraphRecord
    })
    const stop = (): void => {
      eventObservationStop()
      if (graphObservationStop === stop) graphObservationStop = null
    }
    graphObservationStop = stop
    return stop
  }

  return {
    publishNode,
    publishEdge,
    publishGraph,
    observeGraph,
    isWritingGraphRecord: () => writingGraphRecord
  }
}
