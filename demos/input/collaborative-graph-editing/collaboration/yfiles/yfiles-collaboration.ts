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
import {
  createSharedGraphRecords,
  type SharedGraphRecords,
  type SharedGraphRecordsOptions
} from '../records'
import { createYFilesSynchronizer } from './yfiles-sync'
import type { YFilesEdgeRecord, YFilesNodeRecord } from './yfiles-record-types'
import type { YFilesSynchronizer, YFilesSynchronizerOptions } from './yfiles-sync-types'
import type { LocalHistory, WebsocketCollaborationClient } from '../core'

export type YFilesCollaborationOptions<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = Omit<
  YFilesSynchronizerOptions<NodeRecord, EdgeRecord>,
  'graph' | 'records' | 'nodeRecords' | 'edgeRecords' | 'nodeById' | 'edgeById'
> & {
  client: WebsocketCollaborationClient
  graph: IGraph
  foldingView?: IFoldingView
  records?: SharedGraphRecordsOptions
}

export type YFilesCollaboration<
  NodeRecord extends YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord
> = {
  client: WebsocketCollaborationClient
  records: SharedGraphRecords<NodeRecord, EdgeRecord>
  history: LocalHistory
  synchronizer: YFilesSynchronizer
  nodeById: Map<string, INode>
  edgeById: Map<string, IEdge>
  start: (options?: { observeGraph?: boolean }) => () => void
  dispose: () => void
}

/**
 * Creates the complete yFiles collaboration session for a websocket client.
 *
 * This owns the shared records, identity maps, synchronizer, local history,
 * and client lifecycle. Consumers that need independent lifecycles can use
 * the lower-level factories directly. `dispose` stops synchronization,
 * destroys local history, and disposes the supplied client; callers should not
 * reuse that client after disposing the session.
 */
export function createYFilesCollaboration<
  NodeRecord extends YFilesNodeRecord = YFilesNodeRecord,
  EdgeRecord extends YFilesEdgeRecord = YFilesEdgeRecord
>(
  options: YFilesCollaborationOptions<NodeRecord, EdgeRecord>
): YFilesCollaboration<NodeRecord, EdgeRecord> {
  const { client, graph, records: recordOptions, ...synchronizerOptions } = options
  const records = createSharedGraphRecords<NodeRecord, EdgeRecord>(client.doc, recordOptions)
  const synchronizer = createYFilesSynchronizer({ ...synchronizerOptions, graph, records })

  let disposed = false
  return {
    client,
    records,
    history: records.history,
    synchronizer,
    nodeById: synchronizer.nodeById,
    edgeById: synchronizer.edgeById,
    start: (startOptions) => synchronizer.start(startOptions),
    dispose: () => {
      if (disposed) return
      disposed = true
      synchronizer.dispose()
      records.history.dispose()
      client.dispose()
    }
  }
}
