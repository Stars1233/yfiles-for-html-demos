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
import { Rect } from '@yfiles/yfiles'

/**
 * Applies shared node and edge records to the local yFiles graph. Nodes and
 * parent relationships are reconciled before edges, and missing endpoints are
 * deferred until a later shared-map change can provide them.
 */
export function createYFilesGraphReconciler(options) {
  const {
    graph,
    nodeRecords,
    edgeRecords,
    nodeById,
    edgeById,
    foldingView,
    recordAdapter,
    createNode: createNodeOverride,
    applyDefaultNodeUpdateAfterCreate,
    updateNode,
    createEdge: createEdgeOverride,
    applyDefaultEdgeUpdateAfterCreate,
    updateEdge,
    canUpdateEdge,
    nodeIdentity,
    edgeIdentity
  } = options

  const createNodeFromRecord = (record) => {
    const parent = record.parentId ? (nodeById.get(record.parentId) ?? null) : null
    const node = createNodeOverride
      ? createNodeOverride(record, parent)
      : recordAdapter.createNode(record)
    if (createNodeOverride && applyDefaultNodeUpdateAfterCreate) {
      recordAdapter.updateNode(node, record)
    }
    nodeIdentity.register(record.id, node)
    return node
  }

  const createEdgeFromRecord = (record) => {
    const source = nodeById.get(record.sourceId)
    const target = nodeById.get(record.targetId)
    if (!source || !target) return undefined

    const edge = createEdgeOverride
      ? createEdgeOverride(record, source, target)
      : recordAdapter.createEdge(record, source, target)
    if (createEdgeOverride && applyDefaultEdgeUpdateAfterCreate) {
      recordAdapter.updateEdge(edge, record)
    }
    edgeIdentity.register(record.id, edge)
    return edge
  }

  const removeEdgeById = (id) => {
    const edge = edgeById.get(id)
    if (!edge) return

    edgeIdentity.unregister(id, edge)
    if (graph.contains(edge)) graph.remove(edge)
  }

  const removeNodeById = (id) => {
    const node = nodeById.get(id)
    if (!node) return

    // Removing a node also removes its incident graph edges. Remove their
    // entries from the identity map before removing the node from the graph.
    for (const [edgeId, edge] of edgeById) {
      if (edge.sourceNode === node || edge.targetNode === node) {
        edgeIdentity.unregister(edgeId, edge)
      }
    }
    nodeIdentity.unregister(id, node)
    if (graph.contains(node)) graph.remove(node)
  }

  const reconcileNodes = (ids) => {
    const createdIds = new Set()
    // Nodes must exist before edges can be created because yFiles edges
    // connect existing graph nodes.
    const records = ids
      ? (function* () {
          for (const id of ids) {
            const record = nodeRecords.get(id)
            if (record) yield [id, record]
          }
        })()
      : nodeRecords
    for (const [id, record] of records) {
      const node = nodeById.get(id)
      if (!node || !graph.contains(node)) {
        if (node) nodeIdentity.unregister(id, node)
        createNodeFromRecord(record)
        createdIds.add(id)
      } else {
        updateNode(node, record)
      }
    }
    return createdIds
  }

  const reconcileNodeParents = (ids) => {
    // Parent records may be iterated after their children. Reconcile the
    // hierarchy once all nodes are present so map order cannot affect it.
    const records = ids
      ? (function* () {
          for (const id of ids) {
            const record = nodeRecords.get(id)
            if (record) yield [id, record]
          }
        })()
      : nodeRecords
    for (const [id, record] of records) {
      const node = nodeById.get(id)
      const parent = record.parentId ? (nodeById.get(record.parentId) ?? null) : null
      if (node && graph.getParent(node) !== parent && parent !== node) {
        graph.setParent(node, parent)
      }
    }
  }

  const reconcileEdges = (ids) => {
    // An edge is recreated when its endpoints or another creation-time
    // property can no longer be updated in place.
    const reconcileEdgeRecord = (id, record) => {
      const source = nodeById.get(record.sourceId)
      const target = nodeById.get(record.targetId)
      if (!source || !target) return

      const edge = edgeById.get(id)
      if (!edge || !graph.contains(edge)) {
        if (edge) edgeIdentity.unregister(id, edge)
        createEdgeFromRecord(record)
      } else if (canUpdateEdge(edge, record, source, target)) {
        updateEdge(edge, record)
      } else {
        removeEdgeById(id)
        createEdgeFromRecord(record)
      }
    }
    if (ids) {
      for (const id of ids) {
        const record = edgeRecords.get(id)
        if (record) reconcileEdgeRecord(id, record)
        else removeEdgeById(id)
      }
      return
    }
    for (const [id, record] of edgeRecords) {
      reconcileEdgeRecord(id, record)
    }
  }

  const removeStaleItems = () => {
    // Delete edges first so node deletion cannot leave stale edge entries in
    // the identity map.
    for (const id of [...edgeById.keys()]) {
      if (!edgeRecords.has(id)) removeEdgeById(id)
    }
    for (const id of [...nodeById.keys()]) {
      if (!nodeRecords.has(id)) removeNodeById(id)
    }
  }

  const reconcileFolding = (ids) => {
    if (!foldingView) return
    const records = ids
      ? (function* () {
          for (const id of ids) {
            const record = nodeRecords.get(id)
            if (record) yield [id, record]
          }
        })()
      : nodeRecords
    for (const [id, record] of records) {
      if (record.isExpanded === undefined) continue
      const node = nodeById.get(id)
      if (!node || !graph.isGroupNode(node)) continue

      const expanded = foldingView.isExpanded(node)
      if (expanded !== record.isExpanded) {
        if (record.isExpanded) foldingView.expand(node)
        else foldingView.collapse(node)
      }
      if (!record.isExpanded && record.foldingLayout) {
        const viewNode = foldingView.getViewItem(node)
        if (viewNode && foldingView.isInFoldingState(viewNode)) {
          const layout = record.foldingLayout
          foldingView.graph.setNodeLayout(
            viewNode,
            new Rect(layout.x, layout.y, layout.width, layout.height)
          )
        }
      }
    }
  }

  const reconcileAll = () => {
    reconcileNodes()
    reconcileNodeParents()
    reconcileEdges()
    removeStaleItems()
    reconcileFolding()
  }

  const reconcileIncremental = (nodeIds, edgeIds) => {
    // A node deletion may remove descendants and incident edges as a graph
    // operation. Reconcile globally in that uncommon structural case; ordinary
    // live layout updates remain incremental.
    const deletedNode = [...nodeIds].some((id) => !nodeRecords.has(id))
    if (deletedNode) {
      reconcileAll()
      return
    }

    const createdNodeIds = reconcileNodes(nodeIds)
    const parentIds = new Set(nodeIds)
    if (createdNodeIds.size > 0) {
      // A child may have arrived before its parent. Only scan for children when
      // a node was actually created, not during movement.
      for (const [id, record] of nodeRecords) {
        if (record.parentId && createdNodeIds.has(record.parentId)) parentIds.add(id)
      }
    }
    reconcileNodeParents(parentIds)

    // Updating a node can affect the node-relative locations of its incident
    // edges. Use adjacency lookup instead of scanning all graph edges for every
    // changed node.
    for (const id of nodeIds) {
      const node = nodeById.get(id)
      if (!node || !graph.contains(node)) continue
      for (const edge of graph.edgesAt(node)) {
        const edgeId = edgeIdentity.getId(edge)
        if (edgeId) edgeIds.add(edgeId)
      }
    }
    reconcileEdges(edgeIds)
    reconcileFolding(nodeIds)
  }

  return { reconcileAll, reconcileIncremental, removeNodeById, removeEdgeById }
}
