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
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

/**
 * Creates the Yjs objects needed by a browser collaboration client.
 *
 * The application decides which shared types to create from the returned
 * document. This keeps the transport and room setup independent of the
 * application's data model. The provider starts connecting immediately unless
 * `connect` is set to `false`; call `whenSynced` before treating the document
 * as an authoritative view of the room.
 *
 * `whenSynced` is a bounded readiness check. A `false` result means that the
 * timeout elapsed, not that the room is empty or that synchronization failed
 * permanently. Calling `dispose` destroys the provider and only destroys the
 * Yjs document when this function created it.
 */
export function createWebsocketCollaborationClient(options) {
  const doc = options.doc ?? new Y.Doc()
  const ownsDoc = !options.doc
  const provider = new WebsocketProvider(options.serverUrl, options.roomName, doc, {
    connect: options.connect
  })
  const whenSynced = (timeoutMilliseconds = 3000) => {
    if (provider.synced) return Promise.resolve(true)
    return new Promise((resolve) => {
      let settled = false
      const finish = (synced) => {
        if (settled) return
        settled = true
        provider.off('sync', onSync)
        globalThis.clearTimeout(timeout)
        resolve(synced)
      }
      const onSync = (synced) => {
        if (synced) finish(true)
      }
      const timeout = globalThis.setTimeout(() => finish(false), timeoutMilliseconds)
      provider.on('sync', onSync)
    })
  }

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    provider.destroy()
    if (ownsDoc) doc.destroy()
  }

  return { doc, provider, awareness: provider.awareness, whenSynced, dispose }
}
