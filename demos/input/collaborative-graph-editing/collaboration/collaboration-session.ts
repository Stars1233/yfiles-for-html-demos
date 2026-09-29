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
  type GraphComponent,
  GraphEditorInputMode,
  type IFoldingView,
  type IGraph
} from '@yfiles/yfiles'
import {
  createWebsocketCollaborationClient,
  type WebsocketCollaborationClient,
  type WebsocketCollaborationOptions
} from './core'
import { createYFilesPresence, type YFilesPresence, type YFilesPresenceOptions } from './presence'
import type { YFilesEdgeRecord, YFilesNodeRecord } from './yfiles'
import {
  type CollaborativeLayoutCoordinator,
  type CollaborativeLayoutOptions,
  createCollaborativeLayoutCoordinator,
  createYFilesCollaboration,
  type YFilesCollaboration,
  type YFilesCollaborationOptions
} from './yfiles'

type CollaborationSessionClientOptions =
  | { client: WebsocketCollaborationClient; clientOptions?: never }
  | { client?: never; clientOptions: WebsocketCollaborationOptions }

export type CollaborationSessionInitialization<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = { synced: boolean; graph: IGraph; collaboration: YFilesCollaboration<NodeRecord, EdgeRecord> }

export type CollaborationSessionOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = CollaborationSessionClientOptions &
  Omit<YFilesCollaborationOptions<NodeRecord, EdgeRecord>, 'client' | 'graph' | 'foldingView'> & {
    /** The component whose graph and input mode are used by the collaboration. */
    graphComponent: GraphComponent
    /** Overrides the graph inferred from the component, useful for folding. */
    graph?: IGraph
    /** Overrides the folding view inferred from the component graph. */
    foldingView?: IFoldingView
    /** Overrides the navigation input mode inferred from the component input mode. */
    navigationInputMode?: YFilesPresenceOptions['navigationInputMode']
    /** Presence overrides, or false to disable presence. Enabled by default. */
    presenceOptions?:
      | false
      | Omit<
          YFilesPresenceOptions,
          'component' | 'awareness' | 'nodeById' | 'foldingView' | 'navigationInputMode'
        >
    /** Timeout used while waiting for the provider's initial synchronization. */
    syncTimeoutMilliseconds?: number
    /** Required layout calculation and replay configuration. */
    layoutOptions: CollaborativeLayoutOptions
    /** Runs after sync and before observers start. Return true to publish the graph. */
    initialize?: (
      context: CollaborationSessionInitialization<NodeRecord, EdgeRecord>
    ) => boolean | void
  }

export type CollaborationSession<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  client: WebsocketCollaborationClient
  collaboration: YFilesCollaboration<NodeRecord, EdgeRecord>
  layoutCoordinator: CollaborativeLayoutCoordinator
  presence?: YFilesPresence
  synced: boolean
  start: (options?: { observeGraph?: boolean }) => () => void
  stop: () => void
  dispose: () => void
}

/**
 * Creates and starts the standard yFiles collaboration stack.
 *
 * The returned session owns the client, graph collaboration, and optional
 * presence lifecycle. Application-specific graph seeding and UI remain with
 * the caller through the initialization hook and returned collaboration.
 */
export async function createCollaborationSession<
  NodeRecord extends YFilesNodeRecord = YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord = YFilesEdgeRecord
>(
  options: CollaborationSessionOptions<NodeRecord, EdgeRecord>
): Promise<CollaborationSession<NodeRecord, EdgeRecord>> {
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

  let collaboration: YFilesCollaboration<NodeRecord, EdgeRecord>
  try {
    const synced = await client.whenSynced(syncTimeoutMilliseconds)
    const componentGraph = graphComponent.graph
    const foldingView = suppliedFoldingView ?? componentGraph.foldingView ?? undefined
    const graph = suppliedGraph ?? foldingView?.manager.masterGraph ?? componentGraph
    const navigationInputMode =
      suppliedNavigationInputMode ?? inferNavigationInputMode(graphComponent)
    const inputMode = inferGraphEditorInputMode(graphComponent)
    const afterSynchronize = (): void => {
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

    const start = (startOptions?: { observeGraph?: boolean }): (() => void) => {
      stopSynchronization = collaboration.start(startOptions)
      return stopSynchronization
    }
    const stop = (): void => stopSynchronization()
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

function inferGraphEditorInputMode(graphComponent: GraphComponent): GraphEditorInputMode {
  const inputMode = graphComponent.inputMode
  if (!(inputMode instanceof GraphEditorInputMode)) {
    throw new Error('createCollaborationSession requires a GraphEditorInputMode for layout support')
  }
  return inputMode
}

function inferNavigationInputMode(
  graphComponent: GraphComponent
): YFilesPresenceOptions['navigationInputMode'] {
  const inputMode = graphComponent.inputMode
  if (!inputMode || !('navigationInputMode' in inputMode)) return undefined
  return (inputMode as GraphEditorInputMode).navigationInputMode
}
