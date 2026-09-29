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

export type LocalHistory = {
  /** The underlying Yjs undo manager, exposed for advanced configuration. */
  undoManager: Y.UndoManager
  /** Whether at least one local operation can currently be undone. */
  canUndo: () => boolean
  /** Whether an undone local operation can currently be redone. */
  canRedo: () => boolean
  /** Runs an edit in the local-history origin, preserving the current gesture. */
  transact: (action: () => void) => void
  /** Runs one edit as a separate undoable operation. */
  run: (action: () => void) => void
  /** Stops capture so later edits start a new undo item. */
  beginGesture: () => void
  /** Stops capture and notifies history subscribers after a gesture ends. */
  endGesture: () => void
  /** Undoes the most recent local operation if one exists. */
  undo: () => void
  /** Redoes the most recently undone local operation if one exists. */
  redo: () => void
  /** Removes all undo and redo items and starts a new history boundary. */
  clear: () => void
  /** Removes listeners and destroys the underlying undo manager. */
  dispose: () => void
  /** Subscribes to history state changes and invokes the listener immediately. */
  subscribe: (listener: () => void) => () => void
}

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
export function createLocalHistory(
  doc: Y.Doc,
  scope: ConstructorParameters<typeof Y.UndoManager>[0],
  originScope = 'local-history'
): LocalHistory {
  const localOrigin = { scope: originScope }
  const undoManager = new Y.UndoManager(scope, {
    trackedOrigins: new Set([localOrigin]),
    captureTimeout: 100
  })
  const listeners = new Set<() => void>()
  let disposed = false
  const notify = (): void => listeners.forEach((listener) => listener())

  undoManager.on('stack-item-added', notify)
  undoManager.on('stack-item-updated', notify)
  undoManager.on('stack-item-popped', notify)
  undoManager.on('stack-cleared', notify)

  const stopCapturing = (): void => undoManager.stopCapturing()
  const clear = (): void => {
    stopCapturing()
    undoManager.clear()
    notify()
  }
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    undoManager.off('stack-item-added', notify)
    undoManager.off('stack-item-updated', notify)
    undoManager.off('stack-item-popped', notify)
    undoManager.off('stack-cleared', notify)
    listeners.clear()
    undoManager.destroy()
  }
  const transact = (action: () => void): void => doc.transact(action, localOrigin)

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
