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
import { GraphEditorInputMode } from '@yfiles/yfiles'
import { createWebsocketCollaborationClient } from './core'
import { createYFilesPresence } from './presence'
import { createCollaborativeLayoutCoordinator, createYFilesCollaboration } from './yfiles'

/**
 * Creates and starts the standard yFiles collaboration stack.
 *
 * The returned session owns the client, graph collaboration, and optional
 * presence lifecycle. Application-specific graph seeding and UI remain with
 * the caller through the initialization hook and returned collaboration.
 */
export async function createCollaborationSession(options) {
  const {
    client: suppliedClient,
    clientOptions,
    graphComponent,
    graph: suppliedGraph,
    foldingView: suppliedFoldingView,
    navigationInputMode: suppliedNavigationInputMode,
    presenceOptions: presenceOptions,
    syncTimeoutMilliseconds,
    layoutOptions,
    initialize,
    afterSynchronize: suppliedAfterSynchronize,
    ...collaborationOptions
  } = options
  const client = suppliedClient ? suppliedClient : createWebsocketCollaborationClient(clientOptions)

  let collaboration
  try {
    const synced = await client.whenSynced(syncTimeoutMilliseconds)
    const componentGraph = graphComponent.graph
    const foldingView = suppliedFoldingView ?? componentGraph.foldingView ?? undefined
    const graph = suppliedGraph ?? foldingView?.manager.masterGraph ?? componentGraph
    const navigationInputMode =
      suppliedNavigationInputMode ?? inferNavigationInputMode(graphComponent)
    const inputMode = inferGraphEditorInputMode(graphComponent)
    const afterSynchronize = () => {
      graphComponent.invalidate()
      suppliedAfterSynchronize?.()
    }

    collaboration = createYFilesCollaboration({
      ...collaborationOptions,
      client,
      graph,
      foldingView,
      afterSynchronize
    })
    const publishGraph = initialize?.({ synced, graph, collaboration })
    let stopSynchronization = collaboration.start()
    if (publishGraph) collaboration.synchronizer.publishGraph()

    const start = (startOptions) => {
      stopSynchronization = collaboration.start(startOptions)
      return stopSynchronization
    }
    const stop = () => stopSynchronization()
    const layoutCoordinator = createCollaborativeLayoutCoordinator({
      ...layoutOptions,
      graphComponent,
      inputMode,
      graph,
      awareness: client.awareness,
      records: collaboration.records,
      history: collaboration.history,
      synchronizer: collaboration.synchronizer,
      stopSynchronization: stop,
      startSynchronization: start
    })

    const presence =
      presenceOptions !== false
        ? createYFilesPresence({
            fallbackAuthor: (clientId) => `User ${clientId}`,
            ...presenceOptions,
            component: graphComponent,
            awareness: client.awareness,
            nodeById: collaboration.nodeById,
            foldingView,
            navigationInputMode
          })
        : undefined
    let disposed = false

    return {
      client,
      collaboration,
      layoutCoordinator,
      presence,
      synced,
      start,
      stop,
      dispose: () => {
        if (disposed) return
        disposed = true
        layoutCoordinator.dispose()
        presence?.dispose()
        collaboration.dispose()
      }
    }
  } catch (error) {
    client.dispose()
    throw error
  }
}

function inferGraphEditorInputMode(graphComponent) {
  const inputMode = graphComponent.inputMode
  if (!(inputMode instanceof GraphEditorInputMode)) {
    throw new Error('createCollaborationSession requires a GraphEditorInputMode for layout support')
  }
  return inputMode
}

function inferNavigationInputMode(graphComponent) {
  const inputMode = graphComponent.inputMode
  if (!inputMode || !('navigationInputMode' in inputMode)) return undefined
  return inputMode.navigationInputMode
}
