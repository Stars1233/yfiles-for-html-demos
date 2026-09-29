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

/**
 * Creates local undo/redo for any set of Yjs shared types.
 *
 * Only transactions using the returned `transact`/`run` methods are tracked;
 * remote transactions remain outside the local history. Direct calls to
 * `doc.transact` or to a record map are therefore not undoable unless they are
 * wrapped by one of these methods. `run` creates a standalone operation,
 * whereas `transact` can participate in a gesture delimited by
 * `beginGesture`/`endGesture`.
 */
export function createLocalHistory(doc, scope, originScope = 'local-history') {
  const localOrigin = { scope: originScope }
  const undoManager = new Y.UndoManager(scope, {
    trackedOrigins: new Set([localOrigin]),
    captureTimeout: 100
  })
  const listeners = new Set()
  let disposed = false
  const notify = () => listeners.forEach((listener) => listener())

  undoManager.on('stack-item-added', notify)
  undoManager.on('stack-item-updated', notify)
  undoManager.on('stack-item-popped', notify)
  undoManager.on('stack-cleared', notify)

  const stopCapturing = () => undoManager.stopCapturing()
  const clear = () => {
    stopCapturing()
    undoManager.clear()
    notify()
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    undoManager.off('stack-item-added', notify)
    undoManager.off('stack-item-updated', notify)
    undoManager.off('stack-item-popped', notify)
    undoManager.off('stack-cleared', notify)
    listeners.clear()
    undoManager.destroy()
  }
  const transact = (action) => doc.transact(action, localOrigin)

  return {
    undoManager,
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    transact,
    run: (action) => {
      stopCapturing()
      transact(action)
      stopCapturing()
      notify()
    },
    beginGesture: stopCapturing,
    endGesture: () => {
      stopCapturing()
      notify()
    },
    undo: () => {
      stopCapturing()
      undoManager.undo()
      stopCapturing()
      notify()
    },
    redo: () => {
      stopCapturing()
      undoManager.redo()
      stopCapturing()
      notify()
    },
    clear,
    dispose,
    subscribe: (listener) => {
      listeners.add(listener)
      listener()
      return () => listeners.delete(listener)
    }
  }
}
