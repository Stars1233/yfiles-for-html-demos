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
/**
 * Bridges yFiles graph events to the generic graph-to-record publishers.
 * Observation covers the master graph and, when configured, folding-view
 * events. It reports the owning master item so temporary view items are never
 * treated as independent shared records.
 */
export function observeYFilesGraph(options) {
  const {
    graph,
    foldingView,
    publishNode,
    publishEdge,
    transactRecordWrites,
    removeNode,
    removeEdge,
    findNodeOwner,
    findEdgeOwner,
    isApplyingSharedRecords,
    isWritingGraphRecord
  } = options

  const subscriptions = []
  const listen = (add, remove, listener) => {
    add(listener)
    subscriptions.push(() => remove(listener))
  }

  const listenGraphEvent = (source, event, listener) => {
    listen(
      (registeredListener) => source.addEventListener(event, registeredListener),
      (registeredListener) => source.removeEventListener(event, registeredListener),
      listener
    )
  }

  const listenFoldingEvent = (event, listener) => {
    if (!foldingView) return
    listen(
      (registeredListener) => foldingView.addEventListener(event, registeredListener),
      (registeredListener) => foldingView.removeEventListener(event, registeredListener),
      listener
    )
  }

  const routeOwner = (owner, change) => {
    const node = findNodeOwner(owner)
    if (node) publishNode(node, change)
    else {
      const edge = findEdgeOwner(owner)
      if (edge) publishEdge(edge, change)
    }
  }
  const routeLabel = (label, change, owner = label.owner) => routeOwner(owner, change)
  const routePort = (port, change, owner = port.owner) => routeOwner(owner, change)

  const publishNodeLayout = (node) => {
    // Publish incident edges while their ports already reflect the new node
    // layout so their node-relative locations stay current.
    transactRecordWrites(() => {
      for (const edge of graph.edgesAt(node)) publishEdge(edge, 'edge-ports-changed')
      publishNode(node, 'node-layout-changed')
    })
  }

  const nodeCreated = (event) => publishNode(event.item, 'node-created')
  const nodeRemoved = (event) => removeNode(event.item)
  const nodeLayoutChanged = (node) => publishNodeLayout(node)
  const nodeChanged = (event) => publishNode(event.item, 'node-style-changed')
  const nodeTagChanged = (event) => publishNode(event.item, 'node-tag-changed')
  const groupNodeChanged = (event) => publishNode(event.item, 'is-group-node-changed')
  const parentChanged = (event) => publishNode(event.item, 'parent-changed')

  const edgeCreated = (event) => publishEdge(event.item, 'edge-created')
  const edgeRemoved = (event) => removeEdge(event.item)
  const edgeChanged = (event) => publishEdge(event.item, 'edge-style-changed')
  const edgeTagChanged = (event) => publishEdge(event.item, 'edge-tag-changed')
  const edgePortsChanged = (event) => publishEdge(event.item, 'edge-ports-changed')

  const bendAdded = (event) => publishEdge(event.item.owner, 'bend-added')
  const bendRemoved = (event) => publishEdge(event.owner, 'bend-removed')
  const bendLocationChanged = (bend) => publishEdge(bend.owner, 'bend-location-changed')
  const bendTagChanged = (event) => publishEdge(event.item.owner, 'bend-tag-changed')

  const labelAdded = (event) => routeLabel(event.item, 'label-added')
  const labelRemoved = (event) => {
    if (event.owner) routeLabel(event.item, 'label-removed', event.owner)
  }
  const labelLayoutChanged = (event) => routeLabel(event.item, 'label-layout-parameter-changed')
  const labelPreferredSizeChanged = (event) =>
    routeLabel(event.item, 'label-preferred-size-changed')
  const labelStyleChanged = (event) => routeLabel(event.item, 'label-style-changed')
  const labelTextChanged = (event) => routeLabel(event.item, 'label-text-changed')
  const labelTagChanged = (event) => routeLabel(event.item, 'label-tag-changed')

  const portAdded = (event) => routePort(event.item, 'port-added')
  const portRemoved = (event) => routePort(event.item, 'port-removed', event.owner)
  const portLocationChanged = (event) => routePort(event.item, 'port-location-parameter-changed')
  const portStyleChanged = (event) => routePort(event.item, 'port-style-changed')
  const portTagChanged = (event) => routePort(event.item, 'port-tag-changed')

  const foldingStateChanged = (event) => {
    if (!foldingView) return
    const masterNode = foldingView.getMasterItem(event.item)
    if (masterNode && graph.isGroupNode(masterNode)) {
      publishNode(masterNode, 'node-tag-changed')
    }
  }

  const viewNodeLayoutChanged = (node) => {
    if (!foldingView || !foldingView.graph.contains(node)) return

    const masterNode = foldingView.getMasterItem(node)
    if (
      !masterNode ||
      !graph.contains(masterNode) ||
      !graph.isGroupNode(masterNode) ||
      !foldingView.isInFoldingState(node)
    ) {
      return
    }

    // A collapsed folder's layout belongs to the folding view. The native
    // position handler has already moved the folder and its master subtree;
    // only persist the view-local folder rectangle here.
    if (!isApplyingSharedRecords() && !isWritingGraphRecord()) {
      publishNode(masterNode, 'node-layout-changed')
    }
  }

  listenGraphEvent(graph, 'node-created', nodeCreated)
  listenGraphEvent(graph, 'node-removed', nodeRemoved)
  listenGraphEvent(graph, 'node-layout-changed', nodeLayoutChanged)
  listenGraphEvent(graph, 'node-style-changed', nodeChanged)
  listenGraphEvent(graph, 'node-tag-changed', nodeTagChanged)
  listenGraphEvent(graph, 'parent-changed', parentChanged)

  if (foldingView) {
    const viewGraph = foldingView.graph
    listenFoldingEvent('group-collapsed', foldingStateChanged)
    listenFoldingEvent('group-expanded', foldingStateChanged)
    listenGraphEvent(viewGraph, 'node-layout-changed', viewNodeLayoutChanged)
  }
  listenGraphEvent(graph, 'is-group-node-changed', groupNodeChanged)
  listenGraphEvent(graph, 'edge-created', edgeCreated)
  listenGraphEvent(graph, 'edge-removed', edgeRemoved)
  listenGraphEvent(graph, 'edge-ports-changed', edgePortsChanged)
  listenGraphEvent(graph, 'edge-style-changed', edgeChanged)
  listenGraphEvent(graph, 'edge-tag-changed', edgeTagChanged)
  listenGraphEvent(graph, 'bend-added', bendAdded)
  listenGraphEvent(graph, 'bend-removed', bendRemoved)
  listenGraphEvent(graph, 'bend-location-changed', bendLocationChanged)
  listenGraphEvent(graph, 'bend-tag-changed', bendTagChanged)
  listenGraphEvent(graph, 'label-added', labelAdded)
  listenGraphEvent(graph, 'label-removed', labelRemoved)
  listenGraphEvent(graph, 'label-text-changed', labelTextChanged)
  listenGraphEvent(graph, 'label-layout-parameter-changed', labelLayoutChanged)
  listenGraphEvent(graph, 'label-preferred-size-changed', labelPreferredSizeChanged)
  listenGraphEvent(graph, 'label-style-changed', labelStyleChanged)
  listenGraphEvent(graph, 'label-tag-changed', labelTagChanged)
  listenGraphEvent(graph, 'port-added', portAdded)
  listenGraphEvent(graph, 'port-removed', portRemoved)
  listenGraphEvent(graph, 'port-location-parameter-changed', portLocationChanged)
  listenGraphEvent(graph, 'port-style-changed', portStyleChanged)
  listenGraphEvent(graph, 'port-tag-changed', portTagChanged)

  return () => subscriptions.splice(0).forEach((unsubscribe) => unsubscribe())
}
